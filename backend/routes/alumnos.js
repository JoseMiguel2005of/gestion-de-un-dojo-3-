import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { registrarLog, LogActions, LogModules } from '../utils/logger.js';

const router = express.Router();

router.use(authenticateToken);

const TIEMPOS_PREPARACION = {
  cintas: {
    'Blanco': 4,
    'Amarillo': 5,
    'Naranja': 6,
    'Verde': 7,
    'Azul': 9,
    'Marrón': 15,
    'Negro': 20,
  },
  
  categorias: {
    'Benjamín': 0.8,
    'Alevín': 0.9,
    'Infantil': 1.0,
    'Cadete': 1.0,
    'Junior': 1.1,
    'Senior': 1.2,
    'Veterano': 1.3,
  }
};

async function calcularTiempoPreparacionInteligente(idCategoriaEdad, idCinta) {
  try {
    let categoria = 'Senior';
    if (idCategoriaEdad) {
      const categoriaData = await executeQuery(
        'SELECT nombre FROM categorias_edad WHERE id = ?',
        [idCategoriaEdad]
      );
      if (categoriaData.length > 0) {
        categoria = categoriaData[0].nombre;
      }
    }
    
    let cintaNombre = 'Blanco';
    if (idCinta) {
      const cintaData = await executeQuery(
        'SELECT nombre FROM cintas WHERE id = ?',
        [idCinta]
      );
      if (cintaData.length > 0) {
        cintaNombre = cintaData[0].nombre;
      }
    }
    
    const tiempoBaseCinta = TIEMPOS_PREPARACION.cintas[cintaNombre] || 6;
    const multiplicadorCategoria = TIEMPOS_PREPARACION.categorias[categoria] || 1.0;
    
    const tiempoCalculado = Math.round(tiempoBaseCinta * multiplicadorCategoria);
    
    return Math.max(3, Math.min(24, tiempoCalculado));
  } catch (error) {
    console.error('Error calculando tiempo de preparación:', error);
    return 6;
  }
}

router.get('/', async (req, res) => {
  try {
    const userRole = req.user?.rol || 'usuario';
    const userId = req.user?.id;
    
    let query = `
      SELECT 
        a.id, a.cedula, a.nombre, a.fecha_nacimiento, a.estado, 
        a.id_categoria_edad, a.id_cinta, a.usuario_id, a.sensei_id,
        a.telefono, a.email, a.direccion, a.contacto_emergencia, a.telefono_emergencia,
        a.nombre_padre, a.telefono_padre, a.nombre_madre, a.telefono_madre,
        a.proximo_examen_fecha, a.tiempo_preparacion_meses, a.fecha_inscripcion,
        ce.nombre as categoria_edad_nombre,
        c.nombre as cinta_nombre, c.color_hex as cinta_color,
        u.nombre_completo as instructor_nombre,
        GROUP_CONCAT(DISTINCT ar.id_representante) as representantes_ids,
        GROUP_CONCAT(DISTINCT r.nombre) as representantes_nombres
      FROM alumno a
      LEFT JOIN categorias_edad ce ON a.id_categoria_edad = ce.id
      LEFT JOIN cintas c ON a.id_cinta = c.id
      LEFT JOIN usuario u ON a.sensei_id = u.id
      LEFT JOIN alumnorepresentante ar ON a.id = ar.id_alumno
      LEFT JOIN representante r ON ar.id_representante = r.id
      WHERE a.estado = 1
      GROUP BY a.id, a.cedula, a.nombre, a.fecha_nacimiento, a.estado, 
               a.id_categoria_edad, a.id_cinta, a.usuario_id, a.sensei_id,
               a.telefono, a.email, a.direccion, a.contacto_emergencia, a.telefono_emergencia,
               a.nombre_padre, a.telefono_padre, a.nombre_madre, a.telefono_madre,
               a.proximo_examen_fecha, a.tiempo_preparacion_meses, a.fecha_inscripcion,
               ce.nombre, c.nombre, c.color_hex, u.nombre_completo
    `;
    
    if (userRole === 'usuario' && userId) {
      const queryWithFilter = query.replace('WHERE a.estado = 1', 'WHERE a.estado = 1 AND a.usuario_id = ?');
      const alumnos = await executeQuery(queryWithFilter + ` ORDER BY a.nombre`, [userId]);
      res.json(alumnos);
    } else {
      const alumnos = await executeQuery(query + ` ORDER BY a.nombre`);
      res.json(alumnos);
    }
  } catch (error) {
    console.error('Error obteniendo alumnos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      errno: error.errno,
      code: error.code
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let alumnos;
    try {
      alumnos = await executeQuery(`
        SELECT 
          a.id, a.cedula, a.nombre, a.fecha_nacimiento, a.estado, 
          a.id_categoria_edad, a.id_cinta, a.usuario_id,
          a.telefono, a.email, a.direccion,
          ce.nombre as categoria_edad_nombre,
          c.nombre as cinta_nombre, c.color_hex as cinta_color
        FROM alumno a
        LEFT JOIN categorias_edad ce ON a.id_categoria_edad = ce.id
        LEFT JOIN cintas c ON a.id_cinta = c.id
        WHERE a.id = ?
      `, [id]);
    } catch (error) {
      alumnos = await executeQuery(`
        SELECT 
          a.id, a.cedula, a.nombre, a.fecha_nacimiento, a.estado, 
          a.id_categoria_edad, a.id_cinta, a.usuario_id,
          ce.nombre as categoria_edad_nombre,
          c.nombre as cinta_nombre
        FROM alumno a
        LEFT JOIN categorias_edad ce ON a.id_categoria_edad = ce.id
        LEFT JOIN cintas c ON a.id_cinta = c.id
        WHERE a.id = ?
      `, [id]);
    }

    if (alumnos.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    const alumno = alumnos[0];

    const representantes = await executeQuery(`
      SELECT r.id, r.cedula, r.nombre, r.telefono
      FROM representante r
      INNER JOIN alumnorepresentante ar ON r.id = ar.id_representante
      WHERE ar.id_alumno = ?
      LIMIT 1
    `, [id]);

    if (representantes.length > 0) {
      alumno.representantes = representantes[0];
      alumno.representante_id = representantes[0].id;
    }

    let telefonos = [];
    try {
      telefonos = await executeQuery(`
        SELECT telefono FROM alumnotelefono WHERE id_alumno = ?
      `, [id]);
    } catch (error) {
    }

    let direcciones = [];
    try {
      direcciones = await executeQuery(`
        SELECT direccion FROM alumnodireccion WHERE id_alumno = ?
      `, [id]);
    } catch (error) {
    }

    res.json({
      ...alumno,
      telefonos_adicionales: telefonos.map(t => t.telefono),
      direcciones_adicionales: direcciones.map(d => d.direccion)
    });
  } catch (error) {
    console.error('Error obteniendo alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.post('/', [
  body('cedula').notEmpty().withMessage('Cédula es requerida'),
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('fecha_nacimiento').notEmpty().withMessage('Fecha de nacimiento es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      cedula, 
      nombre, 
      fecha_nacimiento, 
      id_categoria_edad,
      id_cinta,
      telefono, 
      email, 
      direccion,
      id_representante,
      usuario_id,
      contacto_emergencia,
      telefono_emergencia,
      nombre_padre,
      telefono_padre,
      nombre_madre,
      telefono_madre,
      representantes, 
      telefonos, 
      direcciones 
    } = req.body;

    const existingAlumnos = await executeQuery(
      'SELECT id FROM alumno WHERE cedula = ?',
      [cedula]
    );

    if (existingAlumnos.length > 0) {
      return res.status(400).json({ error: 'Ya existe un alumno con esta cédula' });
    }


    const tiempoPreparacion = await calcularTiempoPreparacionInteligente(id_categoria_edad, id_cinta);
    const fechaInscripcion = new Date();
    const proximoExamenFecha = new Date();
    proximoExamenFecha.setMonth(proximoExamenFecha.getMonth() + tiempoPreparacion);

    let result;
    let alumnoId;
    try {
      result = await executeQuery(
        'INSERT INTO alumno (cedula, nombre, fecha_nacimiento, estado, id_categoria_edad, id_cinta, telefono, email, direccion, contacto_emergencia, telefono_emergencia, nombre_padre, telefono_padre, nombre_madre, telefono_madre, usuario_id, tiempo_preparacion_meses, proximo_examen_fecha, fecha_inscripcion) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [cedula, nombre, fecha_nacimiento, id_categoria_edad || null, id_cinta || null, telefono || null, email || null, direccion || null, contacto_emergencia || null, telefono_emergencia || null, nombre_padre || null, telefono_padre || null, nombre_madre || null, telefono_madre || null, usuario_id || null, tiempoPreparacion, proximoExamenFecha, fechaInscripcion]
      );
      alumnoId = result.insertId;
      console.log('Alumno creado con resultado:', result, 'ID:', alumnoId);
    } catch (error) {
      console.log('Primer intento falló, intentando versión reducida:', error.message);
      console.error('Error SQL:', error.sql);
      console.error('Error SQL Message:', error.sqlMessage);
      try {
        result = await executeQuery(
          'INSERT INTO alumno (cedula, nombre, fecha_nacimiento, estado, id_categoria_edad, id_cinta, tiempo_preparacion_meses, proximo_examen_fecha, fecha_inscripcion) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)',
          [cedula, nombre, fecha_nacimiento, id_categoria_edad || null, id_cinta || null, tiempoPreparacion, proximoExamenFecha, fechaInscripcion]
        );
        alumnoId = result.insertId;
        console.log('Alumno creado con versión reducida, resultado:', result, 'ID:', alumnoId);
      } catch (error2) {
        console.log('Segundo intento falló, intentando versión mínima:', error2.message);
        console.error('Error SQL:', error2.sql);
        console.error('Error SQL Message:', error2.sqlMessage);
        result = await executeQuery(
          'INSERT INTO alumno (cedula, nombre, fecha_nacimiento, estado, id_categoria_edad, id_cinta) VALUES (?, ?, ?, 1, ?, ?)',
          [cedula, nombre, fecha_nacimiento, id_categoria_edad || null, id_cinta || null]
        );
        alumnoId = result.insertId;
        console.log('Alumno creado con versión mínima, resultado:', result, 'ID:', alumnoId);
      }
    }

    if (!alumnoId) {
      throw new Error('No se pudo obtener el ID del alumno creado');
    }

    // Asignar instructor aleatorio automáticamente
    try {
      const instructores = await executeQuery(
        'SELECT id FROM usuario WHERE rol = ? AND estado = 1',
        ['instructor']
      );
      
      if (instructores.length > 0) {
        const instructorAleatorio = instructores[Math.floor(Math.random() * instructores.length)];
        await executeQuery(
          'UPDATE alumno SET sensei_id = ? WHERE id = ?',
          [instructorAleatorio.id, alumnoId]
        );
      }
    } catch (error) {
      console.log('No se pudo asignar instructor automáticamente:', error.message);
    }

    if (id_representante) {
      try {
        await executeQuery(
          'INSERT INTO alumnorepresentante (id_alumno, id_representante) VALUES (?, ?)',
          [alumnoId, id_representante]
        );
      } catch (error) {
        console.log('No se pudo asociar representante:', error.message);
      }
    }

    if (representantes && representantes.length > 0) {
      for (const representanteId of representantes) {
        try {
          await executeQuery(
            'INSERT INTO alumnorepresentante (id_alumno, id_representante) VALUES (?, ?)',
            [alumnoId, representanteId]
          );
        } catch (error) {
          console.log(`No se pudo asociar representante ${representanteId}:`, error.message);
        }
      }
    }

    if (telefonos && telefonos.length > 0) {
      for (const tel of telefonos) {
        try {
          await executeQuery(
            'INSERT INTO alumnotelefono (id_alumno, telefono) VALUES (?, ?)',
            [alumnoId, tel]
          );
        } catch (error) {
          console.log(`No se pudo agregar teléfono ${tel}:`, error.message);
        }
      }
    }

    if (direcciones && direcciones.length > 0) {
      for (const dir of direcciones) {
        try {
          await executeQuery(
            'INSERT INTO alumnodireccion (id_alumno, direccion) VALUES (?, ?)',
            [alumnoId, dir]
          );
        } catch (error) {
          console.log(`No se pudo agregar dirección ${dir}:`, error.message);
        }
      }
    }

    try {
      await registrarLog({
        usuario_id: req.user?.id || usuario_id || null,
        accion: LogActions.CREAR,
        modulo: LogModules.ALUMNOS,
        descripcion: `Alumno creado: ${nombre} (${cedula}) - Categoría: ${id_categoria_edad || 'Sin categoría'}, Cinta: ${id_cinta || 'Sin cinta'}`,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      });
    } catch (logError) {
      console.log('No se pudo registrar el log:', logError.message);
    }

    res.status(201).json({ 
      id: alumnoId, 
      message: 'Alumno creado exitosamente' 
    });
  } catch (error) {
    console.error('Error creando alumno:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('Error SQL:', error.sql);
    console.error('Error SQL Message:', error.sqlMessage);
    console.error('Error Code:', error.code);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido',
      sqlMessage: error.sqlMessage || null,
      sql: process.env.NODE_ENV === 'development' ? error.sql : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code || undefined,
      errno: error.errno || undefined
    });
  }
});

router.put('/:id', [
  body('cedula').notEmpty().withMessage('Cédula es requerida'),
  body('nombre').notEmpty().withMessage('Nombre es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { 
      cedula, 
      nombre, 
      fecha_nacimiento, 
      id_categoria_edad,
      id_cinta, 
      estado,
      telefono,
      email,
      direccion,
      id_representante 
    } = req.body;

    const existingAlumnos = await executeQuery(
      'SELECT id FROM alumno WHERE cedula = ? AND id != ?',
      [cedula, id]
    );

    if (existingAlumnos.length > 0) {
      return res.status(400).json({ error: 'Ya existe otro alumno con esta cédula' });
    }

    try {
      await executeQuery(
        'UPDATE alumno SET cedula = ?, nombre = ?, fecha_nacimiento = ?, id_categoria_edad = ?, id_cinta = ?, estado = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?',
        [cedula, nombre, fecha_nacimiento, id_categoria_edad, id_cinta, estado, telefono || null, email || null, direccion || null, id]
      );
    } catch (error) {
      await executeQuery(
        'UPDATE alumno SET cedula = ?, nombre = ?, fecha_nacimiento = ?, id_categoria_edad = ?, id_cinta = ?, estado = ? WHERE id = ?',
        [cedula, nombre, fecha_nacimiento, id_categoria_edad, id_cinta, estado, id]
      );
    }

    if (id_representante !== undefined) {
      await executeQuery('DELETE FROM alumnorepresentante WHERE id_alumno = ?', [id]);
      
      if (id_representante) {
        await executeQuery(
          'INSERT INTO alumnorepresentante (id_alumno, id_representante) VALUES (?, ?)',
          [id, id_representante]
        );
      }
    }

    await registrarLog({
      usuario_id: req.user.id,
      accion: LogActions.ACTUALIZAR,
      modulo: LogModules.ALUMNOS,
      descripcion: `Alumno actualizado: ${nombre} (${cedula}) - ID: ${req.params.id}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });

    res.json({ message: 'Alumno actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información del alumno antes de eliminarlo
    const alumno = await executeQuery(
      'SELECT id, nombre, cedula, usuario_id FROM alumno WHERE id = ?',
      [id]
    );

    if (alumno.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    // Eliminar el usuario asociado si existe
    if (alumno[0].usuario_id) {
      await executeQuery(
        'DELETE FROM usuario WHERE id = ?',
        [alumno[0].usuario_id]
      );
    }

    // Marcar el alumno como eliminado
    await executeQuery(
      'UPDATE alumno SET estado = 0 WHERE id = ?',
      [id]
    );

    await registrarLog({
      usuario_id: req.user.id,
      accion: LogActions.ELIMINAR,
      modulo: LogModules.ALUMNOS,
      descripcion: `Alumno eliminado - ID: ${id}, Nombre: ${alumno[0].nombre}, Cédula: ${alumno[0].cedula}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });

    res.json({ message: 'Alumno eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/eliminados/listar', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id, a.cedula, a.nombre, a.fecha_nacimiento, a.estado,
        a.id_categoria_edad, a.id_cinta, a.sensei_id,
        ce.nombre as categoria_edad_nombre,
        c.nombre as cinta_nombre, c.color_hex as cinta_color,
        u.nombre_completo as instructor_nombre,
        GROUP_CONCAT(DISTINCT ar.id_representante) as representantes_ids,
        GROUP_CONCAT(DISTINCT r.nombre) as representantes_nombres
      FROM alumno a
      LEFT JOIN categorias_edad ce ON a.id_categoria_edad = ce.id
      LEFT JOIN cintas c ON a.id_cinta = c.id
      LEFT JOIN usuario u ON a.sensei_id = u.id
      LEFT JOIN alumnorepresentante ar ON a.id = ar.id_alumno
      LEFT JOIN representante r ON ar.id_representante = r.id
      WHERE a.estado = 0
      GROUP BY a.id, a.cedula, a.nombre, a.fecha_nacimiento, a.estado,
               a.id_categoria_edad, a.id_cinta, a.sensei_id,
               ce.nombre, c.nombre, c.color_hex, u.nombre_completo
      ORDER BY a.nombre
    `;
    
    const alumnos = await executeQuery(query);
    res.json(alumnos);
  } catch (error) {
    console.error('Error obteniendo alumnos eliminados:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      errno: error.errno,
      code: error.code
    });
  }
});


router.patch('/:id/restaurar', async (req, res) => {
  try {
    const { id } = req.params;

    await executeQuery(
      'UPDATE alumno SET estado = 1 WHERE id = ?',
      [id]
    );

    res.json({ message: 'Alumno restaurado exitosamente' });
  } catch (error) {
    console.error('Error restaurando alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para eliminar permanentemente un alumno
router.delete('/:id/permanente', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el alumno existe y está eliminado (estado = 0)
    const alumno = await executeQuery(
      'SELECT id, nombre, cedula, estado, usuario_id FROM alumno WHERE id = ?',
      [id]
    );

    if (alumno.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    if (alumno[0].estado === 1) {
      return res.status(400).json({ error: 'Solo se pueden eliminar permanentemente alumnos que ya estén eliminados' });
    }

    // Eliminar el usuario asociado si existe
    if (alumno[0].usuario_id) {
      await executeQuery(
        'DELETE FROM usuario WHERE id = ?',
        [alumno[0].usuario_id]
      );
    }

    // Eliminar relaciones con representantes
    await executeQuery('DELETE FROM alumnorepresentante WHERE id_alumno = ?', [id]);

    // Eliminar relaciones con evaluaciones
    await executeQuery('DELETE FROM alumnoevaluacion WHERE id_alumno = ?', [id]);

    // Eliminar pagos del alumno
    await executeQuery('DELETE FROM pagos WHERE id_alumno = ?', [id]);

    // Eliminar el alumno permanentemente
    await executeQuery('DELETE FROM alumno WHERE id = ?', [id]);

    await registrarLog({
      usuario_id: req.user.id,
      accion: LogActions.ELIMINAR,
      modulo: LogModules.ALUMNOS,
      descripcion: `Alumno eliminado PERMANENTEMENTE - ID: ${id}, Nombre: ${alumno[0].nombre}, Cédula: ${alumno[0].cedula}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });

    res.json({ message: 'Alumno eliminado permanentemente exitosamente' });
  } catch (error) {
    console.error('Error eliminando alumno permanentemente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


router.get('/senseis/disponibles', async (req, res) => {
  try {
    const senseis = await executeQuery(
      'SELECT id, nombre_completo, username FROM usuario WHERE rol = ? AND estado = 1 ORDER BY nombre_completo',
      ['instructor']
    );
    res.json(senseis);
  } catch (error) {
    console.error('Error obteniendo senseis:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


router.put('/:id/sensei', [
  body('sensei_id').isInt().withMessage('ID del sensei debe ser un número válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { sensei_id } = req.body;

    
    const sensei = await executeQuery(
      'SELECT id FROM usuario WHERE id = ? AND rol = ? AND estado = 1',
      [sensei_id, 'instructor']
    );

    if (sensei.length === 0) {
      return res.status(400).json({ error: 'Sensei no encontrado o no válido' });
    }

    
    await executeQuery(
      'UPDATE alumno SET sensei_id = ? WHERE id = ?',
      [sensei_id, id]
    );

    res.json({ message: 'Sensei actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando sensei:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
