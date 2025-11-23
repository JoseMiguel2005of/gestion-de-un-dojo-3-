-- Script de migración de MySQL a Supabase (PostgreSQL)
-- Basado en: Dojo version Definitiva 7.sql
-- IMPORTANTE: Ejecuta este script en el SQL Editor de Supabase

-- ============================================================
-- TABLA: account_lock
-- ============================================================
CREATE TABLE IF NOT EXISTS account_lock (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  intentos_fallidos INTEGER DEFAULT 0,
  bloqueado BOOLEAN DEFAULT false,
  bloqueado_desde TIMESTAMP NULL,
  codigo_desbloqueo VARCHAR(10) DEFAULT NULL,
  codigo_expires_at TIMESTAMP NULL,
  codigo_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS usuario (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  rol VARCHAR(20) DEFAULT 'usuario' CHECK (rol IN ('admin','sensei','asistente','instructor','recepcionista','usuario')),
  estado BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  email VARCHAR(255) NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP NULL,
  idioma_preferido VARCHAR(5) DEFAULT 'es'
);

-- ============================================================
-- TABLA: categorias_edad
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias_edad (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  edad_min INTEGER NOT NULL,
  edad_max INTEGER NOT NULL,
  precio_mensualidad DECIMAL(10,2) DEFAULT 40.00,
  orden INTEGER NOT NULL
);

-- ============================================================
-- TABLA: cintas
-- ============================================================
CREATE TABLE IF NOT EXISTS cintas (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  nombre_en VARCHAR(50) NOT NULL,
  color_hex VARCHAR(20) DEFAULT NULL,
  orden INTEGER NOT NULL,
  es_dan BOOLEAN DEFAULT false,
  numero_dan INTEGER DEFAULT NULL
);

-- ============================================================
-- TABLA: alumno
-- ============================================================
CREATE TABLE IF NOT EXISTS alumno (
  id BIGSERIAL PRIMARY KEY,
  cedula VARCHAR(15) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE DEFAULT NULL,
  estado BOOLEAN DEFAULT true,
  id_categoria_edad BIGINT DEFAULT NULL,
  id_cinta BIGINT DEFAULT NULL,
  direccion TEXT DEFAULT NULL,
  contacto_emergencia VARCHAR(100) DEFAULT NULL,
  telefono_emergencia VARCHAR(20) DEFAULT NULL,
  nombre_padre VARCHAR(100) DEFAULT NULL,
  telefono_padre VARCHAR(20) DEFAULT NULL,
  nombre_madre VARCHAR(100) DEFAULT NULL,
  telefono_madre VARCHAR(20) DEFAULT NULL,
  telefono VARCHAR(20) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,
  usuario_id BIGINT DEFAULT NULL,
  sensei_id BIGINT DEFAULT NULL,
  proximo_examen_fecha DATE DEFAULT NULL,
  tiempo_preparacion_meses INTEGER DEFAULT 4,
  fecha_inscripcion DATE DEFAULT CURRENT_DATE,
  FOREIGN KEY (id_categoria_edad) REFERENCES categorias_edad(id) ON DELETE SET NULL,
  FOREIGN KEY (id_cinta) REFERENCES cintas(id) ON DELETE SET NULL,
  FOREIGN KEY (sensei_id) REFERENCES usuario(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: representante
-- ============================================================
CREATE TABLE IF NOT EXISTS representante (
  id BIGSERIAL PRIMARY KEY,
  cedula VARCHAR(15) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) DEFAULT NULL
);

-- ============================================================
-- TABLA: alumnorepresentante
-- ============================================================
CREATE TABLE IF NOT EXISTS alumnorepresentante (
  id BIGSERIAL PRIMARY KEY,
  id_alumno BIGINT NOT NULL,
  id_representante BIGINT NOT NULL,
  UNIQUE(id_alumno, id_representante),
  FOREIGN KEY (id_alumno) REFERENCES alumno(id) ON DELETE CASCADE,
  FOREIGN KEY (id_representante) REFERENCES representante(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: evaluacion
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluacion (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha DATE DEFAULT NULL,
  descripcion TEXT DEFAULT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','realizada','cancelada')),
  hora TIME DEFAULT NULL
);

-- ============================================================
-- TABLA: alumnoevaluacion
-- ============================================================
CREATE TABLE IF NOT EXISTS alumnoevaluacion (
  id BIGSERIAL PRIMARY KEY,
  id_alumno BIGINT NOT NULL,
  id_evaluacion BIGINT NOT NULL,
  notas TEXT DEFAULT NULL,
  FOREIGN KEY (id_alumno) REFERENCES alumno(id) ON DELETE CASCADE,
  FOREIGN KEY (id_evaluacion) REFERENCES evaluacion(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: configuracion
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracion (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT DEFAULT NULL,
  tipo VARCHAR(50) DEFAULT 'texto',
  descripcion TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: config_pagos
-- ============================================================
CREATE TABLE IF NOT EXISTS config_pagos (
  id BIGSERIAL PRIMARY KEY,
  mensualidad_precio DECIMAL(10,2) DEFAULT 0.00,
  dia_corte INTEGER DEFAULT 1,
  descuento_pago_adelantado DECIMAL(5,2) DEFAULT 0.00,
  recargo_mora DECIMAL(5,2) DEFAULT 0.00,
  moneda VARCHAR(10) DEFAULT 'Bs.',
  pais_configuracion VARCHAR(50) DEFAULT 'venezuela',
  metodos_pago JSONB DEFAULT NULL,
  datos_bancarios TEXT DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  precio_base DECIMAL(10,2) DEFAULT 50.00,
  aplicar_precio_por_categoria BOOLEAN DEFAULT true,
  tipo_cambio_usd_bs DECIMAL(10,2) DEFAULT 300.00
);

-- ============================================================
-- TABLA: pagos
-- ============================================================
CREATE TABLE IF NOT EXISTS pagos (
  id BIGSERIAL PRIMARY KEY,
  id_alumno BIGINT NOT NULL,
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(50) DEFAULT NULL,
  fecha_pago DATE NOT NULL,
  mes_correspondiente VARCHAR(50) DEFAULT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',
  comprobante VARCHAR(255) DEFAULT NULL,
  observaciones TEXT DEFAULT NULL,
  registrado_por BIGINT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  banco_origen VARCHAR(100) DEFAULT NULL,
  cedula_titular VARCHAR(20) DEFAULT NULL,
  telefono_cuenta VARCHAR(20) DEFAULT NULL,
  referencia VARCHAR(50) DEFAULT NULL,
  UNIQUE(id_alumno, mes, anio),
  FOREIGN KEY (id_alumno) REFERENCES alumno(id) ON DELETE CASCADE,
  FOREIGN KEY (registrado_por) REFERENCES usuario(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: horarios_clases
-- ============================================================
CREATE TABLE IF NOT EXISTS horarios_clases (
  id BIGSERIAL PRIMARY KEY,
  dia_semana VARCHAR(20) NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  id_categoria_edad BIGINT DEFAULT NULL,
  capacidad_maxima INTEGER DEFAULT 20,
  instructor VARCHAR(100) DEFAULT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (id_categoria_edad) REFERENCES categorias_edad(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: dias_festivos
-- ============================================================
CREATE TABLE IF NOT EXISTS dias_festivos (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  descripcion VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: password_reset_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: log_actividades
-- ============================================================
CREATE TABLE IF NOT EXISTS log_actividades (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  accion VARCHAR(100) NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  descripcion TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alumno_estado ON alumno(estado);
CREATE INDEX IF NOT EXISTS idx_alumno_usuario ON alumno(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sensei ON alumno(sensei_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_mes_anio ON pagos(mes, anio);
CREATE INDEX IF NOT EXISTS idx_eval_fecha ON evaluacion(fecha);
CREATE INDEX IF NOT EXISTS idx_horarios_dia ON horarios_clases(dia_semana);
CREATE INDEX IF NOT EXISTS idx_log_usuario ON log_actividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_log_created_at ON log_actividades(created_at);

-- ============================================================
-- DATOS INICIALES (Opcional - solo si quieres datos de ejemplo)
-- ============================================================
-- INSERT INTO categorias_edad (nombre, edad_min, edad_max, precio_mensualidad, orden) VALUES
-- ('Benjamín', 0, 7, 30.00, 1),
-- ('Alevín', 8, 9, 35.00, 2),
-- ('Infantil', 10, 11, 38.00, 3),
-- ('Cadete', 12, 13, 42.00, 4),
-- ('Junior', 14, 15, 45.00, 5),
-- ('Senior', 16, 34, 50.00, 6),
-- ('Veterano', 35, 100, 45.00, 7);

-- INSERT INTO cintas (nombre, nombre_en, color_hex, orden, es_dan, numero_dan) VALUES
-- ('Blanca', 'White', '#FFFFFF', 1, false, NULL),
-- ('Blanca-Amarilla', 'White-Yellow', '#FFFACD', 2, false, NULL),
-- ('Amarilla', 'Yellow', '#FFD700', 3, false, NULL),
-- ('Amarilla-Naranja', 'Yellow-Orange', '#FFB347', 4, false, NULL),
-- ('Naranja', 'Orange', '#FF8C00', 5, false, NULL),
-- ('Naranja-Verde', 'Orange-Green', '#9ACD32', 6, false, NULL),
-- ('Verde', 'Green', '#228B22', 7, false, NULL),
-- ('Verde-Azul', 'Green-Blue', '#4682B4', 8, false, NULL),
-- ('Azul', 'Blue', '#0000FF', 9, false, NULL),
-- ('Azul-Marrón', 'Blue-Brown', '#5C4033', 10, false, NULL),
-- ('Marrón', 'Brown', '#8B4513', 11, false, NULL),
-- ('Negro', 'Black', '#000000', 12, false, NULL),
-- ('Negro 1º Dan', 'Black 1st Dan', '#000000', 13, true, 1),
-- ('Negro 2º Dan', 'Black 2nd Dan', '#000000', 14, true, 2),
-- ('Negro 3º Dan', 'Black 3rd Dan', '#000000', 15, true, 3),
-- ('Negro 4º Dan', 'Black 4th Dan', '#000000', 16, true, 4),
-- ('Negro 5º Dan', 'Black 5th Dan', '#000000', 17, true, 5);

-- INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES
-- ('dojo_nombre', 'Mi Dojo de Judo', 'texto', 'Nombre del dojo'),
-- ('dojo_lema', 'Excelencia en el arte marcial', 'texto', 'Lema o frase institucional'),
-- ('tema_modo', 'dark', 'select', 'Modo del tema (light/dark)'),
-- ('tema_sidebar', 'current', 'select', 'Tema del sidebar');

-- INSERT INTO config_pagos (mensualidad_precio, dia_corte, moneda, pais_configuracion, precio_base) VALUES
-- (40.00, 5, 'USD$', 'usa', 7000.00);

