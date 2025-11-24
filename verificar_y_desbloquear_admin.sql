-- ============================================
-- SCRIPT RÁPIDO PARA VERIFICAR Y DESBLOQUEAR ADMIN
-- ============================================
-- Ejecutar este script en Supabase SQL Editor
-- Esto verificará el email y desbloqueará la cuenta de Admin@gmail.com

-- PASO 1: Verificar estado actual
SELECT 
  u.id,
  u.email,
  u.username,
  u.estado,
  u.activo,
  u.email_verificado,
  al.bloqueado,
  al.intentos_fallidos
FROM usuario u
LEFT JOIN account_lock al ON u.id = al.usuario_id
WHERE LOWER(u.email) = LOWER('Admin@gmail.com');

-- PASO 2: Actualizar usuario - VERIFICAR EMAIL Y ACTIVAR
UPDATE usuario
SET 
  estado = true,
  activo = true,
  email_verificado = true
WHERE LOWER(email) = LOWER('Admin@gmail.com');

-- PASO 3: Eliminar registro de bloqueo si existe
DELETE FROM account_lock
WHERE usuario_id IN (
  SELECT id FROM usuario 
  WHERE LOWER(email) = LOWER('Admin@gmail.com')
);

-- PASO 4: Crear registro limpio de bloqueo
INSERT INTO account_lock (usuario_id, intentos_fallidos, bloqueado, bloqueado_desde, codigo_desbloqueo, codigo_expires_at, codigo_used, created_at, updated_at)
SELECT 
  id, 
  0, 
  false, 
  NULL, 
  NULL, 
  NULL, 
  false,
  NOW(),
  NOW()
FROM usuario
WHERE LOWER(email) = LOWER('Admin@gmail.com');

-- PASO 5: Verificar resultado (debe mostrar email_verificado = true y bloqueado = false)
SELECT 
  u.id,
  u.email,
  u.username,
  u.estado as usuario_activo,
  u.activo,
  u.email_verificado,
  al.bloqueado as cuenta_bloqueada,
  al.intentos_fallidos
FROM usuario u
LEFT JOIN account_lock al ON u.id = al.usuario_id
WHERE LOWER(u.email) = LOWER('Admin@gmail.com');

