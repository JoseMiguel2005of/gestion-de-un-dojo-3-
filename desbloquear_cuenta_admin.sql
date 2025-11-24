-- ============================================
-- SCRIPT COMPLETO PARA DESBLOQUEAR ADMIN
-- ============================================
-- Ejecutar TODO este script en Supabase SQL Editor
-- Esto desbloqueará completamente la cuenta de Admin@gmail.com

-- PASO 1: Verificar estado actual
SELECT 
  u.id,
  u.email,
  u.username,
  u.estado,
  u.activo,
  u.email_verificado,
  al.bloqueado,
  al.intentos_fallidos,
  al.bloqueado_desde
FROM usuario u
LEFT JOIN account_lock al ON u.id = al.usuario_id
WHERE LOWER(u.email) = LOWER('Admin@gmail.com');

-- PASO 2: Eliminar cualquier registro de bloqueo existente y crear uno nuevo limpio
-- Primero eliminar si existe
DELETE FROM account_lock
WHERE usuario_id IN (
  SELECT id FROM usuario 
  WHERE LOWER(email) = LOWER('Admin@gmail.com')
);

-- Luego crear registro limpio
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

-- PASO 3: Asegurar que el usuario esté completamente activo y verificado
UPDATE usuario
SET 
  estado = true,
  activo = true,
  email_verificado = COALESCE(email_verificado, true)
WHERE LOWER(email) = LOWER('Admin@gmail.com');

-- PASO 4: Verificar resultado final (debe mostrar bloqueado = false)
SELECT 
  u.id,
  u.email,
  u.username,
  u.estado as usuario_activo,
  u.activo,
  u.email_verificado,
  al.bloqueado as cuenta_bloqueada,
  al.intentos_fallidos,
  al.bloqueado_desde,
  al.updated_at as ultima_actualizacion
FROM usuario u
LEFT JOIN account_lock al ON u.id = al.usuario_id
WHERE LOWER(u.email) = LOWER('Admin@gmail.com');

-- Si bloqueado sigue siendo true, ejecutar esto manualmente:
-- UPDATE account_lock SET bloqueado = false WHERE usuario_id = (SELECT id FROM usuario WHERE LOWER(email) = LOWER('Admin@gmail.com'));

