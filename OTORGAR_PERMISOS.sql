-- Script para OTORGAR PERMISOS EXPLÍCITOS en Supabase
-- Ejecuta este script en el SQL Editor de Supabase
-- Esto otorga permisos completos al rol service_role (que usa SERVICE_ROLE_KEY)

-- Otorgar permisos completos al rol service_role en todas las tablas
GRANT ALL ON TABLE configuracion TO service_role;
GRANT ALL ON TABLE usuario TO service_role;
GRANT ALL ON TABLE alumno TO service_role;
GRANT ALL ON TABLE categorias_edad TO service_role;
GRANT ALL ON TABLE cintas TO service_role;
GRANT ALL ON TABLE representante TO service_role;
GRANT ALL ON TABLE alumnorepresentante TO service_role;
GRANT ALL ON TABLE evaluacion TO service_role;
GRANT ALL ON TABLE alumnoevaluacion TO service_role;
GRANT ALL ON TABLE config_pagos TO service_role;
GRANT ALL ON TABLE pagos TO service_role;
GRANT ALL ON TABLE horarios_clases TO service_role;
GRANT ALL ON TABLE dias_festivos TO service_role;
GRANT ALL ON TABLE password_reset_tokens TO service_role;
GRANT ALL ON TABLE account_lock TO service_role;
GRANT ALL ON TABLE log_actividades TO service_role;
GRANT ALL ON TABLE categorias_old_backup TO service_role;

-- También otorgar permisos al rol anon (por si acaso)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE configuracion TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE usuario TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE alumno TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE categorias_edad TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cintas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE representante TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE alumnorepresentante TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE evaluacion TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE alumnoevaluacion TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE config_pagos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE pagos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE horarios_clases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE dias_festivos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE password_reset_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE account_lock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE log_actividades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE categorias_old_backup TO anon;

-- Verificar que los permisos se otorgaron correctamente
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('service_role', 'anon')
    AND table_schema = 'public'
    AND table_name IN ('configuracion', 'usuario', 'alumno')
ORDER BY grantee, table_name;

