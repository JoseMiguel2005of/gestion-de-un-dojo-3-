import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Endpoint público: obtener idioma del sistema (sin autenticación)
router.get('/idioma-sistema', async (req, res) => {
  try {
    // Obtener el idioma más común en el sistema (el que usan más usuarios)
    // Primero obtener todos los usuarios con su idioma
    const { data: usuarios, error: userError } = await supabase
      .from('usuario')
      .select('idioma_preferido');
    
    if (userError) {
      console.error('Error obteniendo usuarios para idioma:', userError);
      return res.json({ idioma_sistema: 'es' });
    }
    
    // Contar cuántos usuarios usan cada idioma
    const idiomaCounts = {};
    if (usuarios) {
      usuarios.forEach(user => {
        const idioma = user.idioma_preferido || 'es';
        idiomaCounts[idioma] = (idiomaCounts[idioma] || 0) + 1;
      });
    }
    
    // Encontrar el idioma más común
    let idiomaGlobal = 'es';
    let maxCount = 0;
    for (const [idioma, count] of Object.entries(idiomaCounts)) {
      if (count > maxCount) {
        maxCount = count;
        idiomaGlobal = idioma;
      }
    }
    
    res.json({ 
      idioma_sistema: idiomaGlobal || 'es'
    });
  } catch (error) {
    console.error('Error obteniendo idioma del sistema:', error);
    res.json({ idioma_sistema: 'es' });
  }
});

// Aplicar autenticación a todas las rutas DESPUÉS del endpoint público
router.use(authenticateToken);

// Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const usuarios = await executeQuery(
      'SELECT id, username, email, nombre_completo, rol, estado as activo, ultimo_acceso, fecha_creacion as created_at, idioma_preferido FROM usuario ORDER BY fecha_creacion DESC'
    );
    res.json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener instructores disponibles
router.get('/instructores', async (req, res) => {
  try {
    const instructores = await executeQuery(
      'SELECT id, username, nombre_completo FROM usuario WHERE rol = ? AND estado = 1 ORDER BY nombre_completo ASC',
      ['instructor']
    );
    res.json(instructores);
  } catch (error) {
    console.error('Error obteniendo instructores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo usuario
router.post('/', [
  body('username').notEmpty().withMessage('El nombre de usuario es requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').isIn(['admin', 'instructor', 'recepcionista']).withMessage('Rol inválido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, nombre_completo, rol } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await executeQuery(
      'SELECT id FROM usuario WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El usuario o email ya existe' });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await executeQuery(
      'INSERT INTO usuario (username, email, password_hash, nombre_completo, rol) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, nombre_completo, rol]
    );

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Usuario creado exitosamente' 
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar contraseña
router.put('/cambiar-password', [
  body('password_actual').notEmpty().withMessage('La contraseña actual es requerida'),
  body('password_nueva').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password_actual, password_nueva } = req.body;
    const userId = req.user.id;

    // Obtener usuario actual
    const usuarios = await executeQuery(
      'SELECT password_hash FROM usuario WHERE id = ?',
      [userId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(password_actual, usuarios[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(password_nueva, 10);

    // Actualizar contraseña
    await executeQuery(
      'UPDATE usuario SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar idioma preferido del usuario
router.put('/cambiar-idioma', [
  body('idioma_preferido').isIn(['es', 'en']).withMessage('Idioma inválido (debe ser es o en)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { idioma_preferido } = req.body;
    const userId = req.user.id;

    // Actualizar idioma del usuario
    await executeQuery(
      'UPDATE usuario SET idioma_preferido = ? WHERE id = ?',
      [idioma_preferido, userId]
    );

    res.json({ 
      message: 'Idioma actualizado exitosamente',
      idioma_preferido 
    });
  } catch (error) {
    console.error('Error cambiando idioma:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar idioma globalmente para TODOS los usuarios (solo admin)
router.put('/cambiar-idioma-global', [
  body('idioma_preferido').isIn(['es', 'en']).withMessage('Idioma inválido (debe ser es o en)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que el usuario sea admin
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden cambiar el idioma globalmente' });
    }

    const { idioma_preferido } = req.body;

    // Actualizar idioma de TODOS los usuarios
    const result = await executeQuery(
      'UPDATE usuario SET idioma_preferido = ?',
      [idioma_preferido]
    );

    res.json({ 
      message: 'Idioma actualizado globalmente para todos los usuarios',
      idioma_preferido,
      usuarios_actualizados: result.affectedRows
    });
  } catch (error) {
    console.error('Error cambiando idioma globalmente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, rol, activo } = req.body;

    await executeQuery(
      'UPDATE usuario SET nombre_completo = ?, rol = ?, estado = ? WHERE id = ?',
      [nombre_completo, rol, activo, id]
    );

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener roles - Funcionalidad deshabilitada (tabla eliminada)
router.get('/roles', async (req, res) => {
  try {
    // Retornar roles hardcodeados ya que la tabla fue eliminada
    const roles = [
      { id: 1, nombre: 'admin', descripcion: 'Administrador' },
      { id: 2, nombre: 'instructor', descripcion: 'Instructor' },
      { id: 3, nombre: 'recepcionista', descripcion: 'Recepcionista' }
    ];
    res.json(roles);
  } catch (error) {
    console.error('Error obteniendo roles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Log de actividades
router.post('/log', async (req, res) => {
  try {
    const { usuario_id, accion, modulo, descripcion, ip_address, user_agent } = req.body;
    
    const result = await executeQuery(
      'INSERT INTO log_actividades (usuario_id, accion, modulo, descripcion, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [usuario_id, accion, modulo, descripcion, ip_address, user_agent]
    );
    
    res.json({ 
      message: 'Log registrado exitosamente', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error registrando log:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener logs de actividad
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    
    const query = `
      SELECT 
        la.*,
        u.username,
        u.nombre_completo
      FROM log_actividades la
      LEFT JOIN usuario u ON la.usuario_id = u.id
      ORDER BY la.created_at DESC
      LIMIT ?
    `;
    
    const logs = await executeQuery(query, [limit]);
    res.json(logs);
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Limpiar logs antiguos
router.delete('/logs/cleanup', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 90;
    
    const result = await executeQuery(
      'DELETE FROM log_actividades WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    
    res.json({ 
      message: `Se eliminaron ${result.affectedRows} logs anteriores a ${days} días`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Error limpiando logs:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;

