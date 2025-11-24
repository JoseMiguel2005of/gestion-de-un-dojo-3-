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
      console.log(`❌ Contraseña incorrecta para usuario: ${user.username} (ID: ${user.id})`);
      // Incrementar intentos fallidos
      try {
        const attemptResult = await incrementFailedAttempts(user.id);
        console.log(`📊 Resultado de incremento de intentos:`, attemptResult);
        
        if (attemptResult.blocked) {
          console.log(`🔒 Cuenta bloqueada después de ${attemptResult.attempts} intentos fallidos`);
          // La cuenta fue bloqueada
          // El código de desbloqueo está guardado en la BD, así que el usuario puede solicitar reenvío
          return res.status(403).json({ 
            error: 'Cuenta bloqueada',
            locked: true,
            message: 'Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos. Se ha enviado un código de desbloqueo a tu correo electrónico.' 
          });
        }
        
        console.log(`⚠️ Intentos fallidos: ${attemptResult.attempts}, Restantes: ${attemptResult.remaining}`);
        return res.status(401).json({ 
          error: 'Credenciales inválidas',
          attempts: attemptResult.attempts,
          remaining: attemptResult.remaining,
          message: `Credenciales incorrectas. Te quedan ${attemptResult.remaining} intento(s).`
        });
      } catch (error) {
        console.error('❌ ERROR al procesar intentos fallidos:');
        console.error('   Mensaje:', error.message);
        console.error('   Stack completo:', error.stack);
        if (error.cause) {
          console.error('   Causa:', error.cause);
        }
        // Si falla el incremento de intentos, aún así devolver un error de credenciales
        // Pero loguear el error completo para diagnóstico
        return res.status(401).json({ 
          error: 'Credenciales inválidas',
          message: 'Credenciales incorrectas.'
        });
      }
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
    console.log('📧 Solicitud de recuperación de contraseña recibida');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Errores de validación:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    console.log(`   Email solicitado: ${email}`);

    // Buscar usuario por email
    console.log('   Buscando usuario en la base de datos...');
    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('id, username, email, nombre_completo')
      .eq('email', email)
      .eq('estado', true)
      .limit(1);

    // Siempre devolver el mismo mensaje por seguridad (no revelar si el email existe)
    if (userError) {
      console.error('❌ Error buscando usuario:', userError);
      return res.json({ 
        message: 'Si el email existe, se le enviará un correo de recuperación' 
      });
    }

    if (!users || users.length === 0) {
      console.log('   Usuario no encontrado con ese email');
      return res.json({ 
        message: 'Si el email existe, se le enviará un correo de recuperación' 
      });
    }

    const user = users[0];
    console.log(`   ✅ Usuario encontrado: ${user.username} (ID: ${user.id})`);

    // Generar token único y seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log(`   Token generado: ${resetToken.substring(0, 10)}...`);
    
    // Calcular fecha de expiración (15 minutos)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    console.log(`   Token expira en: ${expiresAt.toISOString()}`);

    // Eliminar tokens anteriores no usados del mismo usuario
    console.log('   Eliminando tokens anteriores...');
    const { error: deleteError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('usuario_id', user.id)
      .or('used.eq.false,used.eq.0');

    if (deleteError) {
      console.error('⚠️ Error eliminando tokens anteriores (continuando):', deleteError);
    }

    // Guardar token en la base de datos
    console.log('   Guardando nuevo token en la base de datos...');
    console.log('   Datos a insertar:', {
      usuario_id: user.id,
      token: resetToken.substring(0, 10) + '...',
      expires_at: expiresAt.toISOString(),
      used: 0
    });
    
    // Intentar con 0 primero (tipo numérico), si falla intentar con false (tipo boolean)
    let insertedData;
    let insertError;
    
    // Primero intentar con 0 (numérico)
    const result1 = await supabase
      .from('password_reset_tokens')
      .insert({
        usuario_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: 0
      })
      .select();
    
    if (result1.error) {
      console.log('   Intentando con used: false (boolean)...');
      // Si falla, intentar con false (boolean)
      const result2 = await supabase
        .from('password_reset_tokens')
        .insert({
          usuario_id: user.id,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: false
        })
        .select();
      
      insertedData = result2.data;
      insertError = result2.error;
    } else {
      insertedData = result1.data;
      insertError = result1.error;
    }

    if (insertError) {
      console.error('❌ Error guardando token de reset:');
      console.error('   Código:', insertError.code);
      console.error('   Mensaje:', insertError.message);
      console.error('   Detalles:', insertError.details);
      console.error('   Hint:', insertError.hint);
      throw new Error(`Error guardando token de recuperación: ${insertError.message}`);
    }
    console.log('   ✅ Token guardado exitosamente:', insertedData);

    // Construir URL de reset (usar la URL del frontend)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    console.log(`   URL de reset: ${resetUrl}`);

    // Enviar correo
    try {
      console.log(`   Enviando correo de recuperación a: ${user.email}`);
      await sendPasswordResetEmail(user.email, resetToken, resetUrl);
      console.log(`✅ Correo de recuperación enviado exitosamente a: ${user.email}`);
    } catch (emailError) {
      console.error('❌ ERROR CRÍTICO enviando correo:');
      console.error('   Mensaje:', emailError.message);
      console.error('   Stack:', emailError.stack);
      // No fallar si el correo no se puede enviar, pero loguear el error
    }

    console.log('✅ Proceso de recuperación completado');
    res.json({ 
      message: 'Si el email existe, se le enviará un correo de recuperación'
    });
  } catch (error) {
    console.error('❌ ERROR en recuperación de contraseña:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token de recuperación
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Buscar token en la base de datos
    const { data: tokens, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, usuario_id, expires_at, used')
      .eq('token', token)
      .eq('used', false)
      .limit(1);

    if (tokenError) {
      console.error('Error buscando token:', tokenError);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'Token inválido o no encontrado' });
    }

    const tokenData = tokens[0];
    const expiresAt = new Date(tokenData.expires_at);

    // Verificar si el token ha expirado
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado' });
    }

    // Obtener datos del usuario
    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('email, username')
      .eq('id', tokenData.usuario_id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    res.json({
      valid: true,
      email: user.email
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
    const { data: tokens, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, usuario_id, expires_at, used')
      .eq('token', token)
      .eq('used', false)
      .limit(1);

    if (tokenError) {
      console.error('Error buscando token:', tokenError);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'Token inválido o no encontrado' });
    }

    const tokenData = tokens[0];
    const expiresAt = new Date(tokenData.expires_at);

    // Verificar si el token ha expirado
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'El token ha expirado. Por favor, solicita uno nuevo.' });
    }

    // Obtener datos del usuario
    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('email, username')
      .eq('id', tokenData.usuario_id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    // Hashear nueva contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Actualizar contraseña del usuario
    const { error: updateError } = await supabase
      .from('usuario')
      .update({ password_hash })
      .eq('id', tokenData.usuario_id);

    if (updateError) {
      console.error('Error actualizando contraseña:', updateError);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    // Marcar token como usado
    const { error: markUsedError } = await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    if (markUsedError) {
      console.error('Error marcando token como usado:', markUsedError);
      // No fallar si esto falla, la contraseña ya fue actualizada
    }

    // Registrar en log
    await registrarLog({
      usuario_id: tokenData.usuario_id,
      accion: LogActions.ACTUALIZAR,
      modulo: LogModules.AUTH,
      descripcion: `Contraseña restablecida exitosamente - Usuario: ${user.username}`,
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
    const { data: users, error: userError } = await supabase
      .from('usuario')
      .select('id, username, nombre_completo, rol, idioma_preferido')
      .eq('id', decoded.id)
      .eq('estado', true)
      .limit(1);

    if (userError) {
      console.error('Error verificando usuario:', userError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (!users || users.length === 0) {
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
