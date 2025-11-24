-- Script para desbloquear la cuenta de Admin@gmail.com
-- Ejecutar este script en Supabase SQL Editor

-- 1. Buscar el ID del usuario Admin@gmail.com
SELECT id, username, email, estado 
FROM usuario 
WHERE email = 'Admin@gmail.com' OR email = 'admin@gmail.com';

-- 2. Desbloquear la cuenta (reemplaza USER_ID con el ID obtenido arriba)
-- Si no conoces el ID, puedes usar este query que lo busca automáticamente:
UPDATE account_lock
SET 
  bloqueado = false,
  bloqueado_desde = NULL,
  intentos_fallidos = 0,
  codigo_desbloqueo = NULL,
  codigo_expires_at = NULL,
  codigo_used = false,
  updated_at = NOW()
WHERE usuario_id IN (
  SELECT id FROM usuario 
  WHERE LOWER(email) = LOWER('Admin@gmail.com')
);

-- 3. Verificar que se desbloqueó correctamente
SELECT 
  u.email,
  u.username,
  al.bloqueado,
  al.intentos_fallidos,
  al.bloqueado_desde
FROM usuario u
LEFT JOIN account_lock al ON u.id = al.usuario_id
WHERE LOWER(u.email) = LOWER('Admin@gmail.com');

-- 4. Si no existe registro en account_lock, crear uno limpio (opcional)
INSERT INTO account_lock (usuario_id, intentos_fallidos, bloqueado)
SELECT id, 0, false
FROM usuario
WHERE LOWER(email) = LOWER('Admin@gmail.com')
ON CONFLICT (usuario_id) DO NOTHING;

