-- Script para configurar permisos en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- ============================================================
-- OPCIÓN 1: Desactivar RLS (Más simple, pero menos seguro)
-- ============================================================
-- Si quieres desactivar RLS completamente (solo para desarrollo):
-- ALTER TABLE configuracion DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE usuario DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE alumno DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categorias_edad DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cintas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE representante DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE alumnorepresentante DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE evaluacion DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE alumnoevaluacion DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE config_pagos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE horarios_clases DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE dias_festivos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE account_lock DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE log_actividades DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- OPCIÓN 2: Crear políticas RLS que permitan todo (Recomendado)
-- ============================================================
-- Esto permite acceso completo desde el backend usando SERVICE_ROLE_KEY

-- Habilitar RLS en todas las tablas
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_edad ENABLE ROW LEVEL SECURITY;
ALTER TABLE cintas ENABLE ROW LEVEL SECURITY;
ALTER TABLE representante ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnorepresentante ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnoevaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dias_festivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lock ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_actividades ENABLE ROW LEVEL SECURITY;

-- Crear políticas que permitan todo (el backend usa SERVICE_ROLE_KEY que bypassa RLS)
-- Pero estas políticas permiten acceso desde el frontend también

-- Política para configuracion (lectura pública para temas)
CREATE POLICY "Allow public read configuracion" ON configuracion
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all configuracion" ON configuracion
  FOR ALL USING (true);

-- Política para usuario
CREATE POLICY "Allow service role all usuario" ON usuario
  FOR ALL USING (true);

-- Política para alumno
CREATE POLICY "Allow service role all alumno" ON alumno
  FOR ALL USING (true);

-- Política para categorias_edad
CREATE POLICY "Allow service role all categorias_edad" ON categorias_edad
  FOR ALL USING (true);

-- Política para cintas
CREATE POLICY "Allow service role all cintas" ON cintas
  FOR ALL USING (true);

-- Política para representante
CREATE POLICY "Allow service role all representante" ON representante
  FOR ALL USING (true);

-- Política para alumnorepresentante
CREATE POLICY "Allow service role all alumnorepresentante" ON alumnorepresentante
  FOR ALL USING (true);

-- Política para evaluacion
CREATE POLICY "Allow service role all evaluacion" ON evaluacion
  FOR ALL USING (true);

-- Política para alumnoevaluacion
CREATE POLICY "Allow service role all alumnoevaluacion" ON alumnoevaluacion
  FOR ALL USING (true);

-- Política para config_pagos
CREATE POLICY "Allow service role all config_pagos" ON config_pagos
  FOR ALL USING (true);

-- Política para pagos
CREATE POLICY "Allow service role all pagos" ON pagos
  FOR ALL USING (true);

-- Política para horarios_clases
CREATE POLICY "Allow service role all horarios_clases" ON horarios_clases
  FOR ALL USING (true);

-- Política para dias_festivos
CREATE POLICY "Allow service role all dias_festivos" ON dias_festivos
  FOR ALL USING (true);

-- Política para password_reset_tokens
CREATE POLICY "Allow service role all password_reset_tokens" ON password_reset_tokens
  FOR ALL USING (true);

-- Política para account_lock
CREATE POLICY "Allow service role all account_lock" ON account_lock
  FOR ALL USING (true);

-- Política para log_actividades
CREATE POLICY "Allow service role all log_actividades" ON log_actividades
  FOR ALL USING (true);

-- ============================================================
-- NOTA IMPORTANTE:
-- ============================================================
-- El backend usa SUPABASE_SERVICE_ROLE_KEY que debería bypassar RLS
-- Si aún así tienes problemas, verifica que:
-- 1. SUPABASE_SERVICE_ROLE_KEY esté configurada en Vercel
-- 2. El cliente de Supabase esté usando SERVICE_ROLE_KEY (no ANON_KEY)
-- 3. Las políticas RLS estén creadas como arriba

