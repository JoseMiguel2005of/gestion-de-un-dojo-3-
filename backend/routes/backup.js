import express from 'express';
import { executeQuery } from '../config/database.js';
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
        const datos = await executeQuery(`SELECT * FROM ${tabla}`);
        backup.datos[tabla] = datos;
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

    for (const tabla of tablas) {
      try {
        // Obtener estructura de la tabla
        const estructura = await executeQuery(`SHOW CREATE TABLE ${tabla}`);
        if (estructura.length > 0) {
          sqlContent += `-- Estructura de tabla ${tabla}
DROP TABLE IF EXISTS \`${tabla}\`;
${estructura[0]['Create Table']};

`;

          // Obtener datos de la tabla
          const datos = await executeQuery(`SELECT * FROM ${tabla}`);
          if (datos.length > 0) {
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
                return valor;
              });
              sqlContent += `INSERT INTO \`${tabla}\` (${columnasStr}) VALUES (${valores.join(', ')});\n`;
            }
            sqlContent += '\n';
          }
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
          // Limpiar tabla existente
          await executeQuery(`DELETE FROM ${tabla}`);
          
          // Insertar nuevos datos
          for (const registro of registros) {
            const columnas = Object.keys(registro);
            const valores = Object.values(registro);
            const placeholders = columnas.map(() => '?').join(', ');
            
            await executeQuery(
              `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${placeholders})`,
              valores
            );
          }
          importados += registros.length;
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
    const alumnos = await executeQuery('SELECT COUNT(*) as total FROM alumno');
    stats.total_alumnos = alumnos[0].total;

    // Total de evaluaciones
    const evaluaciones = await executeQuery('SELECT COUNT(*) as total FROM evaluacion');
    stats.total_evaluaciones = evaluaciones[0].total;

    // Total de usuarios
    const usuarios = await executeQuery('SELECT COUNT(*) as total FROM usuario');
    stats.total_usuarios = usuarios[0].total;

    // Total de logs - Tabla eliminada
    stats.total_logs = 0;

    // Tamaño de tablas (aproximado)
    const tablas = await executeQuery(`
      SELECT 
        table_name as nombre_tabla,
        table_rows as filas,
        ROUND((data_length + index_length) / 1024 / 1024, 2) as tamano_mb
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC
    `);
    stats.tablas = tablas;

    // Último backup (si se guarda en configuración)
    const ultimoBackup = await executeQuery(
      "SELECT valor FROM configuracion WHERE clave = 'ultimo_backup'"
    );
    stats.ultimo_backup = ultimoBackup[0]?.valor || 'Nunca';

    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Limpiar logs antiguos
router.delete('/logs/limpiar', async (req, res) => {
  try {
    const { dias = 90 } = req.query;

    const result = await executeQuery(
      'DELETE FROM log_actividades WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [dias]
    );

    res.json({ 
      message: `Logs antiguos eliminados exitosamente`, 
      eliminados: result.affectedRows 
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

    // Verificar alumnos sin categoría de edad
    const alumnosSinCategoria = await executeQuery(
      'SELECT COUNT(*) as total FROM alumno WHERE id_categoria_edad IS NULL OR id_categoria_edad NOT IN (SELECT id FROM categorias_edad)'
    );
    if (alumnosSinCategoria[0].total > 0) {
      problemas.push({
        tipo: 'advertencia',
        mensaje: `${alumnosSinCategoria[0].total} alumno(s) sin categoría de edad válida asignada`
      });
    }

    // Verificar horarios sin categoría de edad
    const horariosSinCategoria = await executeQuery(
      'SELECT COUNT(*) as total FROM horarios_clases WHERE id_categoria_edad IS NOT NULL AND id_categoria_edad NOT IN (SELECT id FROM categorias_edad)'
    );
    if (horariosSinCategoria[0].total > 0) {
      problemas.push({
        tipo: 'error',
        mensaje: `${horariosSinCategoria[0].total} horario(s) con categoría de edad inválida`
      });
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
    await executeQuery(
      "INSERT INTO configuracion (clave, valor, descripcion) VALUES ('ultimo_backup', NOW(), 'Fecha del último backup') ON DUPLICATE KEY UPDATE valor = NOW()"
    );

    res.json({ message: 'Backup registrado exitosamente' });
  } catch (error) {
    console.error('Error registrando backup:', error);
    res.status(500).json({ error: 'Error registrando backup' });
  }
});

export default router;

