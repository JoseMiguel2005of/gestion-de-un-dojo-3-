import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import supabase from '../utils/supabaseClient.js';
import { generateToken } from '../middleware/auth.js';
import { registrarLog, LogActions, LogModules } from '../utils/logger.js';
import { body, validationResult } from 'express-validator';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { 
  incrementFailedAttempts, 
  resetFailedAttempts, 
  isAccountLocked, 
  verifyUnlockCode 
} from '../utils/unlockCodeService.js';

const router = express.Router();

router.post('/login', [
  body('email').notEmpty().withMessage('Email es requerido')
    .isEmail().withMessage('Email debe ser válido'),
  body('password').notEmpty().withMessage('Password es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, unlockCode } = req.body;

    console.log('🔍 Intento de login con email:', email);

    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('id, username, email, password_hash, nombre_completo, rol, estado, idioma_preferido')
      .eq('email', email)
      .eq('estado', true)
      .limit(1);

    if (userError) {
      console.error('Error consultando usuario:', userError);
      return res.status(500).json({ error: 'Error interno del servidor', details: userError.message });
    }

    if (!users || users.length === 0) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    console.log('✅ Usuario encontrado:', user.username, '| Rol:', user.rol);

    // Verificar si la cuenta está bloqueada
    const lockStatus = await isAccountLocked(user.id);
    
    if (lockStatus.locked) {
      // Si está bloqueada y se proporciona código, verificarlo
      if (unlockCode) {
        const codeVerification = await verifyUnlockCode(user.id, unlockCode);
        
        if (!codeVerification.valid) {
          return res.status(400).json({ 
            error: 'Código de desbloqueo inválido',
            locked: true,
            message: codeVerification.error 
          });
        }
        
        // Código válido - cuenta desbloqueada, continuar con login
        console.log('✅ Cuenta desbloqueada con código válido');
      } else {
        // Está bloqueada y no se proporcionó código
        return res.status(403).json({ 
          error: 'Cuenta bloqueada',
          locked: true,
          message: 'Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos. Se ha enviado un código de desbloqueo a tu correo electrónico.' 
        });
      }
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Contraseña válida:', isValidPassword);
    
    if (!isValidPassword) {
      // Incrementar intentos fallidos
      const attemptResult = await incrementFailedAttempts(user.id);
      
      if (attemptResult.blocked) {
        return res.status(403).json({ 
          error: 'Cuenta bloqueada',
          locked: true,
          message: 'Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos. Se ha enviado un código de desbloqueo a tu correo electrónico.' 
        });
      }
      
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        attempts: attemptResult.attempts,
        remaining: attemptResult.remaining,
        message: `Credenciales incorrectas. Te quedan ${attemptResult.remaining} intento(s).`
      });
    }

    // Login exitoso - resetear intentos fallidos
    await resetFailedAttempts(user.id);

    const token = generateToken(user);

    await registrarLog({
      usuario_id: user.id,
      accion: LogActions.LOGIN,
      modulo: LogModules.AUTH,
      descripcion: `Login exitoso - Usuario: ${user.username} (${user.rol})`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nombre_completo: user.nombre_completo,
        rol: user.rol,
        idioma_preferido: user.idioma_preferido || 'es'
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message || 'Error desconocido',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/register', [
  body('email').notEmpty().withMessage('Email es requerido')
    .isEmail().withMessage('Email debe ser válido'),
  body('username').notEmpty().withMessage('Username es requerido')
    .isLength({ min: 3 }).withMessage('Username debe tener al menos 3 caracteres'),
  body('password').notEmpty().withMessage('Password es requerido')
    .isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres'),
  body('nombre_completo').notEmpty().withMessage('Nombre completo es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, password, nombre_completo } = req.body;

    // Verificar si el email ya existe
    const { data: existingEmail } = await supabase
      .from('usuario')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingEmail && existingEmail.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Verificar si el username ya existe
    const { data: existingUsers } = await supabase
      .from('usuario')
      .select('id')
      .eq('username', username)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario
    const { data: newUserData, error: insertError } = await supabase
      .from('usuario')
      .insert({
        username,
        email,
        password_hash,
        nombre_completo,
        rol: 'usuario',
        estado: true,
        activo: true
      })
      .select('id, username, email, nombre_completo, rol')
      .single();

    if (insertError) {
      console.error('Error insertando usuario:', insertError);
      return res.status(500).json({ error: 'Error interno del servidor', details: insertError.message });
    }

    const newUser = {
      id: newUserData.id,
      username: newUserData.username,
      email: newUserData.email,
      nombre_completo: newUserData.nombre_completo,
      rol: newUserData.rol
    };

    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: newUser,
      message: 'Usuario registrado exitosamente'
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/forgot-password', [
  body('email').notEmpty().withMessage('Email es requerido')
    .isEmail().withMessage('Email debe ser válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Buscar usuario por email
    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('id, username, email, nombre_completo')
      .eq('email', email)
      .eq('estado', true)
      .limit(1);

    // Siempre devolver el mismo mensaje por seguridad (no revelar si el email existe)
    if (userError || !users || users.length === 0) {
      return res.json({ 
        message: 'Si el email existe, se le enviará un correo de recuperación' 
      });
    }

    const user = users[0];

    // Generar token único y seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Calcular fecha de expiración (15 minutos)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Eliminar tokens anteriores no usados del mismo usuario
    await executeQuery(
      'DELETE FROM password_reset_tokens WHERE usuario_id = ? AND used = 0',
      [user.id]
    );

    // Guardar token en la base de datos
    await executeQuery(
      'INSERT INTO password_reset_tokens (usuario_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );

    // Construir URL de reset (usar la URL del frontend)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Enviar correo
    try {
      await sendPasswordResetEmail(user.email, resetToken, resetUrl);
      console.log(`✅ Correo de recuperación enviado a: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Error enviando correo:', emailError);
      // No fallar si el correo no se puede enviar, pero loguear el error
    }

    res.json({ 
      message: 'Si el email existe, se le enviará un correo de recuperación'
    });
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token de recuperación
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Buscar token en la base de datos
    const tokens = await executeQuery(
      `SELECT prt.id, prt.usuario_id, prt.expires_at, prt.used, u.email, u.username
       FROM password_reset_tokens prt
       INNER JOIN usuario u ON prt.usuario_id = u.id
       WHERE prt.token = ? AND prt.used = 0`,
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Token inválido o no encontrado' });
    }

    const tokenData = tokens[0];
    const expiresAt = new Date(tokenData.expires_at);

    // Verificar si el token ha expirado
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado' });
    }

    res.json({
      valid: true,
      email: tokenData.email
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Restablecer contraseña
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token es requerido'),
  body('password').notEmpty().withMessage('Password es requerido')
    .isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Buscar token en la base de datos
    const tokens = await executeQuery(
      `SELECT prt.id, prt.usuario_id, prt.expires_at, prt.used, u.email, u.username
       FROM password_reset_tokens prt
       INNER JOIN usuario u ON prt.usuario_id = u.id
       WHERE prt.token = ? AND prt.used = 0`,
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Token inválido o no encontrado' });
    }

    const tokenData = tokens[0];
    const expiresAt = new Date(tokenData.expires_at);

    // Verificar si el token ha expirado
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado. Por favor, solicita uno nuevo.' });
    }

    // Hashear nueva contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Actualizar contraseña del usuario
    await executeQuery(
      'UPDATE usuario SET password_hash = ? WHERE id = ?',
      [password_hash, tokenData.usuario_id]
    );

    // Marcar token como usado
    await executeQuery(
      'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
      [tokenData.id]
    );

    // Registrar en log
    await registrarLog({
      usuario_id: tokenData.usuario_id,
      accion: LogActions.ACTUALIZAR,
      modulo: LogModules.AUTH,
      descripcion: `Contraseña restablecida exitosamente - Usuario: ${tokenData.username}`,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    });

    res.json({
      message: 'Contraseña restablecida exitosamente'
    });
  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reenviar código de desbloqueo
router.post('/resend-unlock-code', [
  body('email').notEmpty().withMessage('Email es requerido')
    .isEmail().withMessage('Email debe ser válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Buscar usuario por email usando Supabase
    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('id')
      .eq('email', email)
      .eq('estado', 1)
      .limit(1);

    if (userError) {
      console.error('Error buscando usuario para reenvío:', userError);
      return res.status(500).json({ error: 'Error interno del servidor', details: userError.message });
    }

    if (!users || users.length === 0) {
      return res.json({ 
        message: 'Si el email existe y la cuenta está bloqueada, se reenviará el código' 
      });
    }

    const { resendUnlockCode } = await import('../utils/unlockCodeService.js');
    const result = await resendUnlockCode(users[0].id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ 
      message: 'Código de desbloqueo reenviado exitosamente' 
    });
  } catch (error) {
    console.error('Error reenviando código:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Verificar y desbloquear cuenta con código
router.post('/verify-unlock-code', [
  body('email').notEmpty().withMessage('Email es requerido')
    .isEmail().withMessage('Email debe ser válido'),
  body('unlockCode').notEmpty().withMessage('Código es requerido')
    .isLength({ min: 6, max: 6 }).withMessage('Código debe tener 6 dígitos')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, unlockCode } = req.body;

    // Buscar usuario por email usando Supabase
    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('id, username')
      .eq('email', email)
      .eq('estado', 1)
      .limit(1);

    if (userError) {
      console.error('Error buscando usuario:', userError);
      return res.status(500).json({ error: 'Error interno del servidor', details: userError.message });
    }

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    // Verificar código de desbloqueo
    const codeVerification = await verifyUnlockCode(user.id, unlockCode);

    if (!codeVerification.valid) {
      return res.status(400).json({ 
        error: codeVerification.error || 'Código inválido'
      });
    }

    // Código válido - cuenta desbloqueada
    res.json({
      message: 'Cuenta desbloqueada exitosamente',
      unlocked: true
    });
  } catch (error) {
    console.error('Error verificando código de desbloqueo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario aún existe y está activo
    const users = await executeQuery(
      'SELECT id, username, nombre_completo, rol, idioma_preferido FROM usuario WHERE id = ? AND estado = 1',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      valid: true,
      user: users[0]
    });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;
