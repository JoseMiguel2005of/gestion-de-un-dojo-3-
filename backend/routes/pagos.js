import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

router.use(authenticateToken);

// Obtener configuración de pagos
router.get('/config', async (req, res) => {
  try {
    const { data: config, error } = await supabase
      .from('config_pagos')
      .select('*')
      .eq('id', 1)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error obteniendo configuración de pagos:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json(config || {});
  } catch (error) {
    console.error('Error obteniendo configuración de pagos:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Debug endpoint para verificar datos (sin autenticación temporalmente)
router.get('/debug/alumno/:alumnoId', async (req, res) => {
  try {
    const { alumnoId } = req.params;
    console.log('🔍 DEBUG: Verificando alumno ID:', alumnoId);
    
    // 1. Verificar si el alumno existe
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('*')
      .eq('id', alumnoId)
      .single();
    
    console.log('🔍 DEBUG: Alumno encontrado:', alumno ? 'SÍ' : 'NO');
    if (alumno) {
      console.log('🔍 DEBUG: Datos del alumno:', alumno);
    }
    
    // 2. Verificar categorías
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_edad')
      .select('*');
    
    console.log('🔍 DEBUG: Categorías disponibles:', categorias?.length || 0);
    
    // 3. Verificar join - obtener alumno con categoría
    let joinResult = null;
    if (alumno && alumno.id_categoria_edad) {
      const { data: categoria, error: categoriaError } = await supabase
        .from('categorias_edad')
        .select('*')
        .eq('id', alumno.id_categoria_edad)
        .single();
      
      if (categoria) {
        joinResult = {
          alumno_id: alumno.id,
          nombre: alumno.nombre,
          fecha_nacimiento: alumno.fecha_nacimiento,
          id_categoria_edad: alumno.id_categoria_edad,
          categoria_nombre: categoria.nombre,
          precio_categoria: categoria.precio_mensualidad
        };
      }
    }
    
    console.log('🔍 DEBUG: Resultado del JOIN:', joinResult);
    
    res.json({
      alumnoId,
      alumno: alumno || null,
      categorias: categorias || [],
      joinResult: joinResult
    });
  } catch (error) {
    console.error('🔍 DEBUG ERROR:', error);
    res.status(500).json({ 
      error: 'Error en debug', 
      message: error.message,
      stack: error.stack 
    });
  }
});

// Obtener precio calculado para un alumno específico
router.get('/precio/:alumnoId', async (req, res) => {
  try {
    const { alumnoId } = req.params;
    
    // Obtener información del alumno
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('*')
      .eq('id', alumnoId)
      .eq('estado', 1)
      .single();

    if (alumnoError || !alumno) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    // Obtener categoría del alumno
    let categoria = null;
    if (alumno.id_categoria_edad) {
      const { data: catData, error: catError } = await supabase
        .from('categorias_edad')
        .select('*')
        .eq('id', alumno.id_categoria_edad)
        .single();
      
      if (!catError && catData) {
        categoria = catData;
      }
    }

    const alumnoData = {
      alumno_id: alumno.id,
      nombre: alumno.nombre,
      fecha_nacimiento: alumno.fecha_nacimiento,
      categoria_nombre: categoria?.nombre || null,
      precio_categoria: categoria?.precio_mensualidad || null
    };
    
    // Calcular edad
    const fechaNacimiento = new Date(alumnoData.fecha_nacimiento);
    const hoy = new Date();
    const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    
    // Verificar si el alumno ya tiene pagos registrados (es nuevo o no)
    const { count: totalPagos, error: pagosError } = await supabase
      .from('pagos')
      .select('*', { count: 'exact', head: true })
      .eq('id_alumno', alumnoId);
    
    const esAlumnoNuevo = (totalPagos || 0) === 0;
    
    // Usar precio de la categoría como precio base
    const precioBase = Math.round((alumnoData.precio_categoria || 50) * 100) / 100; // Redondear a 2 decimales
    
    // Si es alumno nuevo, agregar $15 de inscripción
    const costoInscripcion = esAlumnoNuevo ? 15 : 0;
    const precioFinal = Math.round((precioBase + costoInscripcion) * 100) / 100; // Redondear a 2 decimales

    res.json({
      alumno_id: alumnoData.alumno_id,
      nombre: alumnoData.nombre,
      edad: edad,
      categoria_nombre: alumnoData.categoria_nombre,
      precio_categoria: alumnoData.precio_categoria,
      precio_personalizado: null,
      descuento_porcentaje: 0,
      es_alumno_nuevo: esAlumnoNuevo,
      costo_inscripcion: costoInscripcion,
      precio_base: precioBase,
      precio_final: precioFinal
    });
  } catch (error) {
    console.error('Error obteniendo precio del alumno:', error);
    console.error('Detalles del error:', {
      message: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage,
      errno: error.errno,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
  }
});

// Obtener todos los precios (resumen)
router.get('/precios', async (req, res) => {
  try {
    // Obtener todos los alumnos activos
    const { data: alumnos, error: alumnosError } = await supabase
      .from('alumno')
      .select('*')
      .eq('estado', 1)
      .order('nombre', { ascending: true });

    if (alumnosError) {
      throw alumnosError;
    }

    // Obtener todas las categorías
    const { data: categorias, error: categoriasError } = await supabase
      .from('categorias_edad')
      .select('*');

    if (categoriasError) {
      throw categoriasError;
    }

    // Crear mapa de categorías
    const categoriasMap = {};
    categorias.forEach(cat => {
      categoriasMap[cat.id] = cat;
    });

    // Calcular edad y combinar datos
    const hoy = new Date();
    const precios = alumnos.map(alumno => {
      const fechaNacimiento = new Date(alumno.fecha_nacimiento);
      const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const categoria = categoriasMap[alumno.id_categoria_edad] || null;

      return {
        alumno_id: alumno.id,
        nombre: alumno.nombre,
        edad: edad,
        categoria_nombre: categoria?.nombre || null,
        precio_final: categoria?.precio_mensualidad || null,
        estado: alumno.estado
      };
    });

    // Ordenar por categoría y nombre
    precios.sort((a, b) => {
      if (a.categoria_nombre !== b.categoria_nombre) {
        return (a.categoria_nombre || '').localeCompare(b.categoria_nombre || '');
      }
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

    res.json(precios);
  } catch (error) {
    console.error('Error obteniendo precios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar precio personalizado de un alumno (ya no se usa, pero mantenemos para compatibilidad)
router.put('/precio-personalizado/:alumnoId', async (req, res) => {
  try {
    const { alumnoId } = req.params;
    
    // Obtener el alumno
    const { data: alumno, error: alumnoError } = await supabase
      .from('alumno')
      .select('id_categoria_edad')
      .eq('id', alumnoId)
      .single();

    if (alumnoError || !alumno) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    // Obtener el precio de la categoría
    let precioFinal = 0;
    if (alumno.id_categoria_edad) {
      const { data: categoria, error: categoriaError } = await supabase
        .from('categorias_edad')
        .select('precio_mensualidad')
        .eq('id', alumno.id_categoria_edad)
        .single();
      
      if (!categoriaError && categoria) {
        precioFinal = categoria.precio_mensualidad || 0;
      }
    }

    res.json({ 
      message: 'Los precios se basan en la categoría del alumno',
      precio_final: precioFinal
    });
  } catch (error) {
    console.error('Error obteniendo precio del alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar configuración de pagos
router.put('/config', async (req, res) => {
  try {
    const { 
      dia_corte, 
      descuento_pago_adelantado,
      moneda,
      metodos_pago,
      datos_bancarios,
      idioma_sistema,
      pais_configuracion,
      tipo_cambio_usd_bs
    } = req.body;

    // Construir objeto de actualización dinámicamente
    const updateData = {};
    
    if (dia_corte !== undefined) updateData.dia_corte = dia_corte;
    if (descuento_pago_adelantado !== undefined) updateData.descuento_pago_adelantado = descuento_pago_adelantado;
    if (moneda !== undefined) updateData.moneda = moneda;
    if (metodos_pago !== undefined) updateData.metodos_pago = typeof metodos_pago === 'string' ? metodos_pago : JSON.stringify(metodos_pago);
    if (datos_bancarios !== undefined) updateData.datos_bancarios = datos_bancarios;
    if (idioma_sistema !== undefined) updateData.idioma_sistema = idioma_sistema;
    if (pais_configuracion !== undefined) updateData.pais_configuracion = pais_configuracion;
    if (tipo_cambio_usd_bs !== undefined) updateData.tipo_cambio_usd_bs = tipo_cambio_usd_bs;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    // Verificar si existe el registro con id = 1
    const { data: existingConfig, error: checkError } = await supabase
      .from('config_pagos')
      .select('id')
      .eq('id', 1)
      .single();

    let result;
    if (checkError && checkError.code === 'PGRST116') {
      // No existe, crear uno nuevo
      result = await supabase
        .from('config_pagos')
        .insert([{ id: 1, ...updateData }])
        .select()
        .single();
    } else {
      // Existe, actualizar
      result = await supabase
        .from('config_pagos')
        .update(updateData)
        .eq('id', 1)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error actualizando configuración de pagos:', result.error);
      return res.status(500).json({ error: 'Error interno del servidor', details: result.error.message });
    }

    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando configuración de pagos:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Registrar pago
router.post('/', [
  body('monto').isFloat({ min: 0 }),
  body('metodo_pago').notEmpty(),
  body('fecha_pago').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      monto, 
      metodo_pago, 
      fecha_pago, 
      mes_correspondiente,
      estado,
      referencia,
      banco_origen,
      cedula_titular,
      telefono_cuenta,
      id_alumno,
      comprobante, 
      observaciones 
    } = req.body;
    
    console.log(`[Backend] ========== DATOS RECIBIDOS ==========`);
    console.log(`[Backend] fecha_pago: "${fecha_pago}"`);
    console.log(`[Backend] mes_correspondiente: "${mes_correspondiente}"`);
    console.log(`[Backend] observaciones: "${observaciones}"`);
    console.log(`[Backend] Body completo:`, JSON.stringify(req.body, null, 2));
    
    const registrado_por = req.user.id;

    // Si no se proporciona id_alumno, obtenerlo del usuario logueado
    let alumnoId = id_alumno;
    if (!alumnoId && req.user.rol === 'usuario') {
      const { data: alumnos, error: alumnosError } = await supabase
        .from('alumno')
        .select('id')
        .eq('usuario_id', req.user.id)
        .limit(1);
      
      if (!alumnosError && alumnos && alumnos.length > 0) {
        alumnoId = alumnos[0].id;
      }
    }

    if (!alumnoId) {
      return res.status(400).json({ error: 'No se pudo determinar el alumno asociado' });
    }

    // Determinar mes y año según el tipo de pago
    let mes, anio;
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    
    // PRIMERO: Verificar si mes_correspondiente indica un mes futuro (esto es más confiable)
    let esPagoAdelantado = false;
    let mesCorrespondienteIndex = -1;
    let anioCorrespondiente = anioActual;
    
    if (mes_correspondiente) {
      // Intentar extraer el mes del mes_correspondiente
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const mesesEn = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      
      const mesCorrespondienteLower = mes_correspondiente.toLowerCase();
      
      // Buscar en español
      meses.forEach((mesStr, index) => {
        if (mesCorrespondienteLower.includes(mesStr)) {
          mesCorrespondienteIndex = index + 1;
        }
      });
      
      // Buscar en inglés
      if (mesCorrespondienteIndex === -1) {
        mesesEn.forEach((mesStr, index) => {
          if (mesCorrespondienteLower.includes(mesStr)) {
            mesCorrespondienteIndex = index + 1;
          }
        });
      }
      
      // Extraer año del mes_correspondiente
      const añoMatch = mes_correspondiente.match(/\d{4}/);
      anioCorrespondiente = añoMatch ? parseInt(añoMatch[0]) : anioActual;
      
      // Si el mes correspondiente es mayor que el mes actual (o el año es mayor), es un pago adelantado
      if (mesCorrespondienteIndex !== -1) {
        const esMesFuturo = (anioCorrespondiente > anioActual) || 
                           (anioCorrespondiente === anioActual && mesCorrespondienteIndex > mesActual);
        
        if (esMesFuturo) {
          esPagoAdelantado = true;
          console.log(`[Debug] ✅ Pago adelantado detectado por mes_correspondiente: ${mes_correspondiente}`);
          console.log(`[Debug] Comparación: mes correspondiente ${mesCorrespondienteIndex}/${anioCorrespondiente} vs actual ${mesActual}/${anioActual}`);
        } else {
          console.log(`[Debug] ❌ mes_correspondiente NO es futuro: ${mesCorrespondienteIndex}/${anioCorrespondiente} <= ${mesActual}/${anioActual}`);
        }
      } else {
        console.log(`[Debug] ⚠️ No se pudo extraer el mes de mes_correspondiente: "${mes_correspondiente}"`);
      }
    }
    
    // SEGUNDO: Si no se detectó por mes_correspondiente, verificar observaciones
    if (!esPagoAdelantado && observaciones) {
      esPagoAdelantado = (
        observaciones.includes('Pago adelantado') || 
        observaciones.includes('Advanced payment') ||
        observaciones.includes('Pago adelantado -') ||
        observaciones.includes('Advanced payment -')
      );
      if (esPagoAdelantado) {
        console.log(`[Debug] Pago adelantado detectado por observaciones: "${observaciones}"`);
      }
    }
    
    console.log(`[Debug] Observaciones recibidas: "${observaciones}"`);
    console.log(`[Debug] mes_correspondiente recibido: "${mes_correspondiente}"`);
    console.log(`[Debug] fecha_pago recibida: "${fecha_pago}"`);
    console.log(`[Debug] Es pago adelantado (final): ${esPagoAdelantado}`);
    console.log(`[Debug] Mes correspondiente extraído: ${mesCorrespondienteIndex}/${anioCorrespondiente}, Mes actual: ${mesActual}/${anioActual}`);
    
    if (esPagoAdelantado) {
      // Validar que el usuario ya pagó el mes actual antes de permitir pago adelantado
      const { data: pagoMesActual, error: pagoError } = await supabase
        .from('pagos')
        .select('id, estado')
        .eq('id_alumno', alumnoId)
        .eq('mes', mesActual)
        .eq('anio', anioActual)
        .limit(1);
      
      if (!pagoMesActual || pagoMesActual.length === 0 || pagoMesActual[0].estado !== 'confirmado') {
        return res.status(400).json({ 
          error: `No se puede realizar un pago adelantado. Debe pagar primero el mes actual (${mesActual}/${anioActual}) y que esté confirmado.` 
        });
      }
      
      // Para pagos adelantados, usar el mes siguiente (manejar correctamente el cambio de año)
      const hoy = new Date();
      const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
      mes = proximoMes.getMonth() + 1;
      anio = proximoMes.getFullYear();
      
      console.log(`[Pago Adelantado] Mes actual: ${mesActual}/${anioActual}, Mes objetivo: ${mes}/${anio}`);
      console.log(`[Pago Adelantado] Fecha de pago recibida: ${fecha_pago}, pero usando mes siguiente: ${mes}/${anio}`);
    } else {
      // Para pagos normales, primero intentar usar mes_correspondiente si está disponible y es diferente a la fecha
      if (mesCorrespondienteIndex !== -1) {
        const fecha = new Date(fecha_pago);
        const mesFechaPago = fecha.getMonth() + 1;
        const anioFechaPago = fecha.getFullYear();
        
        // Si el mes_correspondiente es diferente al de la fecha de pago, usar el mes_correspondiente
        if (mesCorrespondienteIndex !== mesFechaPago || anioCorrespondiente !== anioFechaPago) {
          const esMesFuturo = (anioCorrespondiente > anioActual) || 
                             (anioCorrespondiente === anioActual && mesCorrespondienteIndex > mesActual);
          
          if (esMesFuturo) {
            // Es un pago adelantado
            console.log(`[Pago Normal→Adelantado] ⚠️ mes_correspondiente (${mesCorrespondienteIndex}/${anioCorrespondiente}) es diferente y futuro que fecha_pago (${mesFechaPago}/${anioFechaPago}). Usando mes_correspondiente.`);
            esPagoAdelantado = true;
            mes = mesCorrespondienteIndex;
            anio = anioCorrespondiente;
            
            // Validar que el usuario ya pagó el mes actual
            const { data: pagoMesActual, error: pagoError } = await supabase
              .from('pagos')
              .select('id, estado')
              .eq('id_alumno', alumnoId)
              .eq('mes', mesActual)
              .eq('anio', anioActual)
              .limit(1);
            
            if (!pagoMesActual || pagoMesActual.length === 0 || pagoMesActual[0].estado !== 'confirmado') {
              return res.status(400).json({ 
                error: `No se puede realizar un pago adelantado. Debe pagar primero el mes actual (${mesActual}/${anioActual}) y que esté confirmado.` 
              });
            }
          } else {
            // Usar el mes de la fecha de pago
            mes = mesFechaPago;
            anio = anioFechaPago;
            console.log(`[Pago Normal] Usando mes de fecha_pago: ${fecha_pago} -> ${mes}/${anio}`);
          }
        } else {
          // Son iguales, usar el de la fecha
          mes = mesFechaPago;
          anio = anioFechaPago;
          console.log(`[Pago Normal] mes_correspondiente coincide con fecha_pago: ${mes}/${anio}`);
        }
      } else {
        // No hay mes_correspondiente válido, usar el mes de la fecha de pago
        const fecha = new Date(fecha_pago);
        mes = fecha.getMonth() + 1;
        anio = fecha.getFullYear();
        console.log(`[Pago Normal] Usando mes de fecha_pago (sin mes_correspondiente válido): ${fecha_pago} -> ${mes}/${anio}`);
      }
    }
    
    console.log(`[Resultado Final] Mes determinado: ${mes}, Año: ${anio}, Es adelantado: ${esPagoAdelantado}`);

    // Verificar si ya existe un pago para el mes correspondiente
    const { data: pagoExistente, error: pagoExistenteError } = await supabase
      .from('pagos')
      .select('id, estado, observaciones')
      .eq('id_alumno', alumnoId)
      .eq('mes', mes)
      .eq('anio', anio)
      .limit(1);

    if (pagoExistente && pagoExistente.length > 0) {
      const pago = pagoExistente[0];
      const esPagoAdelantadoExistente = pago.observaciones && pago.observaciones.includes('Pago adelantado');
      
      console.log(`[Validación] Pago existente encontrado: mes=${mes}, año=${anio}, estado=${pago.estado}, esAdelantado=${esPagoAdelantadoExistente}`);
      
      if (esPagoAdelantado && esPagoAdelantadoExistente) {
        // Si ambos son pagos adelantados y ya existe uno confirmado
        if (pago.estado === 'confirmado') {
          return res.status(400).json({ 
            error: `Ya existe un pago adelantado CONFIRMADO para el mes ${mes}/${anio}. No se puede registrar otro pago para ese mes.` 
          });
        } else {
          // Si existe uno pendiente, permitir actualizarlo o informar
          return res.status(400).json({ 
            error: `Ya existe un pago adelantado PENDIENTE para el mes ${mes}/${anio}. Contacta al administrador para actualizarlo o espera su confirmación.` 
          });
        }
      } else if (esPagoAdelantado && !esPagoAdelantadoExistente) {
        // Intentando hacer un pago adelantado pero ya existe un pago normal para ese mes
        return res.status(400).json({ 
          error: `Ya existe un pago registrado para el mes ${mes}/${anio}. No se puede registrar un pago adelantado para un mes que ya tiene un pago.` 
        });
      } else {
        // Pago normal cuando ya existe otro pago
        return res.status(400).json({ 
          error: `Ya existe un pago registrado para el mes ${mes}/${anio}. Si es un pago adelantado, contacta al administrador.` 
        });
      }
    }

    const pagoData = {
      id_alumno: alumnoId,
      mes: mes,
      anio: anio,
      monto: monto,
      metodo_pago: metodo_pago,
      fecha_pago: fecha_pago,
      mes_correspondiente: mes_correspondiente || new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      estado: estado || 'pendiente',
      referencia: referencia || null,
      banco_origen: banco_origen || null,
      cedula_titular: cedula_titular || null,
      telefono_cuenta: telefono_cuenta || null,
      comprobante: comprobante || null,
      observaciones: observaciones || null,
      registrado_por: registrado_por
    };

    const { data: result, error: insertError } = await supabase
      .from('pagos')
      .insert([pagoData])
      .select()
      .single();

    if (insertError) {
      console.error('Error insertando pago:', insertError);
      return res.status(500).json({ error: 'Error interno del servidor: ' + insertError.message });
    }

    res.status(201).json({ 
      id: result.id, 
      message: 'Pago registrado exitosamente. Pendiente de verificación.' 
    });
  } catch (error) {
    console.error('Error registrando pago:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Obtener pagos de un alumno
router.get('/alumno/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener pagos del alumno
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos')
      .select('*')
      .eq('id_alumno', id)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false });

    if (pagosError) {
      throw pagosError;
    }

    // Obtener información de usuarios que registraron los pagos
    const userIds = [...new Set(pagos.map(p => p.registrado_por).filter(Boolean))];
    const usuariosMap = {};
    
    if (userIds.length > 0) {
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuario')
        .select('id, nombre_completo')
        .in('id', userIds);
      
      if (!usuariosError && usuarios) {
        usuarios.forEach(u => {
          usuariosMap[u.id] = u.nombre_completo;
        });
      }
    }

    // Combinar datos
    const pagosConUsuario = pagos.map(pago => ({
      ...pago,
      registrado_por_nombre: usuariosMap[pago.registrado_por] || null
    }));
    
    res.json(pagosConUsuario);
  } catch (error) {
    console.error('Error obteniendo pagos del alumno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los pagos con filtros
router.get('/', async (req, res) => {
  try {
    const { mes, anio, limit = 100 } = req.query;
    const userRole = req.user?.rol || 'usuario';
    const userId = req.user?.id;
    
    // Obtener pagos con relaciones
    let pagosQuery = supabase
      .from('pagos')
      .select(`
        *,
        alumno:id_alumno(nombre, usuario_id),
        usuario:registrado_por(nombre_completo)
      `)
      .order('fecha_pago', { ascending: false })
      .limit(parseInt(limit));

    // Aplicar filtros
    if (mes) {
      pagosQuery = pagosQuery.eq('mes', parseInt(mes));
    }
    if (anio) {
      pagosQuery = pagosQuery.eq('anio', parseInt(anio));
    }

    const { data: pagos, error: pagosError } = await pagosQuery;

    if (pagosError) {
      console.error('Error obteniendo pagos:', pagosError);
      return res.status(500).json({ error: 'Error interno del servidor', details: pagosError.message });
    }

    if (!pagos || pagos.length === 0) {
      return res.json([]);
    }

    // Filtrar por usuario si es necesario y combinar datos
    let pagosFiltrados = pagos;
    if (userRole === 'usuario' && userId) {
      pagosFiltrados = pagos.filter(p => {
        const alumno = Array.isArray(p.alumno) ? p.alumno[0] : p.alumno;
        return alumno?.usuario_id === userId;
      });
    }

    // Formatear respuesta
    const pagosFormateados = pagosFiltrados.map(pago => {
      const alumno = Array.isArray(pago.alumno) ? pago.alumno[0] : pago.alumno;
      const usuario = Array.isArray(pago.usuario) ? pago.usuario[0] : pago.usuario;

      return {
        ...pago,
        alumno_nombre: alumno?.nombre || null,
        registrado_por_nombre: usuario?.nombre_completo || null
      };
    });

    res.json(pagosFormateados);
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    console.error('Detalles del error:', error.message);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener alumnos con pagos pendientes
router.get('/pendientes', async (req, res) => {
  try {
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();

    // Obtener todos los alumnos activos
    const { data: alumnos, error: alumnosError } = await supabase
      .from('alumno')
      .select('id, nombre, apellido, cedula')
      .eq('estado', 1)
      .order('nombre', { ascending: true });

    if (alumnosError) {
      throw alumnosError;
    }

    // Obtener todos los pagos del mes actual
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos')
      .select('id_alumno')
      .eq('mes', mesActual)
      .eq('anio', anioActual);

    if (pagosError) {
      throw pagosError;
    }

    // Crear set de IDs de alumnos que ya pagaron
    const alumnosConPago = new Set(pagos.map(p => p.id_alumno));

    // Filtrar alumnos que no tienen pago
    const alumnosPendientes = alumnos.filter(alumno => !alumnosConPago.has(alumno.id));

    res.json(alumnosPendientes);
  } catch (error) {
    console.error('Error obteniendo alumnos con pagos pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

