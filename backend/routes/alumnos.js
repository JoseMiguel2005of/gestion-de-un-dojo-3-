import express from 'express';
import supabase from '../utils/supabaseClient.js';
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
      const { data: categoriaData, error: catError } = await supabase
        .from('categorias_edad')
        .select('nombre')
        .eq('id', idCategoriaEdad)
        .single();
      
      if (!catError && categoriaData) {
        categoria = categoriaData.nombre;
      }
    }
    
    let cintaNombre = 'Blanco';
    if (idCinta) {
      const { data: cintaData, error: cintaError } = await supabase
        .from('cintas')
        .select('nombre')
        .eq('id', idCinta)
        .single();
      
      if (!cintaError && cintaData) {
        cintaNombre = cintaData.nombre;
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
    
    // Obtener alumnos con sus relaciones básicas
    // NO filtrar por estado aquí para que el frontend pueda mostrar todos los alumnos
    // El frontend filtrará según sea necesario
    let alumnosQuery = supabase
      .from('alumno')
      .select(`
        *,
        categorias_edad:id_categoria_edad(nombre),
        cintas:id_cinta(nombre, color_hex),
        usuario:sensei_id(nombre_completo)
      `)
      .order('nombre', { ascending: true });

    // Filtrar por usuario si es necesario
    if (userRole === 'usuario' && userId) {
      alumnosQuery = alumnosQuery.eq('usuario_id', userId);
    }

    const { data: alumnos, error: alumnosError } = await alumnosQuery;

    if (alumnosError) {
      console.error('Error obteniendo alumnos:', alumnosError);
      return res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: alumnosError.message,
        code: alumnosError.code
      });
    }

    if (!alumnos || alumnos.length === 0) {
      return res.json([]);
    }

    // Obtener representantes para todos los alumnos
    const alumnosIds = alumnos.map(a => a.id);
    const { data: representantesData, error: repError } = await supabase
      .from('alumnorepresentante')
      .select(`
        id_alumno,
        id_representante,
        representante:id_representante(id, nombre)
      `)
      .in('id_alumno', alumnosIds);

    if (repError) {
      console.error('Error obteniendo representantes:', repError);
    }

    // Combinar datos
    const alumnosConRepresentantes = alumnos.map(alumno => {
      const representantes = representantesData?.filter(r => r.id_alumno === alumno.id) || [];
      const representantesIds = representantes.map(r => r.id_representante).join(',');
      const representantesNombres = representantes
        .map(r => r.representante?.nombre)
        .filter(Boolean)
        .join(', ');

      // Obtener datos de relaciones (pueden ser arrays o objetos)
      const categoriaEdad = Array.isArray(alumno.categorias_edad) 
        ? alumno.categorias_edad[0] 
        : alumno.categorias_edad;
      const cinta = Array.isArray(alumno.cintas) 
        ? alumno.cintas[0] 
        : alumno.cintas;
      const instructor = Array.isArray(alumno.usuario) 
        ? alumno.usuario[0] 
        : alumno.usuario;

      return {
        id: alumno.id,
        cedula: alumno.cedula,
        nombre: alumno.nombre,
        fecha_nacimiento: alumno.fecha_nacimiento,
        estado: alumno.estado,
        id_categoria_edad: alumno.id_categoria_edad,
        id_cinta: alumno.id_cinta,
        usuario_id: alumno.usuario_id,
        sensei_id: alumno.sensei_id,
        telefono: alumno.telefono,
        email: alumno.email,
        direccion: alumno.direccion,
        contacto_emergencia: alumno.contacto_emergencia,
        telefono_emergencia: alumno.telefono_emergencia,
        nombre_padre: alumno.nombre_padre,
        telefono_padre: alumno.telefono_padre,
        nombre_madre: alumno.nombre_madre,
        telefono_madre: alumno.telefono_madre,
        proximo_examen_fecha: alumno.proximo_examen_fecha,
        tiempo_preparacion_meses: alumno.tiempo_preparacion_meses,
        fecha_inscripcion: alumno.fecha_inscripcion,
        categoria_edad_nombre: categoriaEdad?.nombre || null,
        cinta_nombre: cinta?.nombre || null,
        cinta_color: cinta?.color_hex || null,
        instructor_nombre: instructor?.nombre_completo || null,
        representantes_ids: representantesIds || null,
        representantes_nombres: representantesNombres || null
      };
    });

    res.json(alumnosConRepresentantes);
  } catch (error) {
    console.error('Error obteniendo alumnos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message,
      code: error.code
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener alumno con relaciones
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select(`
        *,
        categorias_edad:id_categoria_edad(nombre),
        cintas:id_cinta(nombre, color_hex)
      `)
      .eq('id', id)
      .single();

    if (alumnoError || !alumno) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    // Obtener representantes
    const { data: representantesData, error: repError } = await supabase
      .from('alumnorepresentante')
      .select(`
        id_representante,
        representante:id_representante(id, cedula, nombre, telefono)
      `)
      .eq('id_alumno', id)
      .limit(1);

    let representante = null;
    if (!repError && representantesData && representantesData.length > 0) {
      const rep = Array.isArray(representantesData[0].representante) 
        ? representantesData[0].representante[0] 
        : representantesData[0].representante;
      if (rep) {
        representante = rep;
      }
    }

    // Obtener teléfonos adicionales
    const { data: telefonosData, error: telError } = await supabase
      .from('alumnotelefono')
      .select('telefono')
      .eq('id_alumno', id);

    // Obtener direcciones adicionales
    const { data: direccionesData, error: dirError } = await supabase
      .from('alumnodireccion')
      .select('direccion')
      .eq('id_alumno', id);

    const categoriaEdad = Array.isArray(alumno.categorias_edad) 
      ? alumno.categorias_edad[0] 
      : alumno.categorias_edad;
    const cinta = Array.isArray(alumno.cintas) 
      ? alumno.cintas[0] 
      : alumno.cintas;

    res.json({
      id: alumno.id,
      cedula: alumno.cedula,
      nombre: alumno.nombre,
      fecha_nacimiento: alumno.fecha_nacimiento,
      estado: alumno.estado,
      id_categoria_edad: alumno.id_categoria_edad,
      id_cinta: alumno.id_cinta,
      usuario_id: alumno.usuario_id,
      telefono: alumno.telefono,
      email: alumno.email,
      direccion: alumno.direccion,
      categoria_edad_nombre: categoriaEdad?.nombre || null,
      cinta_nombre: cinta?.nombre || null,
      cinta_color: cinta?.color_hex || null,
      representantes: representante,
      representante_id: representante?.id || null,
      telefonos_adicionales: telefonosData?.map(t => t.telefono) || [],
      direcciones_adicionales: direccionesData?.map(d => d.direccion) || []
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

    const { data: existingAlumnos, error: existingError } = await supabase
      .from('alumno')
      .select('id')
      .eq('cedula', cedula)
      .limit(1);

    if (existingAlumnos && existingAlumnos.length > 0) {
      return res.status(400).json({ error: 'Ya existe un alumno con esta cédula' });
    }


    const tiempoPreparacion = await calcularTiempoPreparacionInteligente(id_categoria_edad, id_cinta);
    const fechaInscripcion = new Date();
    const proximoExamenFecha = new Date();
    proximoExamenFecha.setMonth(proximoExamenFecha.getMonth() + tiempoPreparacion);

    let result;
    let alumnoId;
    
    // Intentar insertar con todos los campos
    const alumnoData = {
      cedula,
      nombre,
      fecha_nacimiento,
      estado: true,
      id_categoria_edad: id_categoria_edad || null,
      id_cinta: id_cinta || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      contacto_emergencia: contacto_emergencia || null,
      telefono_emergencia: telefono_emergencia || null,
      nombre_padre: nombre_padre || null,
      telefono_padre: telefono_padre || null,
      nombre_madre: nombre_madre || null,
      telefono_madre: telefono_madre || null,
      usuario_id: usuario_id || null,
      tiempo_preparacion_meses: tiempoPreparacion,
      proximo_examen_fecha: proximoExamenFecha.toISOString(),
      fecha_inscripcion: fechaInscripcion.toISOString()
    };

    try {
      const { data: insertResult, error: insertError } = await supabase
        .from('alumno')
        .insert([alumnoData])
        .select()
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      result = insertResult;
      alumnoId = result.id;
      console.log('Alumno creado con resultado:', result, 'ID:', alumnoId);
    } catch (error) {
      console.log('Primer intento falló, intentando versión reducida:', error.message);
      
      // Intentar con campos mínimos
      const alumnoDataReduced = {
        cedula,
        nombre,
        fecha_nacimiento,
        estado: true,
        id_categoria_edad: id_categoria_edad || null,
        id_cinta: id_cinta || null,
        tiempo_preparacion_meses: tiempoPreparacion,
        proximo_examen_fecha: proximoExamenFecha.toISOString(),
        fecha_inscripcion: fechaInscripcion.toISOString()
      };
      
      try {
        const { data: insertResult2, error: insertError2 } = await supabase
          .from('alumno')
          .insert([alumnoDataReduced])
          .select()
          .single();
        
        if (insertError2) {
          throw insertError2;
        }
        
        result = insertResult2;
        alumnoId = result.id;
        console.log('Alumno creado con versión reducida, resultado:', result, 'ID:', alumnoId);
      } catch (error2) {
        console.log('Segundo intento falló, intentando versión mínima:', error2.message);
        
        // Intentar con campos absolutamente mínimos
        const alumnoDataMin = {
          cedula,
          nombre,
          fecha_nacimiento,
          estado: true,
          id_categoria_edad: id_categoria_edad || null,
          id_cinta: id_cinta || null
        };
        
        const { data: insertResult3, error: insertError3 } = await supabase
          .from('alumno')
          .insert([alumnoDataMin])
          .select()
          .single();
        
        if (insertError3) {
          throw insertError3;
        }
        
        result = insertResult3;
        alumnoId = result.id;
        console.log('Alumno creado con versión mínima, resultado:', result, 'ID:', alumnoId);
      }
    }

    if (!alumnoId) {
      throw new Error('No se pudo obtener el ID del alumno creado');
    }

    // Asignar instructor aleatorio automáticamente
    try {
      const { data: instructores, error: instructoresError } = await supabase
        .from('usuario')
        .select('id')
        .eq('rol', 'instructor')
        .eq('estado', 1);
      
      if (!instructoresError && instructores && instructores.length > 0) {
        const instructorAleatorio = instructores[Math.floor(Math.random() * instructores.length)];
        await supabase
          .from('alumno')
          .update({ sensei_id: instructorAleatorio.id })
          .eq('id', alumnoId);
      }
    } catch (error) {
      console.log('No se pudo asignar instructor automáticamente:', error.message);
    }

    if (id_representante) {
      try {
        await supabase
          .from('alumnorepresentante')
          .insert([{ id_alumno: alumnoId, id_representante: id_representante }]);
      } catch (error) {
        console.log('No se pudo asociar representante:', error.message);
      }
    }

    if (representantes && representantes.length > 0) {
      for (const representanteId of representantes) {
        try {
          await supabase
            .from('alumnorepresentante')
            .insert([{ id_alumno: alumnoId, id_representante: representanteId }]);
        } catch (error) {
          console.log(`No se pudo asociar representante ${representanteId}:`, error.message);
        }
      }
    }

    if (telefonos && telefonos.length > 0) {
      for (const tel of telefonos) {
        try {
          await supabase
            .from('alumnotelefono')
            .insert([{ id_alumno: alumnoId, telefono: tel }]);
        } catch (error) {
          console.log(`No se pudo agregar teléfono ${tel}:`, error.message);
        }
      }
    }

    if (direcciones && direcciones.length > 0) {
      for (const dir of direcciones) {
        try {
          await supabase
            .from('alumnodireccion')
            .insert([{ id_alumno: alumnoId, direccion: dir }]);
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

    const { data: existingAlumnos, error: existingError } = await supabase
      .from('alumno')
      .select('id')
      .eq('cedula', cedula)
      .neq('id', id)
      .limit(1);

    if (existingAlumnos && existingAlumnos.length > 0) {
      return res.status(400).json({ error: 'Ya existe otro alumno con esta cédula' });
    }

    const updateData = {
      cedula,
      nombre,
      fecha_nacimiento,
      id_categoria_edad: id_categoria_edad || null,
      id_cinta: id_cinta || null,
      estado: estado !== undefined ? estado : true
    };

    // Agregar campos opcionales si existen
    if (telefono !== undefined) updateData.telefono = telefono || null;
    if (email !== undefined) updateData.email = email || null;
    if (direccion !== undefined) updateData.direccion = direccion || null;

    const { error: updateError } = await supabase
      .from('alumno')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    if (id_representante !== undefined) {
      // Eliminar representantes existentes
      await supabase
        .from('alumnorepresentante')
        .delete()
        .eq('id_alumno', id);
      
      // Agregar nuevo representante si se proporciona
      if (id_representante) {
        await supabase
          .from('alumnorepresentante')
          .insert([{ id_alumno: id, id_representante: id_representante }]);
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
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('id, nombre, cedula, usuario_id')
      .eq('id', id)
      .single();

    if (alumnoError || !alumno) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    // Eliminar el usuario asociado si existe
    if (alumno.usuario_id) {
      await supabase
        .from('usuario')
        .delete()
        .eq('id', alumno.usuario_id);
    }

    // Marcar el alumno como eliminado
    await supabase
      .from('alumno')
      .update({ estado: false })
      .eq('id', id);

    await registrarLog({
      usuario_id: req.user.id,
      accion: LogActions.ELIMINAR,
      modulo: LogModules.ALUMNOS,
      descripcion: `Alumno eliminado - ID: ${id}, Nombre: ${alumno.nombre}, Cédula: ${alumno.cedula}`,
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
    // Obtener alumnos eliminados con sus relaciones básicas
    const { data: alumnos, error: alumnosError } = await supabase
      .from('alumno')
      .select(`
        *,
        categorias_edad:id_categoria_edad(nombre),
        cintas:id_cinta(nombre, color_hex),
        usuario:sensei_id(nombre_completo)
      `)
      .eq('estado', false)
      .order('nombre', { ascending: true });

    if (alumnosError) {
      console.error('Error obteniendo alumnos eliminados:', alumnosError);
      return res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: alumnosError.message,
        code: alumnosError.code
      });
    }

    if (!alumnos || alumnos.length === 0) {
      return res.json([]);
    }

    // Obtener representantes para todos los alumnos
    const alumnosIds = alumnos.map(a => a.id);
    const { data: representantesData, error: repError } = await supabase
      .from('alumnorepresentante')
      .select(`
        id_alumno,
        id_representante,
        representante:id_representante(id, nombre)
      `)
      .in('id_alumno', alumnosIds);

    if (repError) {
      console.error('Error obteniendo representantes:', repError);
    }

    // Combinar datos
    const alumnosConRepresentantes = alumnos.map(alumno => {
      const representantes = representantesData?.filter(r => r.id_alumno === alumno.id) || [];
      const representantesIds = representantes.map(r => r.id_representante).join(',');
      const representantesNombres = representantes
        .map(r => {
          const rep = Array.isArray(r.representante) ? r.representante[0] : r.representante;
          return rep?.nombre;
        })
        .filter(Boolean)
        .join(', ');

      const categoriaEdad = Array.isArray(alumno.categorias_edad) 
        ? alumno.categorias_edad[0] 
        : alumno.categorias_edad;
      const cinta = Array.isArray(alumno.cintas) 
        ? alumno.cintas[0] 
        : alumno.cintas;
      const instructor = Array.isArray(alumno.usuario) 
        ? alumno.usuario[0] 
        : alumno.usuario;

      return {
        id: alumno.id,
        cedula: alumno.cedula,
        nombre: alumno.nombre,
        fecha_nacimiento: alumno.fecha_nacimiento,
        estado: alumno.estado,
        id_categoria_edad: alumno.id_categoria_edad,
        id_cinta: alumno.id_cinta,
        sensei_id: alumno.sensei_id,
        categoria_edad_nombre: categoriaEdad?.nombre || null,
        cinta_nombre: cinta?.nombre || null,
        cinta_color: cinta?.color_hex || null,
        instructor_nombre: instructor?.nombre_completo || null,
        representantes_ids: representantesIds || null,
        representantes_nombres: representantesNombres || null
      };
    });

    res.json(alumnosConRepresentantes);
  } catch (error) {
    console.error('Error obteniendo alumnos eliminados:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error.message,
      code: error.code
    });
  }
});


router.patch('/:id/restaurar', async (req, res) => {
  try {
    const { id } = req.params;

    const { error: updateError } = await supabase
      .from('alumno')
      .update({ estado: true })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

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

    // Verificar que el alumno existe y está eliminado (estado = false)
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('id, nombre, cedula, estado, usuario_id')
      .eq('id', id)
      .single();

    if (alumnoError || !alumno) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    if (alumno.estado === true) {
      return res.status(400).json({ error: 'Solo se pueden eliminar permanentemente alumnos que ya estén eliminados' });
    }

    // Eliminar el usuario asociado si existe
    if (alumno.usuario_id) {
      await supabase
        .from('usuario')
        .delete()
        .eq('id', alumno.usuario_id);
    }

    // Eliminar relaciones con representantes
    await supabase
      .from('alumnorepresentante')
      .delete()
      .eq('id_alumno', id);

    // Eliminar relaciones con evaluaciones
    await supabase
      .from('alumnoevaluacion')
      .delete()
      .eq('id_alumno', id);

    // Eliminar pagos del alumno
    await supabase
      .from('pagos')
      .delete()
      .eq('id_alumno', id);

    // Eliminar el alumno permanentemente
    await supabase
      .from('alumno')
      .delete()
      .eq('id', id);

    await registrarLog({
      usuario_id: req.user.id,
      accion: LogActions.ELIMINAR,
      modulo: LogModules.ALUMNOS,
      descripcion: `Alumno eliminado PERMANENTEMENTE - ID: ${id}, Nombre: ${alumno.nombre}, Cédula: ${alumno.cedula}`,
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
    const { data: senseis, error: senseisError } = await supabase
      .from('usuario')
      .select('id, nombre_completo, username')
      .eq('rol', 'instructor')
      .eq('estado', 1)
      .order('nombre_completo', { ascending: true });

    if (senseisError) {
      throw senseisError;
    }

    res.json(senseis || []);
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

    
    const { data: sensei, error: senseiError } = await supabase
      .from('usuario')
      .select('id')
      .eq('id', sensei_id)
      .eq('rol', 'instructor')
      .eq('estado', 1)
      .single();

    if (senseiError || !sensei) {
      return res.status(400).json({ error: 'Sensei no encontrado o no válido' });
    }

    const { error: updateError } = await supabase
      .from('alumno')
      .update({ sensei_id: sensei_id })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    res.json({ message: 'Sensei actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando sensei:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
