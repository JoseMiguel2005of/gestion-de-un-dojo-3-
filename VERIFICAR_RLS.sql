-- Script para VERIFICAR el estado de RLS en Supabase
-- Ejecuta este script en el SQL Editor de Supabase para verificar si RLS está desactivado

-- Verificar el estado de RLS en todas las tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'configuracion',
        'usuario',
        'alumno',
        'categorias_edad',
        'cintas',
        'representante',
        'alumnorepresentante',
        'evaluacion',
        'alumnoevaluacion',
        'config_pagos',
        'pagos',
        'horarios_clases',
        'dias_festivos',
        'password_reset_tokens',
        'account_lock',
        'log_actividades'
    )
ORDER BY tablename;

-- Si ves "true" en la columna rls_habilitado, significa que RLS está ACTIVADO
-- Si ves "false", significa que RLS está DESACTIVADO (lo que queremos)

-- Si alguna tabla tiene RLS activado, ejecuta este comando para desactivarlo:
-- ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;

