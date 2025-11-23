import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);
const router = express.Router();

router.use(authenticateToken);

// Exportar datos en formato JSON
router.get('/export/json', async (req, res) => {
  try {
    const tablas = [
      'alumno',
      'categorias',
      'evaluacion',
      'representante',
      'usuario',
      'configuracion',
      'config_pagos',
      'config_notificaciones',
      'horarios_clases',
      'dias_festivos',
      'plantillas_documentos',
      'documentos_requeridos'
    ];

    const backup = {
      fecha_backup: new Date().toISOString(),
      sistema: 'Sistema Dojo',
      version: '1.0.0',
      datos: {}
    };

    for (const tabla of tablas) {
      try {
        const { data, error } = await supabase.from(tabla).select('*');
        if (error) {
          console.error(`Error exportando tabla ${tabla}:`, error);
          backup.datos[tabla] = [];
        } else {
          backup.datos[tabla] = data || [];
        }
      } catch (error) {
        console.error(`Error exportando tabla ${tabla}:`, error);
        backup.datos[tabla] = [];
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_dojo_${Date.now()}.json`);
    res.json(backup);
  } catch (error) {
    console.error('Error exportando datos:', error);
    res.status(500).json({ error: 'Error exportando datos' });
  }
});

// Exportar datos en formato SQL (para phpMyAdmin)
router.get('/export/sql', async (req, res) => {
  try {
    const tablas = [
      'alumno',
      'categorias', 
      'evaluacion',
      'representante',
      'usuario',
      'configuracion',
      'config_pagos',
      'horarios_clases',
      'dias_festivos'
    ];

    let sqlContent = `-- Backup SQL del Sistema Dojo
-- Fecha: ${new Date().toISOString()}
-- Sistema: Sistema Dojo v1.0.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

`;

    // Nota: En Supabase no podemos obtener la estructura de la tabla directamente
    // Solo exportamos los datos
    for (const tabla of tablas) {
      try {
        const { data: datos, error } = await supabase.from(tabla).select('*');
        if (error) {
          console.error(`Error exportando tabla ${tabla}:`, error);
          sqlContent += `-- Error exportando tabla ${tabla}: ${error.message}\n\n`;
          continue;
        }
        
        if (datos && datos.length > 0) {
          sqlContent += `-- Datos de tabla ${tabla}\n`;
          
          // Obtener nombres de columnas
          const columnas = Object.keys(datos[0]);
          const columnasStr = columnas.map(col => `\`${col}\``).join(', ');
          
          // Generar INSERT statements
          for (const fila of datos) {
            const valores = columnas.map(col => {
              const valor = fila[col];
              if (valor === null) return 'NULL';
              if (typeof valor === 'string') return `'${valor.replace(/'/g, "''")}'`;
              if (valor instanceof Date) return `'${valor.toISOString()}'`;
              return valor;
            });
            sqlContent += `INSERT INTO \`${tabla}\` (${columnasStr}) VALUES (${valores.join(', ')});\n`;
          }
          sqlContent += '\n';
        }
      } catch (error) {
        console.error(`Error exportando tabla ${tabla}:`, error);
        sqlContent += `-- Error exportando tabla ${tabla}: ${error.message}\n\n`;
      }
    }

    sqlContent += `COMMIT;`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename=backup_dojo_${Date.now()}.sql`);
    res.send(sqlContent);
  } catch (error) {
    console.error('Error exportando SQL:', error);
    res.status(500).json({ error: 'Error exportando SQL' });
  }
});

// Importar/restaurar datos desde JSON
router.post('/import/json', async (req, res) => {
  try {
    const { datos } = req.body;
    
    if (!datos) {
      return res.status(400).json({ error: 'No se proporcionaron datos para importar' });
    }

    const tablas = Object.keys(datos);
    let importados = 0;
    let errores = [];

    for (const tabla of tablas) {
      try {
        const registros = datos[tabla];
        if (Array.isArray(registros) && registros.length > 0) {
          // Limpiar tabla existente (obtener todos los IDs y eliminarlos)
          const { data: existingRecords, error: selectError } = await supabase
            .from(tabla)
            .select('id')
            .limit(10000); // Límite razonable
          
          if (!selectError && existingRecords && existingRecords.length > 0) {
            // Eliminar en lotes
            const ids = existingRecords.map(r => r.id);
            const batchSize = 100;
            for (let i = 0; i < ids.length; i += batchSize) {
              const batch = ids.slice(i, i + batchSize);
              const { error: deleteError } = await supabase
                .from(tabla)
                .delete()
                .in('id', batch);
              
              if (deleteError) {
                console.error(`Error limpiando lote de tabla ${tabla}:`, deleteError);
              }
            }
          }
          
          // Insertar nuevos datos en lotes
          const batchSize = 100;
          for (let i = 0; i < registros.length; i += batchSize) {
            const batch = registros.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from(tabla)
              .insert(batch);
            
            if (insertError) {
              console.error(`Error insertando lote en tabla ${tabla}:`, insertError);
              errores.push({ tabla, error: insertError.message });
            } else {
              importados += batch.length;
            }
          }
        }
      } catch (error) {
        console.error(`Error importando tabla ${tabla}:`, error);
        errores.push({ tabla, error: error.message });
      }
    }

    res.json({ 
      message: 'Importación completada',
      registros_importados: importados,
      errores: errores
    });
  } catch (error) {
    console.error('Error importando datos:', error);
    res.status(500).json({ error: 'Error importando datos' });
  }
});

// Obtener estadísticas del sistema
router.get('/stats', async (req, res) => {
  try {
    const stats = {};

    // Total de alumnos
    const { count: totalAlumnos, error: alumnosError } = await supabase
      .from('alumno')
      .select('*', { count: 'exact', head: true });
    
    if (alumnosError) {
      console.error('Error contando alumnos:', alumnosError);
      stats.total_alumnos = 0;
    } else {
      stats.total_alumnos = totalAlumnos || 0;
    }

    // Total de evaluaciones
    const { count: totalEvaluaciones, error: evaluacionesError } = await supabase
      .from('evaluacion')
      .select('*', { count: 'exact', head: true });
    
    if (evaluacionesError) {
      console.error('Error contando evaluaciones:', evaluacionesError);
      stats.total_evaluaciones = 0;
    } else {
      stats.total_evaluaciones = totalEvaluaciones || 0;
    }

    // Total de usuarios
    const { count: totalUsuarios, error: usuariosError } = await supabase
      .from('usuario')
      .select('*', { count: 'exact', head: true });
    
    if (usuariosError) {
      console.error('Error contando usuarios:', usuariosError);
      stats.total_usuarios = 0;
    } else {
      stats.total_usuarios = totalUsuarios || 0;
    }

    // Total de logs
    const { count: totalLogs, error: logsError } = await supabase
      .from('log_actividades')
      .select('*', { count: 'exact', head: true });
    
    if (logsError) {
      console.error('Error contando logs:', logsError);
      stats.total_logs = 0;
    } else {
      stats.total_logs = totalLogs || 0;
    }

    // Tamaño de tablas - En Supabase no tenemos acceso directo a information_schema
    // Retornamos un array vacío o podemos hacer consultas aproximadas
    stats.tablas = [];

    // Último backup (si se guarda en configuración)
    const { data: ultimoBackup, error: backupError } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'ultimo_backup')
      .single();

    if (backupError && backupError.code !== 'PGRST116') {
      console.error('Error obteniendo último backup:', backupError);
      stats.ultimo_backup = 'Nunca';
    } else {
      stats.ultimo_backup = ultimoBackup?.valor || 'Nunca';
    }

    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas', details: error.message });
  }
});

// Limpiar logs antiguos
router.delete('/logs/limpiar', async (req, res) => {
  try {
    const { dias = 90 } = req.query;
    
    // Calcular fecha límite
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias));

    const { data, error } = await supabase
      .from('log_actividades')
      .delete()
      .lt('created_at', fechaLimite.toISOString())
      .select();

    if (error) {
      console.error('Error limpiando logs:', error);
      return res.status(500).json({ error: 'Error limpiando logs' });
    }

    res.json({ 
      message: `Logs antiguos eliminados exitosamente`, 
      eliminados: data?.length || 0 
    });
  } catch (error) {
    console.error('Error limpiando logs:', error);
    res.status(500).json({ error: 'Error limpiando logs' });
  }
});

// Verificar integridad de datos
router.get('/verificar-integridad', async (req, res) => {
  try {
    const problemas = [];

    // Obtener todas las categorías de edad válidas
    const { data: categorias, error: catError } = await supabase
      .from('categorias_edad')
      .select('id');
    
    if (catError) {
      console.error('Error obteniendo categorías:', catError);
    } else {
      const categoriaIds = categorias?.map(c => c.id) || [];
      
      // Verificar alumnos sin categoría de edad válida
      const { data: alumnos, error: alumnosError } = await supabase
        .from('alumno')
        .select('id, id_categoria_edad');
      
      if (!alumnosError && alumnos) {
        const alumnosSinCategoria = alumnos.filter(a => 
          !a.id_categoria_edad || !categoriaIds.includes(a.id_categoria_edad)
        );
        
        if (alumnosSinCategoria.length > 0) {
          problemas.push({
            tipo: 'advertencia',
            mensaje: `${alumnosSinCategoria.length} alumno(s) sin categoría de edad válida asignada`
          });
        }
      }

      // Verificar horarios sin categoría de edad válida
      const { data: horarios, error: horariosError } = await supabase
        .from('horarios_clases')
        .select('id, id_categoria_edad');
      
      if (!horariosError && horarios) {
        const horariosSinCategoria = horarios.filter(h => 
          h.id_categoria_edad && !categoriaIds.includes(h.id_categoria_edad)
        );
        
        if (horariosSinCategoria.length > 0) {
          problemas.push({
            tipo: 'error',
            mensaje: `${horariosSinCategoria.length} horario(s) con categoría de edad inválida`
          });
        }
      }
    }

    res.json({
      estado: problemas.length === 0 ? 'correcto' : 'problemas_encontrados',
      total_problemas: problemas.length,
      problemas
    });
  } catch (error) {
    console.error('Error verificando integridad:', error);
    res.status(500).json({ error: 'Error verificando integridad' });
  }
});

// Registrar fecha de último backup
router.post('/registrar-backup', async (req, res) => {
  try {
    const fechaBackup = new Date().toISOString();
    
    // Intentar actualizar primero
    const { data: existing, error: selectError } = await supabase
      .from('configuracion')
      .select('id')
      .eq('clave', 'ultimo_backup')
      .single();
    
    if (existing) {
      // Actualizar
      const { error: updateError } = await supabase
        .from('configuracion')
        .update({ valor: fechaBackup })
        .eq('clave', 'ultimo_backup');
      
      if (updateError) {
        throw updateError;
      }
    } else {
      // Insertar
      const { error: insertError } = await supabase
        .from('configuracion')
        .insert({
          clave: 'ultimo_backup',
          valor: fechaBackup,
          descripcion: 'Fecha del último backup'
        });
      
      if (insertError) {
        throw insertError;
      }
    }

    res.json({ message: 'Backup registrado exitosamente' });
  } catch (error) {
    console.error('Error registrando backup:', error);
    res.status(500).json({ error: 'Error registrando backup' });
  }
});

export default router;

