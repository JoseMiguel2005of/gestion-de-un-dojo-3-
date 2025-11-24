-- ============================================
-- SCRIPT DE CONFIGURACIÓN PARA VERIFICACIÓN DE EMAIL
-- ============================================
-- Este script crea la tabla para códigos de verificación
-- y agrega la columna email_verificado a la tabla usuario
-- ============================================

-- 1. Agregar columna email_verificado a la tabla usuario (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuario' AND column_name = 'email_verificado'
  ) THEN
    ALTER TABLE usuario ADD COLUMN email_verificado BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN usuario.email_verificado IS 'Indica si el email del usuario ha sido verificado';
    
    -- Marcar todos los usuarios existentes como verificados (para no afectar usuarios actuales)
    UPDATE usuario SET email_verificado = TRUE WHERE email_verificado IS NULL;
    
    RAISE NOTICE 'Columna email_verificado agregada a la tabla usuario';
  ELSE
    RAISE NOTICE 'La columna email_verificado ya existe en la tabla usuario';
  END IF;
END $$;

-- 2. Crear tabla para códigos de verificación de email
-- Esta tabla almacena los códigos de verificación que se envían por correo
-- cuando un usuario se registra

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  codigo VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_email_verification_usuario ON email_verification_codes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_codigo ON email_verification_codes(codigo);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_used ON email_verification_codes(used);

-- Índice compuesto para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_email_verification_usuario_used ON email_verification_codes(usuario_id, used);

-- Comentarios
COMMENT ON TABLE email_verification_codes IS 'Almacena códigos de verificación de email para nuevos usuarios';
COMMENT ON COLUMN email_verification_codes.usuario_id IS 'ID del usuario que necesita verificar su email';
COMMENT ON COLUMN email_verification_codes.codigo IS 'Código de 6 dígitos para verificar el email';
COMMENT ON COLUMN email_verification_codes.expires_at IS 'Fecha y hora de expiración del código (30 minutos después de la creación)';
COMMENT ON COLUMN email_verification_codes.used IS 'Indica si el código ya fue usado para verificar el email';

-- Función para limpiar códigos expirados (opcional, puede ejecutarse periódicamente)
CREATE OR REPLACE FUNCTION limpiar_codigos_expirados()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verification_codes
  WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Comentario sobre la función
COMMENT ON FUNCTION limpiar_codigos_expirados() IS 'Elimina códigos de verificación expirados y no usados';

-- 3. Configurar permisos y RLS (Row Level Security)
-- Deshabilitar RLS para esta tabla (similar a password_reset_tokens)
-- La aplicación backend necesita acceso completo a esta tabla
ALTER TABLE email_verification_codes DISABLE ROW LEVEL SECURITY;

-- Otorgar permisos al rol anon y service_role (usado por Supabase)
GRANT ALL ON email_verification_codes TO anon;
GRANT ALL ON email_verification_codes TO authenticated;
GRANT ALL ON email_verification_codes TO service_role;

-- Otorgar permisos en la secuencia (para el auto-increment del id)
GRANT USAGE, SELECT ON SEQUENCE email_verification_codes_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE email_verification_codes_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE email_verification_codes_id_seq TO service_role;

-- Si prefieres usar RLS en lugar de deshabilitarlo, puedes usar estas políticas:
-- (Descomenta si quieres habilitar RLS en el futuro)
/*
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Política para permitir insertar códigos (cualquiera puede crear un código durante el registro)
CREATE POLICY "Permitir insertar códigos de verificación"
  ON email_verification_codes
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (true);

-- Política para permitir leer códigos (solo para verificación)
CREATE POLICY "Permitir leer códigos de verificación"
  ON email_verification_codes
  FOR SELECT
  TO anon, authenticated, service_role
  USING (true);

-- Política para permitir actualizar códigos (marcar como usado)
CREATE POLICY "Permitir actualizar códigos de verificación"
  ON email_verification_codes
  FOR UPDATE
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);
*/
