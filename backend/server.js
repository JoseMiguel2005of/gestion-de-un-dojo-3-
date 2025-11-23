import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supabase from './utils/supabaseClient.js';  // Importa el cliente de Supabase
import { verifyEmailConfig } from './utils/emailService.js';

// Importar rutas (mantén tus rutas existentes, pero modifica las que usen DB)
import authRoutes from './routes/auth.js';
import alumnosRoutes from './routes/alumnos.js';
import nivelesRoutes from './routes/niveles.js';
import representantesRoutes from './routes/representantes.js';
import evaluacionesRoutes from './routes/evaluaciones.js';
import configuracionRoutes from './routes/configuracion.js';
import usuariosRoutes from './routes/usuarios.js';
import pagosRoutes from './routes/pagos.js';
import horariosRoutes from './routes/horarios.js';
import backupRoutes from './routes/backup.js';
import demoRoutes from './routes/demo.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS - Permitir tanto el dominio principal como previews de Vercel
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8080',
  process.env.CORS_ORIGIN,
  'https://gestion-de-un-dojo-3.vercel.app',
  /^https:\/\/gestion-de-un-dojo-3-.*\.vercel\.app$/, // Previews de Vercel
  /^https:\/\/.*-jose-miguel-rodriguezs-projects\.vercel\.app$/ // Previews con tu usuario
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está en la lista permitida
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/alumnos', alumnosRoutes);
app.use('/api/niveles', nivelesRoutes);
app.use('/api/representantes', representantesRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/demo', demoRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'API del Dojo funcionando correctamente'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Función para asignar instructores a alumnos existentes sin instructor (modificada para Supabase)
const asignarInstructoresIniciales = async () => {
  try {
    // Obtener todos los instructores activos
    const { data: instructores, error: errorInstructores } = await supabase
      .from('usuario')
      .select('id')
      .eq('rol', 'instructor')
      .eq('estado', 1);

    if (errorInstructores || instructores.length === 0) {
      console.log('⚠️ No hay instructores disponibles para asignar.');
      return;
    }

    // Obtener alumnos activos sin instructor
    const { data: alumnosSinInstructor, error: errorAlumnos } = await supabase
      .from('alumno')
      .select('id, nombre')
      .eq('estado', 1)
      .or('sensei_id.is.null,sensei_id.eq.0');

    if (errorAlumnos || alumnosSinInstructor.length === 0) {
      console.log('✓ Todos los alumnos ya tienen un instructor asignado.');
      return;
    }

    // Asignar instructor aleatorio a cada alumno
    for (const alumno of alumnosSinInstructor) {
      const instructorAleatorio = instructores[Math.floor(Math.random() * instructores.length)];
      const { error: updateError } = await supabase
        .from('alumno')
        .update({ sensei_id: instructorAleatorio.id })
        .eq('id', alumno.id);

      if (updateError) {
        console.error(`Error actualizando alumno ${alumno.id}:`, updateError.message);
      }
    }

    console.log(`✓ Se asignaron instructores a ${alumnosSinInstructor.length} alumno(s) existente(s).`);
  } catch (error) {
    console.error('⚠️ Error asignando instructores iniciales:', error.message);
  }
};

// Función para inicializar el servidor (solo para desarrollo local)
const startServer = async () => {
  try {
    // Probar conexión a Supabase (en lugar de testConnection)
    const { data, error } = await supabase.from('usuario').select('id').limit(1);  // Prueba simple
    if (error) {
      console.error('❌ No se pudo conectar a Supabase. Verifica las credenciales.');
      process.exit(1);
    }
    console.log('✅ Conexión a Supabase exitosa.');

    // Verificar configuración de correo
    console.log('\n📧 Verificando servicio de correo...');
    const emailConfigured = await verifyEmailConfig();
    if (!emailConfigured) {
      console.warn('⚠️ ADVERTENCIA: El servicio de correo no está configurado correctamente.');
      console.warn('   La recuperación de contraseña podría no funcionar.');
      console.warn('   Revisa los logs anteriores para más detalles.\n');
    }

    // Asignar instructores a alumnos existentes sin instructor
    await asignarInstructoresIniciales();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Solo iniciar el servidor si no estamos en Vercel (serverless)
// En Vercel, exportamos la app directamente
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  startServer();
}

// Exportar la app para Vercel
export default app;