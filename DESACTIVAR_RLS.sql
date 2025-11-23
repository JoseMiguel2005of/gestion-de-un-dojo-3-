-- Script para DESACTIVAR RLS en Supabase
-- Ejecuta este script en el SQL Editor de Supabase
-- Ve a: https://app.supabase.com > Tu proyecto > SQL Editor

-- Desactivar RLS en todas las tablas
ALTER TABLE configuracion DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuario DISABLE ROW LEVEL SECURITY;
ALTER TABLE alumno DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_edad DISABLE ROW LEVEL SECURITY;
ALTER TABLE cintas DISABLE ROW LEVEL SECURITY;
ALTER TABLE representante DISABLE ROW LEVEL SECURITY;
ALTER TABLE alumnorepresentante DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE alumnoevaluacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE config_pagos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_clases DISABLE ROW LEVEL SECURITY;
ALTER TABLE dias_festivos DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_lock DISABLE ROW LEVEL SECURITY;
ALTER TABLE log_actividades DISABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Esto desactiva la seguridad a nivel de fila
-- Solo hazlo si estás seguro de que el backend usa SERVICE_ROLE_KEY
-- y que no hay acceso directo desde el frontend a Supabase

