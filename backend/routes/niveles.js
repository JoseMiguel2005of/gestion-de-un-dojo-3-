import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener todas las categorías de edad
router.get('/categorias-edad', async (req, res) => {
  try {
    const categorias = await executeQuery(
      'SELECT * FROM categorias_edad ORDER BY orden'
    );
    res.json(categorias);
  } catch (error) {
    console.error('Error obteniendo categorías de edad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todas las cintas
router.get('/cintas', async (req, res) => {
  try {
    const cintas = await executeQuery(
      'SELECT * FROM cintas ORDER BY orden'
    );
    res.json(cintas);
  } catch (error) {
    console.error('Error obteniendo cintas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los niveles (devuelve categorias_old_backup con nivel y cinta)
router.get('/', async (req, res) => {
  try {
    const niveles = await executeQuery(
      'SELECT * FROM categorias_old_backup ORDER BY id'
    );
    res.json(niveles);
  } catch (error) {
    console.error('Error obteniendo niveles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener una categoría de edad por ID
router.get('/categorias-edad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const categorias = await executeQuery(
      'SELECT * FROM categorias_edad WHERE id = ?',
      [id]
    );

    if (categorias.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(categorias[0]);
  } catch (error) {
    console.error('Error obteniendo categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener una cinta por ID
router.get('/cintas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cintas = await executeQuery(
      'SELECT * FROM cintas WHERE id = ?',
      [id]
    );

    if (cintas.length === 0) {
      return res.status(404).json({ error: 'Cinta no encontrada' });
    }

    res.json(cintas[0]);
  } catch (error) {
    console.error('Error obteniendo cinta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un nivel por ID (de categorias_old_backup)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const niveles = await executeQuery(
      'SELECT * FROM categorias_old_backup WHERE id = ?',
      [id]
    );

    if (niveles.length === 0) {
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }

    res.json(niveles[0]);
  } catch (error) {
    console.error('Error obteniendo nivel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva categoría de edad
router.post('/categorias-edad', [
  body('nombre').notEmpty().withMessage('Nombre de la categoría es requerido'),
  body('edad_min').isInt({ min: 0 }).withMessage('Edad mínima debe ser un número válido'),
  body('edad_max').isInt({ min: 0 }).withMessage('Edad máxima debe ser un número válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, edad_min, edad_max, precio_mensualidad, orden } = req.body;
    
    const result = await executeQuery(
      'INSERT INTO categorias_edad (nombre, edad_min, edad_max, precio_mensualidad, orden) VALUES (?, ?, ?, ?, ?)',
      [nombre, edad_min, edad_max, precio_mensualidad || null, orden || 99]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Categoría de edad creada exitosamente' 
    });
  } catch (error) {
    console.error('Error creando categoría de edad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva cinta
router.post('/cintas', [
  body('nombre').notEmpty().withMessage('Nombre de la cinta es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, nombre_en, color_hex, orden, es_dan, nivel_dan } = req.body;
    
    const result = await executeQuery(
      'INSERT INTO cintas (nombre, nombre_en, color_hex, orden, es_dan, nivel_dan) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, nombre_en || null, color_hex || '#FFFFFF', orden || 99, es_dan || 0, nivel_dan || null]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Cinta creada exitosamente' 
    });
  } catch (error) {
    console.error('Error creando cinta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo nivel (crea en categorias_old_backup)
router.post('/', [
  body('nombre').notEmpty().withMessage('Nombre del nivel es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Errores de validación:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, color, precio_mensualidad } = req.body;
    
    console.log('Creando nivel en categorias_old_backup:', { nombre, color, precio_mensualidad });

    // Crear en categorias_old_backup con nivel y cinta
    const result = await executeQuery(
      'INSERT INTO categorias_old_backup (nivel, cinta, precio_mensualidad) VALUES (?, ?, ?)',
      [nombre, color || null, precio_mensualidad || null]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Nivel creado exitosamente' 
    });
  } catch (error) {
    console.error('Error creando nivel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar categoría de edad
router.put('/categorias-edad/:id', [
  body('nombre').notEmpty().withMessage('Nombre de la categoría es requerido'),
  body('edad_min').isInt({ min: 0 }).withMessage('Edad mínima debe ser un número válido'),
  body('edad_max').isInt({ min: 0 }).withMessage('Edad máxima debe ser un número válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nombre, edad_min, edad_max, precio_mensualidad, orden } = req.body;

    await executeQuery(
      'UPDATE categorias_edad SET nombre = ?, edad_min = ?, edad_max = ?, precio_mensualidad = ?, orden = ? WHERE id = ?',
      [nombre, edad_min, edad_max, precio_mensualidad || null, orden || 99, id]
    );

    res.json({ message: 'Categoría de edad actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando categoría de edad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar cinta
router.put('/cintas/:id', [
  body('nombre').notEmpty().withMessage('Nombre de la cinta es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nombre, nombre_en, color_hex, orden, es_dan, nivel_dan } = req.body;

    await executeQuery(
      'UPDATE cintas SET nombre = ?, nombre_en = ?, color_hex = ?, orden = ?, es_dan = ?, nivel_dan = ? WHERE id = ?',
      [nombre, nombre_en || null, color_hex || '#FFFFFF', orden || 99, es_dan || 0, nivel_dan || null, id]
    );

    res.json({ message: 'Cinta actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando cinta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar nivel (en categorias_old_backup)
router.put('/:id', [
  body('nombre').notEmpty().withMessage('Nombre del nivel es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nombre, color, precio_mensualidad } = req.body;

    await executeQuery(
      'UPDATE categorias_old_backup SET nivel = ?, cinta = ?, precio_mensualidad = ? WHERE id = ?',
      [nombre, color || null, precio_mensualidad || null, id]
    );

    res.json({ message: 'Nivel actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando nivel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar categoría de edad
router.delete('/categorias-edad/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay alumnos usando esta categoría
    const alumnos = await executeQuery(
      'SELECT COUNT(*) as count FROM alumno WHERE id_categoria_edad = ?',
      [id]
    );

    if (alumnos[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque hay alumnos asignados' 
      });
    }

    await executeQuery(
      'DELETE FROM categorias_edad WHERE id = ?',
      [id]
    );

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar cinta
router.delete('/cintas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay alumnos usando esta cinta
    const alumnos = await executeQuery(
      'SELECT COUNT(*) as count FROM alumno WHERE id_cinta = ?',
      [id]
    );

    if (alumnos[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la cinta porque hay alumnos asignados' 
      });
    }

    await executeQuery(
      'DELETE FROM cintas WHERE id = ?',
      [id]
    );

    res.json({ message: 'Cinta eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando cinta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar nivel (de categorias_old_backup)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Nota: id_nivel ya no se usa en alumnos, se eliminó esa columna.
    // categorias_old_backup es una tabla de respaldo/legacy, 
    // pero aún puede ser referenciada en algunas vistas. 
    // Permitir eliminación ya que no hay dependencias críticas.

    await executeQuery(
      'DELETE FROM categorias_old_backup WHERE id = ?',
      [id]
    );

    res.json({ message: 'Nivel eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando nivel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
