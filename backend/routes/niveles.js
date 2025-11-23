import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener todas las categorías de edad
router.get('/categorias-edad', async (req, res) => {
  try {
    const { data: categorias, error } = await supabase
      .from('categorias_edad')
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error obteniendo categorías de edad:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json(categorias || []);
  } catch (error) {
    console.error('Error obteniendo categorías de edad:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener todas las cintas
router.get('/cintas', async (req, res) => {
  try {
    const { data: cintas, error } = await supabase
      .from('cintas')
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error obteniendo cintas:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json(cintas || []);
  } catch (error) {
    console.error('Error obteniendo cintas:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener todos los niveles (devuelve categorias_old_backup con nivel y cinta)
router.get('/', async (req, res) => {
  try {
    const { data: niveles, error } = await supabase
      .from('categorias_old_backup')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error obteniendo niveles:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json(niveles || []);
  } catch (error) {
    console.error('Error obteniendo niveles:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener una categoría de edad por ID
router.get('/categorias-edad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: categoria, error: catError } = await supabase
      .from('categorias_edad')
      .select('*')
      .eq('id', id)
      .single();

    if (catError || !categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(categoria);
  } catch (error) {
    console.error('Error obteniendo categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener una cinta por ID
router.get('/cintas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: cinta, error: cintaError } = await supabase
      .from('cintas')
      .select('*')
      .eq('id', id)
      .single();

    if (cintaError || !cinta) {
      return res.status(404).json({ error: 'Cinta no encontrada' });
    }

    res.json(cinta);
  } catch (error) {
    console.error('Error obteniendo cinta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un nivel por ID (de categorias_old_backup)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: nivel, error: nivelError } = await supabase
      .from('categorias_old_backup')
      .select('*')
      .eq('id', id)
      .single();

    if (nivelError || !nivel) {
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }

    res.json(nivel);
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
    
    const { data: categoria, error: insertError } = await supabase
      .from('categorias_edad')
      .insert({
        nombre,
        edad_min,
        edad_max,
        precio_mensualidad: precio_mensualidad || null,
        orden: orden || 99
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creando categoría de edad:', insertError);
      return res.status(500).json({ error: 'Error interno del servidor', details: insertError.message });
    }

    res.status(201).json({ 
      id: categoria.id, 
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
    
    const { data: cinta, error: insertError } = await supabase
      .from('cintas')
      .insert({
        nombre,
        nombre_en: nombre_en || null,
        color_hex: color_hex || '#FFFFFF',
        orden: orden || 99,
        es_dan: es_dan || 0,
        nivel_dan: nivel_dan || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creando cinta:', insertError);
      return res.status(500).json({ error: 'Error interno del servidor', details: insertError.message });
    }

    res.status(201).json({ 
      id: cinta.id, 
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
    const { data: nivel, error: insertError } = await supabase
      .from('categorias_old_backup')
      .insert({
        nivel: nombre,
        cinta: color || null,
        precio_mensualidad: precio_mensualidad || null
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creando nivel:', insertError);
      return res.status(500).json({ error: 'Error interno del servidor', details: insertError.message });
    }
    
    res.status(201).json({ 
      id: nivel.id, 
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

    const { error: updateError } = await supabase
      .from('categorias_edad')
      .update({
        nombre,
        edad_min,
        edad_max,
        precio_mensualidad: precio_mensualidad || null,
        orden: orden || 99
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error actualizando categoría de edad:', updateError);
      return res.status(500).json({ error: 'Error interno del servidor', details: updateError.message });
    }

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

    const { error: updateError } = await supabase
      .from('cintas')
      .update({
        nombre,
        nombre_en: nombre_en || null,
        color_hex: color_hex || '#FFFFFF',
        orden: orden || 99,
        es_dan: es_dan || 0,
        nivel_dan: nivel_dan || null
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error actualizando cinta:', updateError);
      return res.status(500).json({ error: 'Error interno del servidor', details: updateError.message });
    }

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

    const { error: updateError } = await supabase
      .from('categorias_old_backup')
      .update({
        nivel: nombre,
        cinta: color || null,
        precio_mensualidad: precio_mensualidad || null
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error actualizando nivel:', updateError);
      return res.status(500).json({ error: 'Error interno del servidor', details: updateError.message });
    }

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
    const { count, error: countError } = await supabase
      .from('alumno')
      .select('*', { count: 'exact', head: true })
      .eq('id_categoria_edad', id);

    if (countError) {
      console.error('Error verificando alumnos:', countError);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque hay alumnos asignados' 
      });
    }

    const { error: deleteError } = await supabase
      .from('categorias_edad')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error eliminando categoría:', deleteError);
      return res.status(500).json({ error: 'Error interno del servidor', details: deleteError.message });
    }

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
    const { count, error: countError } = await supabase
      .from('alumno')
      .select('*', { count: 'exact', head: true })
      .eq('id_cinta', id);

    if (countError) {
      console.error('Error verificando alumnos:', countError);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la cinta porque hay alumnos asignados' 
      });
    }

    const { error: deleteError } = await supabase
      .from('cintas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error eliminando cinta:', deleteError);
      return res.status(500).json({ error: 'Error interno del servidor', details: deleteError.message });
    }

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

    const { error: deleteError } = await supabase
      .from('categorias_old_backup')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error eliminando nivel:', deleteError);
      return res.status(500).json({ error: 'Error interno del servidor', details: deleteError.message });
    }

    res.json({ message: 'Nivel eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando nivel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
