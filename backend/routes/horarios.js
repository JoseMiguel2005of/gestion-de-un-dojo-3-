import express from 'express';
import { body, validationResult } from 'express-validator';
import supabase from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Orden de días de la semana
const ordenDias = {
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6,
  'Domingo': 7
};

// Obtener horarios (filtrados por categoría del usuario si es usuario normal)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.rol;
    
    // Obtener horarios (sin JOIN automático, lo haremos manualmente)
    let horariosQuery = supabase
      .from('horarios_clases')
      .select('*');

    // Si es un usuario normal (no admin/sensei), filtrar por su categoría
    if (userRole === 'usuario') {
      // Primero obtener las categorías de edad de los alumnos del usuario
      const { data: alumnos, error: alumnosError } = await supabase
        .from('alumno')
        .select('id_categoria_edad')
        .eq('usuario_id', userId)
        .eq('estado', true);

      if (alumnosError) {
        console.error('Error obteniendo alumnos del usuario:', alumnosError);
        return res.status(500).json({ error: 'Error interno del servidor', details: alumnosError.message });
      }

      const categoriasIds = [...new Set(alumnos.map(a => a.id_categoria_edad).filter(Boolean))];

      if (categoriasIds.length > 0) {
        // Obtener horarios que coincidan con las categorías del usuario o que no tengan categoría
        const { data: horariosConCategoria, error: error1 } = await supabase
          .from('horarios_clases')
          .select('*')
          .in('id_categoria_edad', categoriasIds);

        const { data: horariosSinCategoria, error: error2 } = await supabase
          .from('horarios_clases')
          .select('*')
          .is('id_categoria_edad', null);

        if (error1 || error2) {
          console.error('Error obteniendo horarios:', error1 || error2);
          return res.status(500).json({ error: 'Error interno del servidor', details: (error1 || error2).message });
        }

        const horarios = [...(horariosConCategoria || []), ...(horariosSinCategoria || [])];
        
        // Obtener categorías de edad
        const categoriasIdsParaMap = [...new Set(horarios.map(h => h.id_categoria_edad).filter(Boolean))];
        let categoriasMapParaUsuario = {};
        
        if (categoriasIdsParaMap.length > 0) {
          const { data: categorias, error: categoriasError } = await supabase
            .from('categorias_edad')
            .select('id, nombre')
            .in('id', categoriasIdsParaMap);

          if (!categoriasError && categorias) {
            categorias.forEach(c => {
              categoriasMapParaUsuario[c.id] = c.nombre;
            });
          }
        }
        
        // Formatear y ordenar
        const horariosFormateados = horarios.map(horario => {
          return {
            ...horario,
            categoria_edad_nombre: horario.id_categoria_edad ? categoriasMapParaUsuario[horario.id_categoria_edad] || null : null,
            instructor: horario.instructor || null
          };
        });

        // Ordenar por día de la semana y hora
        horariosFormateados.sort((a, b) => {
          const ordenA = ordenDias[a.dia_semana] || 99;
          const ordenB = ordenDias[b.dia_semana] || 99;
          if (ordenA !== ordenB) {
            return ordenA - ordenB;
          }
          return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
        });

        return res.json(horariosFormateados);
      } else {
        // Si no tiene alumnos, solo mostrar horarios sin categoría
        horariosQuery = horariosQuery.is('id_categoria_edad', null);
      }
    }

    const { data: horarios, error: horariosError } = await horariosQuery;

    if (horariosError) {
      console.error('Error obteniendo horarios:', horariosError);
      return res.status(500).json({ error: 'Error interno del servidor', details: horariosError.message });
    }

    if (!horarios || horarios.length === 0) {
      return res.json([]);
    }

    // Obtener categorías de edad para los horarios
    const categoriasIds = [...new Set(horarios.map(h => h.id_categoria_edad).filter(Boolean))];
    let categoriasMap = {};
    
    if (categoriasIds.length > 0) {
      const { data: categorias, error: categoriasError } = await supabase
        .from('categorias_edad')
        .select('id, nombre')
        .in('id', categoriasIds);

      if (!categoriasError && categorias) {
        categorias.forEach(c => {
          categoriasMap[c.id] = c.nombre;
        });
      }
    }

    // Formatear respuesta y ordenar
    const horariosFormateados = horarios.map(horario => {
      return {
        ...horario,
        categoria_edad_nombre: horario.id_categoria_edad ? categoriasMap[horario.id_categoria_edad] || null : null,
        instructor: horario.instructor || null
      };
    });

    // Ordenar por día de la semana y hora
    horariosFormateados.sort((a, b) => {
      const ordenA = ordenDias[a.dia_semana] || 99;
      const ordenB = ordenDias[b.dia_semana] || 99;
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
    });

    res.json(horariosFormateados);
  } catch (error) {
    console.error('Error obteniendo horarios:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Crear horario
router.post('/', async (req, res) => {
  try {
    const { dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor_id } = req.body;

    // Obtener el nombre del instructor si se proporciona instructor_id
    let instructor = null;
    if (instructor_id) {
      const { data: instructorData, error: instructorError } = await supabase
        .from('usuario')
        .select('nombre_completo')
        .eq('id', instructor_id)
        .limit(1)
        .single();

      if (!instructorError && instructorData) {
        instructor = instructorData.nombre_completo;
      }
    }

    const { data: newHorario, error: insertError } = await supabase
      .from('horarios_clases')
      .insert({
        dia_semana,
        hora_inicio,
        hora_fin,
        id_categoria_edad: id_categoria_edad || null,
        capacidad_maxima: capacidad_maxima || null,
        instructor: instructor || null
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creando horario:', insertError);
      return res.status(500).json({ error: 'Error interno del servidor', details: insertError.message });
    }

    res.status(201).json({ id: newHorario.id, message: 'Horario creado exitosamente' });
  } catch (error) {
    console.error('Error creando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
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
      const { data: instructorData, error: instructorError } = await supabase
        .from('usuario')
        .select('nombre_completo')
        .eq('id', instructor_id)
        .limit(1)
        .single();

      if (!instructorError && instructorData) {
        instructor = instructorData.nombre_completo;
      }
    }

    const updateData = {
      dia_semana,
      hora_inicio,
      hora_fin,
      id_categoria_edad: id_categoria_edad || null,
      capacidad_maxima: capacidad_maxima || null,
      instructor: instructor || null
    };

    if (activo !== undefined) {
      updateData.activo = activo;
    }

    const { error: updateError } = await supabase
      .from('horarios_clases')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error actualizando horario:', updateError);
      return res.status(500).json({ error: 'Error interno del servidor', details: updateError.message });
    }

    res.json({ message: 'Horario actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Eliminar horario
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('horarios_clases')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando horario:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json({ message: 'Horario eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando horario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener días festivos
router.get('/festivos', async (req, res) => {
  try {
    const { data: diasFestivos, error } = await supabase
      .from('dias_festivos')
      .select('*')
      .order('fecha', { ascending: true });

    if (error) {
      console.error('Error obteniendo días festivos:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json(diasFestivos || []);
  } catch (error) {
    console.error('Error obteniendo días festivos:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
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
    const { data: existingFestivo, error: checkError } = await supabase
      .from('dias_festivos')
      .select('id')
      .eq('fecha', fecha)
      .limit(1);

    if (checkError) {
      console.error('Error verificando día festivo:', checkError);
      return res.status(500).json({ error: 'Error interno del servidor', details: checkError.message });
    }

    if (existingFestivo && existingFestivo.length > 0) {
      return res.status(400).json({ error: 'Ya existe un día festivo en esa fecha' });
    }

    const { data: newFestivo, error: insertError } = await supabase
      .from('dias_festivos')
      .insert({ fecha, descripcion })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error agregando día festivo:', insertError);
      return res.status(500).json({ error: 'Error interno del servidor', details: insertError.message });
    }

    res.status(201).json({ 
      id: newFestivo.id, 
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
    const { data: existingFestivo, error: checkError } = await supabase
      .from('dias_festivos')
      .select('id')
      .eq('id', id)
      .limit(1);

    if (checkError) {
      console.error('Error verificando día festivo:', checkError);
      return res.status(500).json({ error: 'Error interno del servidor', details: checkError.message });
    }

    if (!existingFestivo || existingFestivo.length === 0) {
      return res.status(404).json({ error: 'Día festivo no encontrado' });
    }

    // Verificar si ya existe otro día festivo en esa fecha (excluyendo el actual)
    const { data: duplicateFestivo, error: dupError } = await supabase
      .from('dias_festivos')
      .select('id')
      .eq('fecha', fecha)
      .neq('id', id)
      .limit(1);

    if (dupError) {
      console.error('Error verificando duplicado:', dupError);
      return res.status(500).json({ error: 'Error interno del servidor', details: dupError.message });
    }

    if (duplicateFestivo && duplicateFestivo.length > 0) {
      return res.status(400).json({ error: 'Ya existe otro día festivo en esa fecha' });
    }

    const { error: updateError } = await supabase
      .from('dias_festivos')
      .update({ fecha, descripcion })
      .eq('id', id);

    if (updateError) {
      console.error('Error actualizando día festivo:', updateError);
      return res.status(500).json({ error: 'Error interno del servidor', details: updateError.message });
    }

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

    // Verificar que existe antes de eliminar
    const { data: existing, error: checkError } = await supabase
      .from('dias_festivos')
      .select('id')
      .eq('id', id)
      .limit(1);

    if (checkError) {
      console.error('Error verificando día festivo:', checkError);
      return res.status(500).json({ error: 'Error interno del servidor', details: checkError.message });
    }

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Día festivo no encontrado' });
    }

    const { error: deleteError } = await supabase
      .from('dias_festivos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error eliminando día festivo:', deleteError);
      return res.status(500).json({ error: 'Error interno del servidor', details: deleteError.message });
    }

    res.json({ message: 'Día festivo eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando día festivo:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

export default router;

