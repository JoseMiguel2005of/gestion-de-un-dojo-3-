-- ============================================
-- AGREGAR COLUMNA email_verificado A LA TABLA usuario
-- ============================================
-- Ejecutar este script si la columna no existe

-- Verificar si la columna existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuario' 
  AND column_name = 'email_verificado';

-- Agregar columna si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuario' AND column_name = 'email_verificado'
  ) THEN
    ALTER TABLE usuario ADD COLUMN email_verificado BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN usuario.email_verificado IS 'Indica si el email del usuario ha sido verificado';
    
    -- Marcar todos los usuarios existentes como verificados (para no afectar usuarios actuales)
    UPDATE usuario SET email_verificado = TRUE WHERE email_verificado IS NULL OR email_verificado = FALSE;
    
    RAISE NOTICE 'Columna email_verificado agregada a la tabla usuario';
  ELSE
    RAISE NOTICE 'La columna email_verificado ya existe en la tabla usuario';
  END IF;
END $$;

-- Verificar usuarios existentes y marcar como verificados si no lo están
UPDATE usuario 
SET email_verificado = TRUE 
WHERE email_verificado IS NULL OR email_verificado = FALSE;

-- Verificar resultado
SELECT 
  email,
  email_verificado,
  estado,
  activo
FROM usuario
WHERE LOWER(email) = LOWER('Admin@gmail.com');

