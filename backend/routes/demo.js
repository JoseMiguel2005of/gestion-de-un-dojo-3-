import express from 'express';
import { executeQuery } from '../config/database.js';
import { authenticateToken as auth } from '../middleware/auth.js';

const router = express.Router();

// Endpoint de prueba simple
router.get('/test', auth, async (req, res) => {
  try {
    console.log('Endpoint de prueba llamado');
    console.log('Usuario:', req.user);
    res.json({ 
      message: 'Endpoint funcionando', 
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en endpoint de prueba:', error);
    res.status(500).json({ error: 'Error en endpoint de prueba' });
  }
});

// Endpoint para verificar categorías disponibles
router.get('/check-categories', auth, async (req, res) => {
  try {
    console.log('=== VERIFICANDO CATEGORÍAS ===');
    
    if (!req.user || req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Obtener todas las categorías de edad
    const categoriasEdad = await executeQuery('SELECT * FROM categorias_edad ORDER BY id');
    console.log('Categorías de edad encontradas:', categoriasEdad);

    // Obtener todas las cintas
    const cintas = await executeQuery('SELECT * FROM cintas ORDER BY orden');
    console.log('Cintas encontradas:', cintas);

    res.json({ 
      message: 'Categorías y cintas obtenidas', 
      categorias_edad: categoriasEdad,
      cintas: cintas
    });

  } catch (error) {
    console.error('=== ERROR VERIFICANDO CATEGORÍAS ===');
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Error verificando categorías: ' + error.message });
  }
});

// Endpoint de prueba para generar solo un horario
router.post('/test-simple', auth, async (req, res) => {
  try {
    console.log('=== PRUEBA SIMPLE ===');
    console.log('Usuario:', req.user);
    
    if (!req.user || req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Probar conexión a la base de datos
    console.log('Probando conexión...');
    const testQuery = await executeQuery('SELECT 1 as test');
    console.log('Conexión OK:', testQuery);

    // Insertar un solo horario de prueba
    console.log('Insertando horario de prueba...');
    const result = await executeQuery(`
      INSERT INTO horarios_clases (dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor, activo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, ['Lunes', '16:00', '17:00', 1, 15, 'Sensei Prueba']);

    console.log('Horario insertado:', result);
    res.json({ 
      message: 'Prueba exitosa', 
      horario_id: result.insertId 
    });

  } catch (error) {
    console.error('=== ERROR EN PRUEBA SIMPLE ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Error en prueba simple: ' + error.message });
  }
});

// Endpoint de prueba para generar solo horarios
router.post('/test-horarios', auth, async (req, res) => {
  try {
    console.log('=== PRUEBA HORARIOS ===');
    console.log('Usuario:', req.user);
    
    if (!req.user || req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Generar solo 3 horarios de prueba
    // Usar IDs válidos de categorias_edad: 1=Benjamín, 2=Alevín, 3=Infantil, 4=Cadete, 5=Junior, 6=Senior, 7=Veterano
    const horarios = [
      { dia: 'Lunes', hora_inicio: '16:00', hora_fin: '17:00', id_categoria_edad: 6, instructor: 'Sensei María', capacidad: 15 }, // Senior
      { dia: 'Miércoles', hora_inicio: '17:00', hora_fin: '18:00', id_categoria_edad: 3, instructor: 'Sensei Carlos', capacidad: 18 }, // Infantil
      { dia: 'Viernes', hora_inicio: '18:00', hora_fin: '19:00', id_categoria_edad: 4, instructor: 'Sensei Ana', capacidad: 20 } // Cadete
    ];

    let horariosCreados = 0;
    for (const horario of horarios) {
      try {
        await executeQuery(`
          INSERT INTO horarios_clases (dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor, activo)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [horario.dia, horario.hora_inicio, horario.hora_fin, horario.id_categoria_edad, horario.capacidad, horario.instructor]);
        horariosCreados++;
        console.log(`Horario creado: ${horario.dia} ${horario.hora_inicio}-${horario.hora_fin} para categoría ${horario.id_categoria_edad}`);
      } catch (error) {
        console.error(`Error creando horario:`, error);
        throw error;
      }
    }

    res.json({ 
      message: 'Horarios creados exitosamente', 
      horarios_creados: horariosCreados 
    });

  } catch (error) {
    console.error('=== ERROR EN PRUEBA HORARIOS ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Error en prueba horarios: ' + error.message });
  }
});

// Endpoint de prueba para generar solo evaluaciones
router.post('/test-evaluaciones', auth, async (req, res) => {
  try {
    console.log('=== PRUEBA EVALUACIONES ===');
    console.log('Usuario:', req.user);
    
    if (!req.user || req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Generar solo 3 evaluaciones de prueba
    const evaluaciones = [
      { nombre: 'Examen de Cinta Blanca a Amarilla - Benjamín', fecha: '2025-02-15', descripcion: 'Evaluación técnica para ascenso de cinta blanca a amarilla en categoría Benjamín' },
      { nombre: 'Examen de Cinta Verde a Azul - Alevín', fecha: '2025-05-10', descripcion: 'Evaluación técnica para ascenso de cinta verde a azul en categoría Alevín' },
      { nombre: 'Evaluación Técnica Avanzada - Infantil', fecha: '2025-06-05', descripcion: 'Evaluación técnica avanzada para categoría Infantil' }
    ];

    let evaluacionesCreadas = 0;
    for (const evaluacion of evaluaciones) {
      try {
        await executeQuery(`
          INSERT INTO evaluacion (nombre, fecha, descripcion)
          VALUES (?, ?, ?)
        `, [evaluacion.nombre, evaluacion.fecha, evaluacion.descripcion]);
        evaluacionesCreadas++;
        console.log(`Evaluación creada: ${evaluacion.nombre}`);
      } catch (error) {
        console.error(`Error creando evaluación:`, error);
        throw error;
      }
    }

    res.json({ 
      message: 'Evaluaciones creadas exitosamente', 
      evaluaciones_creadas: evaluacionesCreadas 
    });

  } catch (error) {
    console.error('=== ERROR EN PRUEBA EVALUACIONES ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Error en prueba evaluaciones: ' + error.message });
  }
});

// Endpoint de prueba para generar solo pagos
router.post('/test-pagos', auth, async (req, res) => {
  try {
    console.log('=== PRUEBA PAGOS ===');
    console.log('Usuario:', req.user);
    
    if (!req.user || req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Obtener algunos alumnos para generar pagos
    console.log('Obteniendo alumnos...');
    const alumnos = await executeQuery('SELECT id, id_categoria_edad FROM alumno WHERE estado = 1 LIMIT 2');
    console.log(`Encontrados ${alumnos.length} alumnos para generar pagos`);

    if (alumnos.length === 0) {
      return res.json({ 
        message: 'No hay alumnos para generar pagos', 
        pagos_creados: 0 
      });
    }

    let pagosCreados = 0;
    for (const alumno of alumnos) {
      try {
        // Obtener precio de la categoría
        console.log(`Obteniendo precio para alumno ${alumno.id}, categoría ${alumno.id_categoria_edad}`);
        const categoria = await executeQuery('SELECT precio_mensualidad FROM categorias_edad WHERE id = ?', [alumno.id_categoria_edad]);
        const precio = parseFloat(categoria[0]?.precio_mensualidad) || 50.00;
        console.log(`Precio obtenido: ${precio}`);

        // Generar un pago de prueba para hace 3 meses (para evitar conflictos)
        const hoy = new Date();
        const mesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 5);
        const mes = mesPasado.getMonth() + 1;
        const anio = mesPasado.getFullYear();

        console.log(`Generando pago para mes ${mes}/${anio}`);

        // Verificar si ya existe un pago para este mes/año
        const pagoExistente = await executeQuery(
          'SELECT id FROM pagos WHERE id_alumno = ? AND mes = ? AND anio = ?',
          [alumno.id, mes, anio]
        );

        if (pagoExistente.length === 0) {
          try {
            await executeQuery(`
              INSERT INTO pagos (id_alumno, mes, anio, monto, metodo_pago, fecha_pago, mes_correspondiente, estado, referencia, banco_origen, cedula_titular, telefono_cuenta, registrado_por)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              alumno.id,
              mes,
              anio,
              precio,
              'Transferencia',
              mesPasado.toISOString().split('T')[0],
              `${mes}/${anio}`,
              'confirmado',
              `REF${alumno.id}${mes}${anio}`,
              'Banco de Venezuela',
              'V-12345678',
              '0424-1234567',
              req.user.id
            ]);

            pagosCreados++;
            console.log(`Pago creado para alumno ${alumno.id}: ${precio} para ${mes}/${anio}`);
          } catch (error) {
            console.log(`Pago ya existe para alumno ${alumno.id} en ${mes}/${anio}, saltando...`);
          }
        } else {
          console.log(`Pago ya existe para alumno ${alumno.id} en ${mes}/${anio}, saltando...`);
        }

      } catch (error) {
        console.error(`Error creando pago para alumno ${alumno.id}:`, error);
        throw error;
      }
    }

    res.json({ 
      message: 'Pagos creados exitosamente', 
      pagos_creados: pagosCreados 
    });

  } catch (error) {
    console.error('=== ERROR EN PRUEBA PAGOS ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Error en prueba pagos: ' + error.message });
  }
});

// Generar datos de demostración
router.post('/generate', auth, async (req, res) => {
  try {
    console.log('=== INICIO GENERACIÓN DEMO ===');
    console.log('Endpoint /demo/generate llamado');
    console.log('Usuario autenticado:', req.user);
    console.log('Headers:', req.headers);
    
    // Verificar que el usuario sea admin
    if (!req.user || req.user.rol !== 'admin') {
      console.log('Acceso denegado - usuario no es admin:', req.user);
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden generar datos de demostración.' });
    }

    console.log('Usuario es admin, continuando...');

    // Probar conexión a la base de datos primero
    try {
      console.log('Probando conexión a la base de datos...');
      const testQuery = await executeQuery('SELECT 1 as test');
      console.log('Conexión exitosa:', testQuery);
    } catch (error) {
      console.error('Error de conexión a la base de datos:', error);
      throw error;
    }

    console.log('Iniciando generación de horarios...');

    // 2. Generar horarios de clases por categorías de edad
    const horarios = [
      // Horarios para Benjamín (0-7 años)
      { dia: 'Lunes', hora_inicio: '16:00', hora_fin: '17:00', id_categoria_edad: 1, instructor: 'Sensei María', capacidad: 15 },
      { dia: 'Miércoles', hora_inicio: '16:00', hora_fin: '17:00', id_categoria_edad: 1, instructor: 'Sensei María', capacidad: 15 },
      { dia: 'Viernes', hora_inicio: '16:00', hora_fin: '17:00', id_categoria_edad: 1, instructor: 'Sensei María', capacidad: 15 },
      
      // Horarios para Alevín (8-9 años)
      { dia: 'Lunes', hora_inicio: '17:00', hora_fin: '18:00', id_categoria_edad: 2, instructor: 'Sensei Carlos', capacidad: 18 },
      { dia: 'Miércoles', hora_inicio: '17:00', hora_fin: '18:00', id_categoria_edad: 2, instructor: 'Sensei Carlos', capacidad: 18 },
      { dia: 'Viernes', hora_inicio: '17:00', hora_fin: '18:00', id_categoria_edad: 2, instructor: 'Sensei Carlos', capacidad: 18 },
      
      // Horarios para Infantil (10-11 años)
      { dia: 'Martes', hora_inicio: '17:00', hora_fin: '18:30', id_categoria_edad: 3, instructor: 'Sensei Ana', capacidad: 20 },
      { dia: 'Jueves', hora_inicio: '17:00', hora_fin: '18:30', id_categoria_edad: 3, instructor: 'Sensei Ana', capacidad: 20 },
      
      // Horarios para Cadete (12-13 años)
      { dia: 'Martes', hora_inicio: '18:30', hora_fin: '20:00', id_categoria_edad: 4, instructor: 'Sensei Roberto', capacidad: 22 },
      { dia: 'Jueves', hora_inicio: '18:30', hora_fin: '20:00', id_categoria_edad: 4, instructor: 'Sensei Roberto', capacidad: 22 },
      
      // Horarios para Junior (14-15 años)
      { dia: 'Lunes', hora_inicio: '19:00', hora_fin: '20:30', id_categoria_edad: 5, instructor: 'Sensei Miguel', capacidad: 25 },
      { dia: 'Miércoles', hora_inicio: '19:00', hora_fin: '20:30', id_categoria_edad: 5, instructor: 'Sensei Miguel', capacidad: 25 },
      { dia: 'Viernes', hora_inicio: '19:00', hora_fin: '20:30', id_categoria_edad: 5, instructor: 'Sensei Miguel', capacidad: 25 },
      
      // Horarios para Senior (16-34 años)
      { dia: 'Martes', hora_inicio: '20:00', hora_fin: '21:30', id_categoria_edad: 6, instructor: 'Sensei José', capacidad: 30 },
      { dia: 'Jueves', hora_inicio: '20:00', hora_fin: '21:30', id_categoria_edad: 6, instructor: 'Sensei José', capacidad: 30 },
      { dia: 'Sábado', hora_inicio: '10:00', hora_fin: '12:00', id_categoria_edad: 6, instructor: 'Sensei José', capacidad: 30 },
      
      // Horarios para Veterano (35+ años)
      { dia: 'Lunes', hora_inicio: '07:00', hora_fin: '08:30', id_categoria_edad: 7, instructor: 'Sensei Luis', capacidad: 20 },
      { dia: 'Miércoles', hora_inicio: '07:00', hora_fin: '08:30', id_categoria_edad: 7, instructor: 'Sensei Luis', capacidad: 20 },
      { dia: 'Viernes', hora_inicio: '07:00', hora_fin: '08:30', id_categoria_edad: 7, instructor: 'Sensei Luis', capacidad: 20 },
      
      // Clases mixtas
      { dia: 'Sábado', hora_inicio: '14:00', hora_fin: '16:00', id_categoria_edad: 1, instructor: 'Sensei Principal', capacidad: 35 },
    ];

    for (const horario of horarios) {
      try {
        await executeQuery(`
          INSERT INTO horarios_clases (dia_semana, hora_inicio, hora_fin, id_categoria_edad, capacidad_maxima, instructor, activo)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [horario.dia, horario.hora_inicio, horario.hora_fin, horario.id_categoria_edad, horario.capacidad, horario.instructor]);
        console.log(`Horario creado: ${horario.dia} ${horario.hora_inicio}-${horario.hora_fin} para categoría ${horario.id_categoria_edad}`);
      } catch (error) {
        console.error(`Error creando horario:`, error);
        throw error;
      }
    }

    // 3. Generar evaluaciones por categorías
    const evaluaciones = [
      // Evaluaciones para Benjamín
      { nombre: 'Examen de Cinta Blanca a Amarilla - Benjamín', fecha: '2025-02-15', descripcion: 'Evaluación técnica para ascenso de cinta blanca a amarilla en categoría Benjamín' },
      { nombre: 'Examen de Cinta Amarilla a Naranja - Benjamín', fecha: '2025-04-20', descripcion: 'Evaluación técnica para ascenso de cinta amarilla a naranja en categoría Benjamín' },
      
      // Evaluaciones para Alevín
      { nombre: 'Examen de Cinta Blanca a Amarilla - Alevín', fecha: '2025-02-22', descripcion: 'Evaluación técnica para ascenso de cinta blanca a amarilla en categoría Alevín' },
      { nombre: 'Examen de Cinta Verde a Azul - Alevín', fecha: '2025-05-10', descripcion: 'Evaluación técnica para ascenso de cinta verde a azul en categoría Alevín' },
      
      // Evaluaciones para Infantil
      { nombre: 'Examen de Cinta Verde a Azul - Infantil', fecha: '2025-03-15', descripcion: 'Evaluación técnica para ascenso de cinta verde a azul en categoría Infantil' },
      { nombre: 'Evaluación Técnica Avanzada - Infantil', fecha: '2025-06-05', descripcion: 'Evaluación técnica avanzada para categoría Infantil' },
      
      // Evaluaciones para Cadete
      { nombre: 'Examen de Cinta Azul a Marrón - Cadete', fecha: '2025-03-25', descripcion: 'Evaluación técnica para ascenso de cinta azul a marrón en categoría Cadete' },
      { nombre: 'Evaluación de Combate - Cadete', fecha: '2025-07-12', descripcion: 'Evaluación de técnicas de combate para categoría Cadete' },
      
      // Evaluaciones para Junior
      { nombre: 'Examen de Cinta Marrón a Negro - Junior', fecha: '2025-04-30', descripcion: 'Evaluación técnica para ascenso de cinta marrón a negro en categoría Junior' },
      { nombre: 'Evaluación de Kata Avanzado - Junior', fecha: '2025-08-20', descripcion: 'Evaluación de katas avanzados para categoría Junior' },
      
      // Evaluaciones para Senior
      { nombre: 'Examen de Dan 1º a 2º - Senior', fecha: '2025-05-15', descripcion: 'Evaluación para ascenso de 1º Dan a 2º Dan en categoría Senior' },
      { nombre: 'Evaluación de Instructor - Senior', fecha: '2025-09-10', descripcion: 'Evaluación para certificación de instructor en categoría Senior' },
      
      // Evaluaciones para Veterano
      { nombre: 'Evaluación de Mantenimiento - Veterano', fecha: '2025-06-20', descripcion: 'Evaluación de mantenimiento técnico para categoría Veterano' },
      { nombre: 'Evaluación de Maestría - Veterano', fecha: '2025-10-05', descripcion: 'Evaluación de técnicas de maestría para categoría Veterano' },
    ];

    console.log('Iniciando generación de evaluaciones...');
    
    for (const evaluacion of evaluaciones) {
      try {
        await executeQuery(`
          INSERT INTO evaluacion (nombre, fecha, descripcion)
          VALUES (?, ?, ?)
        `, [evaluacion.nombre, evaluacion.fecha, evaluacion.descripcion]);
        console.log(`Evaluación creada: ${evaluacion.nombre}`);
      } catch (error) {
        console.error(`Error creando evaluación:`, error);
        throw error;
      }
    }

    // 4. Generar pagos históricos para alumnos existentes
    console.log('Iniciando generación de pagos históricos...');
    const alumnos = await executeQuery('SELECT id, id_categoria_edad FROM alumno WHERE estado = 1');
    console.log(`Encontrados ${alumnos.length} alumnos para generar pagos`);
    
    for (const alumno of alumnos) {
      // Obtener precio de la categoría
      const categoria = await executeQuery('SELECT precio_mensualidad FROM categorias_edad WHERE id = ?', [alumno.id_categoria_edad]);
      const precio = parseFloat(categoria[0]?.precio_mensualidad) || 50.00;
      
      // Generar pagos de los últimos 3 meses
      const hoy = new Date();
      for (let i = 1; i <= 3; i++) {
        const fechaPago = new Date(hoy.getFullYear(), hoy.getMonth() - i, 5);
        const mes = fechaPago.getMonth() + 1;
        const anio = fechaPago.getFullYear();
        
        // Verificar si ya existe un pago para este mes/año
        const pagoExistente = await executeQuery(
          'SELECT id FROM pagos WHERE id_alumno = ? AND mes = ? AND anio = ?',
          [alumno.id, mes, anio]
        );
        
        if (pagoExistente.length === 0) {
          try {
            await executeQuery(`
              INSERT INTO pagos (id_alumno, mes, anio, monto, metodo_pago, fecha_pago, mes_correspondiente, estado, referencia, banco_origen, cedula_titular, telefono_cuenta, registrado_por)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              alumno.id,
              mes,
              anio,
              precio,
              'Transferencia',
              fechaPago.toISOString().split('T')[0],
              `${mes}/${anio}`,
              'confirmado',
              `REF${alumno.id}${mes}${anio}`,
              'Banco de Venezuela',
              'V-12345678',
              '0424-1234567',
              req.user.id
            ]);
            console.log(`Pago creado para alumno ${alumno.id}: ${precio} para ${mes}/${anio}`);
          } catch (error) {
            console.log(`Pago ya existe para alumno ${alumno.id} en ${mes}/${anio}, saltando...`);
          }
        } else {
          console.log(`Pago ya existe para alumno ${alumno.id} en ${mes}/${anio}, saltando...`);
        }
      }
    }

    // 5. Generar algunos pagos pendientes para el mes actual
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    
    // Seleccionar algunos alumnos para tener pagos pendientes
    const alumnosPendientes = alumnos.slice(0, Math.min(3, alumnos.length));
    
    for (const alumno of alumnosPendientes) {
      const categoria = await executeQuery('SELECT precio_mensualidad FROM categorias_edad WHERE id = ?', [alumno.id_categoria_edad]);
      const precio = parseFloat(categoria[0]?.precio_mensualidad) || 50.00;
      
      // Verificar si ya existe un pago para este mes/año
      const pagoExistente = await executeQuery(
        'SELECT id FROM pagos WHERE id_alumno = ? AND mes = ? AND anio = ?',
        [alumno.id, mesActual, anioActual]
      );
      
      if (pagoExistente.length === 0) {
        try {
          await executeQuery(`
            INSERT INTO pagos (id_alumno, mes, anio, monto, metodo_pago, fecha_pago, mes_correspondiente, estado, registrado_por)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            alumno.id,
            mesActual,
            anioActual,
            precio,
            'Pendiente',
            null,
            `${mesActual}/${anioActual}`,
            'pendiente',
            req.user.id
          ]);
          console.log(`Pago pendiente creado para alumno ${alumno.id}: ${precio} para ${mesActual}/${anioActual}`);
        } catch (error) {
          console.log(`Pago ya existe para alumno ${alumno.id} en ${mesActual}/${anioActual}, saltando...`);
        }
      } else {
        console.log(`Pago ya existe para alumno ${alumno.id} en ${mesActual}/${anioActual}, saltando...`);
      }
    }

    console.log('=== DATOS GENERADOS EXITOSAMENTE ===');
    console.log('Datos de demostración generados exitosamente');

    const response = {
      message: 'Datos de demostración generados exitosamente',
      datos_generados: {
        horarios: horarios.length,
        evaluaciones: evaluaciones.length,
        pagos_historicos: alumnos.length * 3,
        pagos_pendientes: alumnosPendientes.length
      }
    };

    console.log('Enviando respuesta:', response);
    res.json(response);

  } catch (error) {
    console.error('=== ERROR EN GENERACIÓN DEMO ===');
    console.error('Error generando datos de demostración:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor al generar datos de demostración' });
  }
});

// Eliminar datos de demostración
router.delete('/delete', auth, async (req, res) => {
  try {
    // Verificar que el usuario sea admin
    if (!req.user || req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden eliminar datos de demostración.' });
    }

    console.log('Eliminando datos de demostración...');

    // 1. Eliminar horarios generados (mantener solo el primero que ya existía)
    const horariosEliminados = await executeQuery(`
      DELETE FROM horarios_clases 
      WHERE id > 1 AND (
        instructor IN ('Sensei María', 'Sensei Carlos', 'Sensei Ana', 'Sensei Roberto', 'Sensei Miguel', 'Sensei José', 'Sensei Luis', 'Sensei Principal')
        OR dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado')
      )
    `);

    // 2. Eliminar evaluaciones generadas (mantener solo las que ya existían)
    const evaluacionesEliminadas = await executeQuery(`
      DELETE FROM evaluacion 
      WHERE id > 2 AND (
        nombre LIKE '%Benjamín%' OR 
        nombre LIKE '%Alevín%' OR 
        nombre LIKE '%Infantil%' OR 
        nombre LIKE '%Cadete%' OR 
        nombre LIKE '%Junior%' OR 
        nombre LIKE '%Senior%' OR 
        nombre LIKE '%Veterano%' OR
        nombre LIKE '%Examen de Cinta%' OR
        nombre LIKE '%Evaluación Técnica%' OR
        nombre LIKE '%Evaluación de Combate%' OR
        nombre LIKE '%Evaluación de Kata%' OR
        nombre LIKE '%Evaluación de Instructor%' OR
        nombre LIKE '%Evaluación de Mantenimiento%' OR
        nombre LIKE '%Evaluación de Maestría%'
      )
    `);

    // 3. Eliminar pagos generados (solo los que tienen referencias de demo)
    const pagosEliminados = await executeQuery(`
      DELETE FROM pagos 
      WHERE referencia LIKE 'REF%' 
      OR banco_origen = 'Banco de Venezuela'
      OR cedula_titular = 'V-12345678'
      OR telefono_cuenta = '0424-1234567'
    `);

    console.log('Datos de demostración eliminados exitosamente');

    res.json({
      message: 'Datos de demostración eliminados exitosamente',
      datos_eliminados: {
        horarios: horariosEliminados.affectedRows || 0,
        evaluaciones: evaluacionesEliminadas.affectedRows || 0,
        pagos: pagosEliminados.affectedRows || 0
      }
    });

  } catch (error) {
    console.error('Error eliminando datos de demostración:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar datos de demostración' });
  }
});

export default router;
