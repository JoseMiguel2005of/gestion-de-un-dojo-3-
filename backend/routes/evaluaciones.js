import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { registrarLog, LogActions, LogModules } from '../utils/logger.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener todas las evaluaciones
router.get('/', async (req, res) => {
  try {
    // Verificar si el usuario es un usuario normal (solo debe ver sus evaluaciones)
    const userRole = req.user?.rol || 'usuario';
    const userId = req.user?.id;
    
    if (userRole === 'usuario' && userId) {
      // Usuarios normales ven evaluaciones donde están inscritos como alumnos
      const evaluaciones = await executeQuery(`
        SELECT DISTINCT e.*, 
               GROUP_CONCAT(DISTINCT CONCAT(ce.nombre, ' - ', cin.nombre) SEPARATOR ', ') as niveles,
               CASE 
                 WHEN e.nombre LIKE '%Blanco → Amarillo%' THEN 'Blanco → Amarillo'
                 WHEN e.nombre LIKE '%Amarillo → Naranja%' THEN 'Amarillo → Naranja'
                 WHEN e.nombre LIKE '%Naranja → Verde%' THEN 'Naranja → Verde'
                 WHEN e.nombre LIKE '%Verde → Azul%' THEN 'Verde → Azul'
                 WHEN e.nombre LIKE '%Azul → Marrón%' THEN 'Azul → Marrón'
                 WHEN e.nombre LIKE '%Marrón → Negro%' THEN 'Marrón → Negro'
                 WHEN e.nombre LIKE '%Dan Avanzado%' THEN 'Negro → Dan Avanzado'
                 WHEN e.nombre LIKE '%Blanco%' THEN 'Blanco → Amarillo'
                 WHEN e.nombre LIKE '%Amarillo%' THEN 'Amarillo → Naranja'
                 WHEN e.nombre LIKE '%Naranja%' THEN 'Naranja → Verde'
                 WHEN e.nombre LIKE '%Verde%' THEN 'Verde → Azul'
                 WHEN e.nombre LIKE '%Azul%' THEN 'Azul → Marrón'
                 WHEN e.nombre LIKE '%Marrón%' THEN 'Marrón → Negro'
                 WHEN e.nombre LIKE '%Negro%' THEN 'Negro → Dan Avanzado'
                 ELSE e.nombre
               END as categoria_examen
        FROM evaluacion e
        INNER JOIN alumnoevaluacion ae ON e.id = ae.id_evaluacion
        INNER JOIN alumno a ON ae.id_alumno = a.id
        LEFT JOIN categorias_edad ce ON a.id_categoria_edad = ce.id
        LEFT JOIN cintas cin ON a.id_cinta = cin.id
        WHERE a.usuario_id = ? AND a.estado = 1
        GROUP BY e.id
        ORDER BY e.fecha DESC
      `, [userId]);
      
      res.json(evaluaciones);
    } else {
      // Admin, instructor, etc. pueden ver todas las evaluaciones
      const evaluaciones = await executeQuery(`
        SELECT e.*, 
               GROUP_CONCAT(DISTINCT CONCAT(ce.nombre, ' - ', cin.nombre) SEPARATOR ', ') as niveles,
               CASE 
                 WHEN e.nombre LIKE '%Blanco → Amarillo%' THEN 'Blanco → Amarillo'
                 WHEN e.nombre LIKE '%Amarillo → Naranja%' THEN 'Amarillo → Naranja'
                 WHEN e.nombre LIKE '%Naranja → Verde%' THEN 'Naranja → Verde'
                 WHEN e.nombre LIKE '%Verde → Azul%' THEN 'Verde → Azul'
                 WHEN e.nombre LIKE '%Azul → Marrón%' THEN 'Azul → Marrón'
                 WHEN e.nombre LIKE '%Marrón → Negro%' THEN 'Marrón → Negro'
                 WHEN e.nombre LIKE '%Dan Avanzado%' THEN 'Negro → Dan Avanzado'
                 WHEN e.nombre LIKE '%Blanco%' THEN 'Blanco → Amarillo'
                 WHEN e.nombre LIKE '%Amarillo%' THEN 'Amarillo → Naranja'
                 WHEN e.nombre LIKE '%Naranja%' THEN 'Naranja → Verde'
                 WHEN e.nombre LIKE '%Verde%' THEN 'Verde → Azul'
                 WHEN e.nombre LIKE '%Azul%' THEN 'Azul → Marrón'
                 WHEN e.nombre LIKE '%Marrón%' THEN 'Marrón → Negro'
                 WHEN e.nombre LIKE '%Negro%' THEN 'Negro → Dan Avanzado'
                 ELSE e.nombre
               END as categoria_examen
        FROM evaluacion e
        LEFT JOIN alumnoevaluacion ae ON e.id = ae.id_evaluacion
        LEFT JOIN alumno a ON ae.id_alumno = a.id
        LEFT JOIN categorias_edad ce ON a.id_categoria_edad = ce.id
        LEFT JOIN cintas cin ON a.id_cinta = cin.id
        GROUP BY e.id
        ORDER BY e.fecha DESC
      `);
      res.json(evaluaciones);
    }
  } catch (error) {
    console.error('Error obteniendo evaluaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener una evaluación por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const evaluaciones = await executeQuery(
      'SELECT * FROM evaluacion WHERE id = ?',
      [id]
    );

    if (evaluaciones.length === 0) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    res.json(evaluaciones[0]);
  } catch (error) {
    console.error('Error obteniendo evaluación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva evaluación
router.post('/', [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('fecha').notEmpty().withMessage('Fecha es requerida'),
  body('hora').notEmpty().withMessage('Hora es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, fecha, hora, descripcion, instructor_id, alumnos_ids } = req.body;

    // Crear la evaluación
    let result;
    try {
      result = await executeQuery(
        'INSERT INTO evaluacion (nombre, fecha, hora, descripcion) VALUES (?, ?, ?, ?)',
        [nombre, fecha, hora, descripcion]
      );
    } catch (error) {
      // Si falla, intentar sin la columna hora
      console.log('Insertando sin columna hora...', error.message);
      result = await executeQuery(
        'INSERT INTO evaluacion (nombre, fecha, descripcion) VALUES (?, ?, ?)',
        [nombre, fecha, descripcion]
      );
    }

    const evaluacionId = result.insertId;

    // Función para extraer la cinta de origen del nombre del examen
    const extraerCintaOrigen = (nombreExamen) => {
      const mapeo = {
        'Blanco → Amarillo': 'Blanco',
        'White → Yellow': 'Blanco',
        'Amarillo → Naranja': 'Amarillo',
        'Yellow → Orange': 'Amarillo',
        'Naranja → Verde': 'Naranja',
        'Orange → Green': 'Naranja',
        'Verde → Azul': 'Verde',
        'Green → Blue': 'Verde',
        'Azul → Marrón': 'Azul',
        'Blue → Brown': 'Azul',
        'Marrón → Negro': 'Marrón',
        'Brown → Black': 'Marrón',
        'Dan Avanzado': 'Negro',
        'Advanced Dan': 'Negro'
      };
      
      for (const [patron, cinta] of Object.entries(mapeo)) {
        if (nombreExamen.includes(patron)) {
          return cinta.toLowerCase();
        }
      }
      return null;
    };

    // Agregar alumnos a la evaluación si se proporcionan
    if (alumnos_ids && alumnos_ids.length > 0) {
      const cintaRequerida = extraerCintaOrigen(nombre);
      let alumnosInvalidos = [];
      
      for (const alumnoId of alumnos_ids) {
        try {
          // Validar que el alumno tenga la cinta correcta
          if (cintaRequerida) {
            const alumnoData = await executeQuery(
              'SELECT a.nombre, c.nombre as cinta_nombre FROM alumno a LEFT JOIN cintas c ON a.id_cinta = c.id WHERE a.id = ?',
              [alumnoId]
            );
            
            if (alumnoData.length > 0) {
              const cintaAlumno = alumnoData[0].cinta_nombre?.toLowerCase() || '';
              const alumnoNombre = alumnoData[0].nombre;
              
              // Validar coincidencia exacta de cinta (incluyendo variantes de género)
              const cintasValidas = {
                'blanco': ['blanco', 'blanca'],
                'amarillo': ['amarillo', 'amarilla'],
                'naranja': ['naranja'],
                'verde': ['verde'],
                'azul': ['azul'],
                'marrón': ['marrón', 'marron'],
                'negro': ['negro', 'negra']
              };
              
              const esValida = cintasValidas[cintaRequerida]?.includes(cintaAlumno) || false;
              
              if (!esValida) {
                alumnosInvalidos.push(`${alumnoNombre} (tiene cinta ${alumnoData[0].cinta_nombre}, requiere ${cintaRequerida})`);
                continue; // Saltar este alumno
              }
            }
          }
          
          await executeQuery(
            'INSERT INTO alumnoevaluacion (id_alumno, id_evaluacion) VALUES (?, ?)',
            [alumnoId, evaluacionId]
          );
        } catch (error) {
          console.log(`Error agregando alumno ${alumnoId} a evaluación ${evaluacionId}:`, error.message);
        }
      }
      
      // Si hay alumnos inválidos, advertir pero no fallar
      if (alumnosInvalidos.length > 0) {
        console.warn(`Alumnos no agregados por cinta incorrecta: ${alumnosInvalidos.join(', ')}`);
      }
    }

    // Registrar log de la creación
    await registrarLog({
      usuario_id: req.user.id,
      accion: LogActions.CREAR,
      modulo: LogModules.EVALUACIONES,
      descripcion: `Evaluación creada: ${nombre} - Fecha: ${fecha}, Hora: ${hora}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });

    res.status(201).json({ 
      id: evaluacionId, 
      message: 'Evaluación creada exitosamente' 
    });
  } catch (error) {
    console.error('Error creando evaluación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar evaluación
router.put('/:id', [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('fecha').notEmpty().withMessage('Fecha es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nombre, fecha, descripcion } = req.body;

    await executeQuery(
      'UPDATE evaluacion SET nombre = ?, fecha = ?, descripcion = ? WHERE id = ?',
      [nombre, fecha, descripcion, id]
    );

    res.json({ message: 'Evaluación actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando evaluación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar evaluación
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay resultados de evaluación asociados
    const resultados = await executeQuery(
      'SELECT COUNT(*) as count FROM alumnoevaluacion WHERE id_evaluacion = ?',
      [id]
    );

    if (resultados[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la evaluación porque tiene resultados asociados' 
      });
    }

    await executeQuery(
      'DELETE FROM evaluacion WHERE id = ?',
      [id]
    );

    // Registrar log de la eliminación
    await registrarLog({
      usuario_id: req.user.id,
      accion: LogActions.ELIMINAR,
      modulo: LogModules.EVALUACIONES,
      descripcion: `Evaluación eliminada - ID: ${id}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });

    res.json({ message: 'Evaluación eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando evaluación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener resultados de evaluación
router.get('/:id/resultados', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero obtener la fecha de la evaluación
    const evaluacion = await executeQuery(
      'SELECT fecha FROM evaluacion WHERE id = ?',
      [id]
    );
    
    if (evaluacion.length === 0) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }
    
    const fechaEvaluacion = evaluacion[0].fecha;
    
    const resultados = await executeQuery(`
      SELECT 
        ae.id,
        ae.notas,
        a.nombre as alumno_nombre,
        a.cedula as alumno_cedula,
        a.proximo_examen_fecha,
        a.tiempo_preparacion_meses
      FROM alumnoevaluacion ae
      INNER JOIN alumno a ON ae.id_alumno = a.id
      WHERE ae.id_evaluacion = ?
        AND a.estado = 1
        AND (a.proximo_examen_fecha IS NULL OR a.proximo_examen_fecha <= ?)
    `, [id, fechaEvaluacion]);

    res.json(resultados);
  } catch (error) {
    console.error('Error obteniendo resultados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear resultado de evaluación
router.post('/:id/resultados', [
  body('id_alumno').notEmpty().withMessage('ID del alumno es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { id_alumno, notas } = req.body;

    const result = await executeQuery(
      'INSERT INTO alumnoevaluacion (id_alumno, id_evaluacion, notas) VALUES (?, ?, ?)',
      [id_alumno, id, notas]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Resultado de evaluación creado exitosamente' 
    });
  } catch (error) {
    console.error('Error creando resultado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Generar resultados aleatorios para evaluaciones
router.post('/generar-resultados-aleatorios', async (req, res) => {
  try {
    // Obtener todas las evaluaciones
    const evaluaciones = await executeQuery(
      'SELECT id, fecha FROM evaluacion ORDER BY fecha DESC'
    );
    
    // Obtener todos los alumnos activos
    const alumnos = await executeQuery(
      'SELECT id, nombre, proximo_examen_fecha FROM alumno WHERE estado = 1'
    );
    
    let resultadosGenerados = 0;
    
    for (const evaluacion of evaluaciones) {
      const fechaEvaluacion = new Date(evaluacion.fecha);
      
      // Filtrar alumnos que pueden presentar esta evaluación
      const alumnosElegibles = alumnos.filter(alumno => {
        if (!alumno.proximo_examen_fecha) return true;
        const fechaProximoExamen = new Date(alumno.proximo_examen_fecha);
        return fechaProximoExamen <= fechaEvaluacion;
      });
      
      // Generar resultados aleatorios para algunos alumnos elegibles
      for (const alumno of alumnosElegibles) {
        if (Math.random() < 0.7) {
          const comentarios = Math.random() < 0.8 
            ? 'Excelente rendimiento en el examen. Demostró dominio de las técnicas requeridas.'
            : 'Necesita más práctica en las técnicas básicas. Recomendamos clases adicionales.';
          
          try {
            await executeQuery(
              'INSERT INTO alumnoevaluacion (id_alumno, id_evaluacion, notas) VALUES (?, ?, ?)',
              [alumno.id, evaluacion.id, comentarios]
            );
            resultadosGenerados++;
          } catch (error) {
            // Si ya existe, no hacer nada
            console.log(`Resultado ya existe para alumno ${alumno.id} en evaluación ${evaluacion.id}`);
          }
        }
      }
    }
    
    res.json({ 
      message: `Se generaron ${resultadosGenerados} resultados aleatorios`,
      resultadosGenerados 
    });
  } catch (error) {
    console.error('Error generando resultados aleatorios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de debug para verificar datos
router.get('/debug/usuario/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 1. Verificar si el usuario existe
    const usuario = await executeQuery(
      'SELECT id, username, nombre_completo, rol FROM usuario WHERE id = ?',
      [userId]
    );
    
    // 2. Verificar si tiene registro de alumno
    const alumno = await executeQuery(
      'SELECT id, nombre, usuario_id, estado, id_categoria_edad, id_cinta FROM alumno WHERE usuario_id = ?',
      [userId]
    );
    
    // 3. Verificar evaluaciones donde está inscrito
    const evaluacionesInscrito = await executeQuery(`
      SELECT e.id, e.nombre, e.fecha, ae.id as alumnoevaluacion_id
      FROM evaluacion e
      INNER JOIN alumnoevaluacion ae ON e.id = ae.id_evaluacion
      INNER JOIN alumno a ON ae.id_alumno = a.id
      WHERE a.usuario_id = ?
    `, [userId]);
    
    // 4. Verificar todas las evaluaciones
    const todasEvaluaciones = await executeQuery(
      'SELECT id, nombre, fecha FROM evaluacion ORDER BY fecha DESC'
    );
    
    // 5. Verificar todos los registros de alumnoevaluacion
    const todosAlumnoEvaluaciones = await executeQuery(`
      SELECT ae.id, ae.id_alumno, ae.id_evaluacion, a.nombre as alumno_nombre, e.nombre as evaluacion_nombre
      FROM alumnoevaluacion ae
      INNER JOIN alumno a ON ae.id_alumno = a.id
      INNER JOIN evaluacion e ON ae.id_evaluacion = e.id
    `);
    
    res.json({
      usuario: usuario[0] || null,
      alumno: alumno[0] || null,
      evaluacionesInscrito,
      todasEvaluaciones,
      todosAlumnoEvaluaciones
    });
  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
