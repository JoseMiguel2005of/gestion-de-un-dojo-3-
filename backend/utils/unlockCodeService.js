import crypto from 'crypto';
import supabase from './supabaseClient.js';
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
  let { data: lockRecord, error } = await supabase
    .from('account_lock')
    .select('*')
    .eq('usuario_id', usuarioId)
    .limit(1);

  if (error) {
    console.error('Error obteniendo lock record:', error);
    throw error;
  }

  if (!lockRecord || lockRecord.length === 0) {
    const { error: insertError } = await supabase
      .from('account_lock')
      .insert({
        usuario_id: usuarioId,
        intentos_fallidos: 0,
        bloqueado: false
      });

    if (insertError) {
      console.error('Error creando lock record:', insertError);
      throw insertError;
    }

    const { data: newRecord, error: selectError } = await supabase
      .from('account_lock')
      .select('*')
      .eq('usuario_id', usuarioId)
      .limit(1);

    if (selectError) {
      console.error('Error obteniendo nuevo lock record:', selectError);
      throw selectError;
    }

    lockRecord = newRecord;
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
  const { error: updateError } = await supabase
    .from('account_lock')
    .update({
      intentos_fallidos: nuevosIntentos,
      updated_at: new Date().toISOString()
    })
    .eq('usuario_id', usuarioId);

  if (updateError) {
    console.error('Error actualizando intentos fallidos:', updateError);
    throw updateError;
  }

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
  const { data: users, error: userError } = await supabase
    .from('usuario')
    .select('email, username')
    .eq('id', usuarioId)
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('Error obteniendo usuario para bloqueo:', userError);
    return;
  }

  const user = users[0];

  // Generar código de desbloqueo (válido por 30 minutos)
  const unlockCode = generateUnlockCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  // Bloquear cuenta y guardar código
  const { error: blockError } = await supabase
    .from('account_lock')
    .update({
      bloqueado: true,
      bloqueado_desde: new Date().toISOString(),
      codigo_desbloqueo: unlockCode,
      codigo_expires_at: expiresAt.toISOString(),
      codigo_used: false,
      updated_at: new Date().toISOString()
    })
    .eq('usuario_id', usuarioId);

  if (blockError) {
    console.error('Error bloqueando cuenta:', blockError);
    throw blockError;
  }

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
  const { error } = await supabase
    .from('account_lock')
    .update({
      intentos_fallidos: 0,
      bloqueado: false,
      bloqueado_desde: null,
      updated_at: new Date().toISOString()
    })
    .eq('usuario_id', usuarioId);

  if (error) {
    console.error('Error reseteando intentos fallidos:', error);
    // No lanzar error aquí, solo loguear, porque esto no debería bloquear el login
  }
};

/**
 * Verifica si una cuenta está bloqueada
 */
export const isAccountLocked = async (usuarioId) => {
  const { data: lockRecord, error } = await supabase
    .from('account_lock')
    .select('bloqueado, bloqueado_desde')
    .eq('usuario_id', usuarioId)
    .limit(1);

  if (error) {
    console.error('Error verificando bloqueo:', error);
    return { locked: false };
  }

  if (!lockRecord || lockRecord.length === 0) {
    return { locked: false };
  }

  return {
    locked: lockRecord[0].bloqueado === true,
    lockedSince: lockRecord[0].bloqueado_desde
  };
};

/**
 * Verifica y usa un código de desbloqueo
 */
export const verifyUnlockCode = async (usuarioId, code) => {
  const { data: lockRecord, error } = await supabase
    .from('account_lock')
    .select('codigo_desbloqueo, codigo_expires_at, codigo_used')
    .eq('usuario_id', usuarioId)
    .eq('bloqueado', true)
    .limit(1);

  if (error) {
    console.error('Error verificando código:', error);
    return { valid: false, error: 'Error verificando código' };
  }

  if (!lockRecord || lockRecord.length === 0) {
    return { valid: false, error: 'La cuenta no está bloqueada' };
  }

  const record = lockRecord[0];

  // Verificar si el código ya fue usado
  if (record.codigo_used === true) {
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
  const { error: updateError } = await supabase
    .from('account_lock')
    .update({
      bloqueado: false,
      bloqueado_desde: null,
      intentos_fallidos: 0,
      codigo_used: true,
      updated_at: new Date().toISOString()
    })
    .eq('usuario_id', usuarioId);

  if (updateError) {
    console.error('Error desbloqueando cuenta:', updateError);
    return { valid: false, error: 'Error desbloqueando cuenta' };
  }

  return { valid: true };
};

/**
 * Reenvía el código de desbloqueo
 */
export const resendUnlockCode = async (usuarioId) => {
  const { data: lockRecord, error } = await supabase
    .from('account_lock')
    .select('bloqueado')
    .eq('usuario_id', usuarioId)
    .limit(1);

  if (error) {
    console.error('Error verificando bloqueo para reenvío:', error);
    return { success: false, error: 'Error verificando estado de cuenta' };
  }

  if (!lockRecord || lockRecord.length === 0 || lockRecord[0].bloqueado !== true) {
    return { success: false, error: 'La cuenta no está bloqueada' };
  }

  // Regenerar y enviar código
  await blockAccount(usuarioId);
  return { success: true };
};

