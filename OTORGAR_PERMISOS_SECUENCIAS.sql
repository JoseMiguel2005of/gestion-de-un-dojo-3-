-- Script para OTORGAR PERMISOS a TODAS las SECUENCIAS en Supabase
-- Ejecuta este script en el SQL Editor de Supabase
-- Esto otorga permisos para usar las secuencias (auto-increment) a los roles service_role y anon

-- Otorgar permisos a TODAS las secuencias automáticamente
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public' 
        AND sequence_name LIKE '%_id_seq'
    LOOP
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I TO service_role', seq_record.sequence_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I TO anon', seq_record.sequence_name);
        RAISE NOTICE 'Permisos otorgados a secuencia: %', seq_record.sequence_name;
    END LOOP;
END $$;

-- También otorgar permisos específicos a las secuencias más importantes (por si acaso)
GRANT USAGE, SELECT ON SEQUENCE usuario_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE usuario_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE log_actividades_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE log_actividades_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE password_reset_tokens_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE password_reset_tokens_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE alumno_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE alumno_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE representante_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE representante_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE pagos_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE pagos_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE evaluacion_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE evaluacion_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE horarios_clases_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE horarios_clases_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE categorias_edad_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE categorias_edad_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE cintas_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE cintas_id_seq TO anon;

GRANT USAGE, SELECT ON SEQUENCE account_lock_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE account_lock_id_seq TO anon;

