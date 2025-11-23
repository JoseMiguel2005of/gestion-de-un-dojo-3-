import crypto from 'crypto';
import { executeQuery } from '../config/database.js';
import { sendUnlockCodeEmail } from './emailService.js';

/**
 * Genera un código de desbloqueo de 6 dígitos
 */
const generateUnlockCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Obtiene o crea un registro de bloqueo para un usuario
 */
const getOrCreateLockRecord = async (usuarioId) => {
  let lockRecord = await executeQuery(
    'SELECT * FROM account_lock WHERE usuario_id = ?',
    [usuarioId]
  );

  if (lockRecord.length === 0) {
    await executeQuery(
      'INSERT INTO account_lock (usuario_id, intentos_fallidos, bloqueado) VALUES (?, 0, 0)',
      [usuarioId]
    );
    lockRecord = await executeQuery(
      'SELECT * FROM account_lock WHERE usuario_id = ?',
      [usuarioId]
    );
  }

  return lockRecord[0];
};

/**
 * Incrementa el contador de intentos fallidos
 */
export const incrementFailedAttempts = async (usuarioId) => {
  const lockRecord = await getOrCreateLockRecord(usuarioId);
  
  const nuevosIntentos = (lockRecord.intentos_fallidos || 0) + 1;
  const MAX_ATTEMPTS = 3;
  
  // Actualizar intentos fallidos
  await executeQuery(
    'UPDATE account_lock SET intentos_fallidos = ?, updated_at = NOW() WHERE usuario_id = ?',
    [nuevosIntentos, usuarioId]
  );

  // Si alcanza el límite, bloquear la cuenta
  if (nuevosIntentos >= MAX_ATTEMPTS) {
    await blockAccount(usuarioId);
    return { blocked: true, attempts: nuevosIntentos };
  }

  return { blocked: false, attempts: nuevosIntentos, remaining: MAX_ATTEMPTS - nuevosIntentos };
};

/**
 * Bloquea una cuenta y envía código de desbloqueo
 */
const blockAccount = async (usuarioId) => {
  // Obtener datos del usuario
  const users = await executeQuery(
    'SELECT email, username FROM usuario WHERE id = ?',
    [usuarioId]
  );

  if (users.length === 0) return;

  const user = users[0];

  // Generar código de desbloqueo (válido por 30 minutos)
  const unlockCode = generateUnlockCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  // Bloquear cuenta y guardar código
  await executeQuery(
    `UPDATE account_lock 
     SET bloqueado = 1, 
         bloqueado_desde = NOW(),
         codigo_desbloqueo = ?,
         codigo_expires_at = ?,
         codigo_used = 0,
         updated_at = NOW()
     WHERE usuario_id = ?`,
    [unlockCode, expiresAt, usuarioId]
  );

  // Enviar código por correo
  try {
    await sendUnlockCodeEmail(user.email, unlockCode, user.username);
    console.log(`✅ Código de desbloqueo enviado a: ${user.email}`);
  } catch (error) {
    console.error('❌ Error enviando código de desbloqueo:', error);
  }
};

/**
 * Resetea los intentos fallidos (después de login exitoso)
 */
export const resetFailedAttempts = async (usuarioId) => {
  await executeQuery(
    'UPDATE account_lock SET intentos_fallidos = 0, bloqueado = 0, bloqueado_desde = NULL, updated_at = NOW() WHERE usuario_id = ?',
    [usuarioId]
  );
};

/**
 * Verifica si una cuenta está bloqueada
 */
export const isAccountLocked = async (usuarioId) => {
  const lockRecord = await executeQuery(
    'SELECT bloqueado, bloqueado_desde FROM account_lock WHERE usuario_id = ?',
    [usuarioId]
  );

  if (lockRecord.length === 0) {
    return { locked: false };
  }

  return {
    locked: lockRecord[0].bloqueado === 1,
    lockedSince: lockRecord[0].bloqueado_desde
  };
};

/**
 * Verifica y usa un código de desbloqueo
 */
export const verifyUnlockCode = async (usuarioId, code) => {
  const lockRecord = await executeQuery(
    `SELECT codigo_desbloqueo, codigo_expires_at, codigo_used 
     FROM account_lock 
     WHERE usuario_id = ? AND bloqueado = 1`,
    [usuarioId]
  );

  if (lockRecord.length === 0) {
    return { valid: false, error: 'La cuenta no está bloqueada' };
  }

  const record = lockRecord[0];

  // Verificar si el código ya fue usado
  if (record.codigo_used === 1) {
    return { valid: false, error: 'Este código ya fue usado' };
  }

  // Verificar si el código expiró
  const expiresAt = new Date(record.codigo_expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, error: 'El código ha expirado. Solicita uno nuevo.' };
  }

  // Verificar si el código coincide
  if (record.codigo_desbloqueo !== code) {
    return { valid: false, error: 'Código incorrecto' };
  }

  // Código válido - desbloquear cuenta
  await executeQuery(
    `UPDATE account_lock 
     SET bloqueado = 0,
         bloqueado_desde = NULL,
         intentos_fallidos = 0,
         codigo_used = 1,
         updated_at = NOW()
     WHERE usuario_id = ?`,
    [usuarioId]
  );

  return { valid: true };
};

/**
 * Reenvía el código de desbloqueo
 */
export const resendUnlockCode = async (usuarioId) => {
  const lockRecord = await executeQuery(
    'SELECT bloqueado FROM account_lock WHERE usuario_id = ?',
    [usuarioId]
  );

  if (lockRecord.length === 0 || lockRecord[0].bloqueado !== 1) {
    return { success: false, error: 'La cuenta no está bloqueada' };
  }

  // Regenerar y enviar código
  await blockAccount(usuarioId);
  return { success: true };
};

