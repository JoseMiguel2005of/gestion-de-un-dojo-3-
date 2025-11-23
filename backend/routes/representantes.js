import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener todos los representantes
router.get('/', async (req, res) => {
  try {
    // Verificar si el usuario es un usuario normal (solo debe ver representantes de sus alumnos)
    const userRole = req.user?.rol || 'usuario';
    const userId = req.user?.id;
    
    let representantesQuery;
    
    if (userRole === 'usuario' && userId) {
      // Usuarios normales solo ven representantes de sus alumnos asociados
      // Primero obtener los IDs de representantes asociados a alumnos del usuario
      const { data: alumnos, error: alumnosError } = await supabase
        .from('alumno')
        .select('id')
        .eq('usuario_id', userId)
        .eq('estado', true);

      if (alumnosError) {
        console.error('Error obteniendo alumnos del usuario:', alumnosError);
        return res.status(500).json({ error: 'Error interno del servidor', details: alumnosError.message });
      }

      if (!alumnos || alumnos.length === 0) {
        return res.json([]);
      }

      const alumnosIds = alumnos.map(a => a.id);

      // Obtener representantes asociados a estos alumnos
      const { data: representantesRel, error: relError } = await supabase
        .from('alumnorepresentante')
        .select('id_representante')
        .in('id_alumno', alumnosIds);

      if (relError) {
        console.error('Error obteniendo relaciones:', relError);
        return res.status(500).json({ error: 'Error interno del servidor', details: relError.message });
      }

      if (!representantesRel || representantesRel.length === 0) {
        return res.json([]);
      }

      const representantesIds = [...new Set(representantesRel.map(r => r.id_representante))];

      representantesQuery = supabase
        .from('representante')
        .select('*')
        .in('id', representantesIds)
        .order('nombre', { ascending: true });
    } else {
      // Admin, sensei, etc. pueden ver todos los representantes
      representantesQuery = supabase
        .from('representante')
        .select('*')
        .order('nombre', { ascending: true });
    }

    const { data: representantes, error: repError } = await representantesQuery;

    if (repError) {
      console.error('Error obteniendo representantes:', repError);
      return res.status(500).json({ error: 'Error interno del servidor', details: repError.message });
    }

    if (!representantes || representantes.length === 0) {
      return res.json([]);
    }

    // Obtener alumnos asociados para cada representante
    const representantesIds = representantes.map(r => r.id);
    const { data: alumnosRel, error: alumnosRelError } = await supabase
      .from('alumnorepresentante')
      .select(`
        id_representante,
        id_alumno,
        alumno:id_alumno(nombre)
      `)
      .in('id_representante', representantesIds);

    if (alumnosRelError) {
      console.error('Error obteniendo relaciones de alumnos:', alumnosRelError);
    }

    // Combinar datos
    const representantesConAlumnos = representantes.map(rep => {
      const alumnos = alumnosRel?.filter(r => r.id_representante === rep.id) || [];
      const alumnosNombres = alumnos
        .map(r => {
          const alumno = Array.isArray(r.alumno) ? r.alumno[0] : r.alumno;
          return alumno?.nombre;
        })
        .filter(Boolean)
        .join(', ');

      return {
        id: rep.id,
        cedula: rep.cedula,
        nombre: rep.nombre,
        telefono: rep.telefono,
        alumnos_nombres: alumnosNombres || null
      };
    });

    res.json(representantesConAlumnos);
  } catch (error) {
    console.error('Error obteniendo representantes:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener un representante por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const representantes = await executeQuery(
      'SELECT * FROM representante WHERE id = ?',
      [id]
    );

    if (representantes.length === 0) {
      return res.status(404).json({ error: 'Representante no encontrado' });
    }

    const representante = representantes[0];

    // Obtener alumnos asociados
    const alumnos = await executeQuery(`
      SELECT a.id, a.nombre, a.cedula
      FROM alumno a
      INNER JOIN alumnorepresentante ar ON a.id = ar.id_alumno
      WHERE ar.id_representante = ?
    `, [id]);

    res.json({
      ...representante,
      alumnos
    });
  } catch (error) {
    console.error('Error obteniendo representante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo representante
router.post('/', [
  body('cedula').notEmpty().withMessage('Cédula es requerida'),
  body('nombre').notEmpty().withMessage('Nombre es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cedula, nombre, telefono } = req.body;

    // Verificar si la cédula ya existe
    const existingRepresentantes = await executeQuery(
      'SELECT id FROM representante WHERE cedula = ?',
      [cedula]
    );

    if (existingRepresentantes.length > 0) {
      return res.status(400).json({ error: 'Ya existe un representante con esta cédula' });
    }

    const result = await executeQuery(
      'INSERT INTO representante (cedula, nombre, telefono) VALUES (?, ?, ?)',
      [cedula, nombre, telefono]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Representante creado exitosamente' 
    });
  } catch (error) {
    console.error('Error creando representante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar representante
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
    const { cedula, nombre, telefono } = req.body;

    // Verificar si la cédula ya existe en otro representante
    const existingRepresentantes = await executeQuery(
      'SELECT id FROM representante WHERE cedula = ? AND id != ?',
      [cedula, id]
    );

    if (existingRepresentantes.length > 0) {
      return res.status(400).json({ error: 'Ya existe otro representante con esta cédula' });
    }

    await executeQuery(
      'UPDATE representante SET cedula = ?, nombre = ?, telefono = ? WHERE id = ?',
      [cedula, nombre, telefono, id]
    );

    res.json({ message: 'Representante actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando representante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar representante
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay alumnos asociados
    const alumnos = await executeQuery(
      'SELECT COUNT(*) as count FROM alumnorepresentante WHERE id_representante = ?',
      [id]
    );

    if (alumnos[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el representante porque tiene alumnos asociados' 
      });
    }

    await executeQuery(
      'DELETE FROM representante WHERE id = ?',
      [id]
    );

    res.json({ message: 'Representante eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando representante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
