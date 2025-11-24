-- Crear tabla para rastrear intentos fallidos por email (incluso si el usuario no existe)
-- Esto previene ataques de fuerza bruta

CREATE TABLE IF NOT EXISTS email_lock (
  id BIGSERIAL PRIMARY KEY,
  email_hash VARCHAR(64) UNIQUE NOT NULL, -- Hash SHA256 del email (para privacidad)
  email VARCHAR(255) NOT NULL, -- Email original (para logs y debugging)
  intentos_fallidos INTEGER DEFAULT 0,
  bloqueado BOOLEAN DEFAULT FALSE,
  bloqueado_desde TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsquedas rápidas por hash
CREATE INDEX IF NOT EXISTS idx_email_lock_hash ON email_lock(email_hash);

-- Índice para limpiar registros antiguos
CREATE INDEX IF NOT EXISTS idx_email_lock_updated ON email_lock(updated_at);

-- Comentarios
COMMENT ON TABLE email_lock IS 'Rastrea intentos fallidos de login por email para prevenir fuerza bruta';
COMMENT ON COLUMN email_lock.email_hash IS 'Hash SHA256 del email para privacidad';
COMMENT ON COLUMN email_lock.email IS 'Email original (para logs)';
COMMENT ON COLUMN email_lock.intentos_fallidos IS 'Número de intentos fallidos con este email';
COMMENT ON COLUMN email_lock.bloqueado IS 'Indica si el email está bloqueado';

