import express from 'express';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Obtener horarios (filtrados por categoría del usuario si es usuario normal)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.rol;
    
    let query = `
      SELECT h.*, ce.nombre as categoria_edad_nombre, u.nombre_completo as instructor
      FROM horarios_clases h 
      LEFT JOIN categorias_edad ce ON h.id_categoria_edad = ce.id 
      LEFT JOIN usuario u ON h.instructor = u.nombre_completo
    `;
    
    // Si es un usuario normal (no admin/sensei), filtrar por su categoría
    if (userRole === 'usuario') {
      query += `
        WHERE h.id_categoria_edad IN (
          SELECT a.id_categoria_edad 
          FROM alumno a 
          WHERE a.usuario_id = ? AND a.estado = 1
        ) OR h.id_categoria_edad IS NULL
      `;
    }
    
    query += ` ORDER BY FIELD(h.dia_semana, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'), h.hora_inicio`;
    
    const params = userRole === 'usuario' ? [userId] : [];
    const horarios = await executeQuery(query, params);
    
    res.json(horarios);
  } catch (error) {
    console.error('Error obteniendo horarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear horario
router.post('/', async (req, res) => {
  try {
    const { dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor_id } = req.body;

    // Obtener el nombre del instructor si se proporciona instructor_id
    let instructor = null;
    if (instructor_id) {
      const instructorData = await executeQuery(
        'SELECT nombre_completo FROM usuario WHERE id = ?',
        [instructor_id]
      );
      instructor = instructorData.length > 0 ? instructorData[0].nombre_completo : null;
    }

    const result = await executeQuery(
      'INSERT INTO horarios_clases (dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor) VALUES (?, ?, ?, ?, ?, ?)',
      [dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor]
    );

    res.status(201).json({ id: result.insertId, message: 'Horario creado exitosamente' });
  } catch (error) {
    console.error('Error creando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar horario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor_id, activo } = req.body;

    // Obtener el nombre del instructor si se proporciona instructor_id
    let instructor = null;
    if (instructor_id) {
      const instructorData = await executeQuery(
        'SELECT nombre_completo FROM usuario WHERE id = ?',
        [instructor_id]
      );
      instructor = instructorData.length > 0 ? instructorData[0].nombre_completo : null;
    }

    await executeQuery(
      'UPDATE horarios_clases SET dia_semana = ?, hora_inicio = ?, hora_fin = ?, id_categoria_edad = ?, capacidad_maxima = ?, instructor = ?, activo = ? WHERE id = ?',
      [dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor, activo, id]
    );

    res.json({ message: 'Horario actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar horario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await executeQuery('DELETE FROM horarios_clases WHERE id = ?', [id]);
    res.json({ message: 'Horario eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener días festivos
router.get('/festivos', async (req, res) => {
  try {
    const diasFestivos = await executeQuery(
      'SELECT * FROM dias_festivos ORDER BY fecha ASC'
    );
    res.json(diasFestivos);
  } catch (error) {
    console.error('Error obteniendo días festivos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Agregar día festivo
router.post('/festivos', [
  body('fecha').notEmpty().withMessage('La fecha es requerida'),
  body('descripcion').notEmpty().withMessage('La descripción es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fecha, descripcion } = req.body;

    // Verificar si ya existe un día festivo en esa fecha
    const existingFestivo = await executeQuery(
      'SELECT id FROM dias_festivos WHERE fecha = ?',
      [fecha]
    );

    if (existingFestivo.length > 0) {
      return res.status(400).json({ error: 'Ya existe un día festivo en esa fecha' });
    }

    const result = await executeQuery(
      'INSERT INTO dias_festivos (fecha, descripcion) VALUES (?, ?)',
      [fecha, descripcion]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Día festivo agregado exitosamente' 
    });
  } catch (error) {
    console.error('Error agregando día festivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar día festivo
router.put('/festivos/:id', [
  body('fecha').notEmpty().withMessage('La fecha es requerida'),
  body('descripcion').notEmpty().withMessage('La descripción es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { fecha, descripcion } = req.body;

    // Verificar si el día festivo existe
    const existingFestivo = await executeQuery(
      'SELECT id FROM dias_festivos WHERE id = ?',
      [id]
    );

    if (existingFestivo.length === 0) {
      return res.status(404).json({ error: 'Día festivo no encontrado' });
    }

    // Verificar si ya existe otro día festivo en esa fecha (excluyendo el actual)
    const duplicateFestivo = await executeQuery(
      'SELECT id FROM dias_festivos WHERE fecha = ? AND id != ?',
      [fecha, id]
    );

    if (duplicateFestivo.length > 0) {
      return res.status(400).json({ error: 'Ya existe otro día festivo en esa fecha' });
    }

    const result = await executeQuery(
      'UPDATE dias_festivos SET fecha = ?, descripcion = ? WHERE id = ?',
      [fecha, descripcion, id]
    );

    res.json({ 
      message: 'Día festivo actualizado exitosamente',
      id: id
    });
  } catch (error) {
    console.error('Error actualizando día festivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar día festivo
router.delete('/festivos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      'DELETE FROM dias_festivos WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Día festivo no encontrado' });
    }

    res.json({ message: 'Día festivo eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando día festivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

