import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../utils/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import { unlockAccount } from '../utils/unlockCodeService.js';

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
    const { data: usuarios, error } = await supabase
      .from('usuario')
      .select('id, username, email, nombre_completo, rol, estado, ultimo_acceso, fecha_creacion, idioma_preferido')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error obteniendo usuarios:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    // Mapear estado a activo y fecha_creacion a created_at para compatibilidad
    const usuariosFormateados = usuarios.map(u => ({
      ...u,
      activo: u.estado,
      created_at: u.fecha_creacion
    }));

    res.json(usuariosFormateados);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener instructores disponibles
router.get('/instructores', async (req, res) => {
  try {
    const { data: instructores, error } = await supabase
      .from('usuario')
      .select('id, username, nombre_completo')
      .eq('rol', 'instructor')
      .eq('estado', 1)
      .order('nombre_completo', { ascending: true });

    if (error) {
      console.error('Error obteniendo instructores:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json(instructores || []);
  } catch (error) {
    console.error('Error obteniendo instructores:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
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

    // Verificar si el usuario ya existe (verificar username y email por separado)
    const { data: existingUserByUsername, error: checkUsernameError } = await supabase
      .from('usuario')
      .select('id')
      .eq('username', username)
      .limit(1);

    const { data: existingUserByEmail, error: checkEmailError } = await supabase
      .from('usuario')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (checkUsernameError || checkEmailError) {
      console.error('Error verificando usuario existente:', checkUsernameError || checkEmailError);
      return res.status(500).json({ error: 'Error interno del servidor', details: (checkUsernameError || checkEmailError).message });
    }

    if ((existingUserByUsername && existingUserByUsername.length > 0) || 
        (existingUserByEmail && existingUserByEmail.length > 0)) {
      return res.status(400).json({ error: 'El usuario o email ya existe' });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertError } = await supabase
      .from('usuario')
      .insert([{
        username,
        email,
        password_hash: hashedPassword,
        nombre_completo,
        rol
      }])
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creando usuario:', insertError);
      return res.status(500).json({ error: 'Error interno del servidor', details: insertError.message });
    }

    res.status(201).json({ 
      id: newUser.id, 
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
    const { data: usuario, error: fetchError } = await supabase
      .from('usuario')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (fetchError || !usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(password_nueva, 10);

    // Actualizar contraseña
    const { error: updateError } = await supabase
      .from('usuario')
      .update({ password_hash: hashedPassword })
      .eq('id', userId);

    if (updateError) {
      console.error('Error actualizando contraseña:', updateError);
      return res.status(500).json({ error: 'Error interno del servidor', details: updateError.message });
    }

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
    const { error } = await supabase
      .from('usuario')
      .update({ idioma_preferido })
      .eq('id', userId);

    if (error) {
      console.error('Error cambiando idioma:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

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
    // Usamos una condición que siempre sea verdadera para actualizar todos los registros
    // .neq('id', -999999) es una condición que siempre será verdadera para IDs válidos (nunca habrá un ID -999999)
    const { data, error } = await supabase
      .from('usuario')
      .update({ idioma_preferido })
      .neq('id', -999999) // Condición que siempre es verdadera para IDs válidos
      .select('id');

    if (error) {
      console.error('Error cambiando idioma globalmente:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json({ 
      message: 'Idioma actualizado globalmente para todos los usuarios',
      idioma_preferido,
      usuarios_actualizados: data ? data.length : 0
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

    const { error } = await supabase
      .from('usuario')
      .update({
        nombre_completo,
        rol,
        estado: activo
      })
      .eq('id', id);

    if (error) {
      console.error('Error actualizando usuario:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
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
    
    const { data: newLog, error } = await supabase
      .from('log_actividades')
      .insert([{
        usuario_id,
        accion,
        modulo,
        descripcion,
        ip_address,
        user_agent
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error registrando log:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json({ 
      message: 'Log registrado exitosamente', 
      id: newLog.id 
    });
  } catch (error) {
    console.error('Error registrando log:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Obtener logs de actividad
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    
    // Obtener logs
    const { data: logs, error: logsError } = await supabase
      .from('log_actividades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (logsError) {
      console.error('Error obteniendo logs:', logsError);
      return res.status(500).json({ error: 'Error interno del servidor', details: logsError.message });
    }

    if (!logs || logs.length === 0) {
      return res.json([]);
    }

    // Obtener información de usuarios relacionados
    const usuarioIds = [...new Set(logs.map(log => log.usuario_id).filter(Boolean))];
    let usuariosMap = {};
    
    if (usuarioIds.length > 0) {
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuario')
        .select('id, username, nombre_completo')
        .in('id', usuarioIds);

      if (!usuariosError && usuarios) {
        usuarios.forEach(u => {
          usuariosMap[u.id] = {
            username: u.username,
            nombre_completo: u.nombre_completo
          };
        });
      }
    }

    // Formatear respuesta para compatibilidad
    const logsFormateados = logs.map(log => ({
      ...log,
      username: log.usuario_id ? (usuariosMap[log.usuario_id]?.username || null) : null,
      nombre_completo: log.usuario_id ? (usuariosMap[log.usuario_id]?.nombre_completo || null) : null
    }));

    res.json(logsFormateados);
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Limpiar logs antiguos
router.delete('/logs/cleanup', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 90;
    
    // Calcular fecha límite
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - days);
    
    // Obtener logs a eliminar primero para contar
    const { data: logsToDelete, error: fetchError } = await supabase
      .from('log_actividades')
      .select('id')
      .lt('created_at', fechaLimite.toISOString());

    if (fetchError) {
      console.error('Error obteniendo logs a eliminar:', fetchError);
      return res.status(500).json({ error: 'Error interno del servidor', details: fetchError.message });
    }

    const deletedCount = logsToDelete ? logsToDelete.length : 0;

    if (deletedCount > 0) {
      const idsToDelete = logsToDelete.map(log => log.id);
      const { error: deleteError } = await supabase
        .from('log_actividades')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('Error eliminando logs:', deleteError);
        return res.status(500).json({ error: 'Error interno del servidor', details: deleteError.message });
      }
    }
    
    res.json({ 
      message: `Se eliminaron ${deletedCount} logs anteriores a ${days} días`,
      deletedCount
    });
  } catch (error) {
    console.error('Error limpiando logs:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Desbloquear cuenta de usuario (solo admin)
router.post('/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Verificar que el usuario que hace la petición es admin
    const requestingUser = req.user;
    if (!requestingUser || requestingUser.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden desbloquear cuentas' });
    }

    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabase
      .from('usuario')
      .select('id, username, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Desbloquear la cuenta
    await unlockAccount(userId);

    res.json({
      message: `Cuenta de ${user.username} (${user.email}) desbloqueada exitosamente`,
      success: true
    });
  } catch (error) {
    console.error('Error desbloqueando cuenta:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Desbloquear cuenta por email (solo admin)
router.post('/unlock-by-email', [
  body('email').notEmpty().withMessage('Email es requerido')
    .isEmail().withMessage('Email debe ser válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verificar que el usuario que hace la petición es admin
    const requestingUser = req.user;
    if (!requestingUser || requestingUser.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden desbloquear cuentas' });
    }

    const { email } = req.body;

    // Buscar usuario por email
    const { data: user, error: userError } = await supabase
      .from('usuario')
      .select('id, username, email')
      .eq('email', email)
      .limit(1)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Desbloquear la cuenta
    await unlockAccount(user.id);

    res.json({
      message: `Cuenta de ${user.username} (${user.email}) desbloqueada exitosamente`,
      success: true
    });
  } catch (error) {
    console.error('Error desbloqueando cuenta:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

export default router;

