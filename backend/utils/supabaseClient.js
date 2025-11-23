import { createClient } from '@supabase/supabase-js';

// Configura con tus variables de entorno
// En producción, estas variables deben estar en Vercel Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgebsbtrokowtdtjwnmu.supabase.co';

// Priorizar SERVICE_ROLE_KEY para el backend (más permisos, más seguro para operaciones del servidor)
// Si no está disponible, usar ANON_KEY como fallback
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_ANON_KEY 
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWJzYnRyb2tvd3RkdGp3bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NDk5OTksImV4cCI6MjA3OTQyNTk5OX0.uoTChrvYEZBUuL-RnmrlYAN1mGn65K8BiYMdrOLmeJg';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Las variables de entorno de Supabase no están configuradas');
  console.error('   Asegúrate de configurar SUPABASE_URL y SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY) en Vercel');
}

// Crear cliente de Supabase
// Si se usa SERVICE_ROLE_KEY, el cliente tendrá permisos elevados (bypassa RLS)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // No persistir sesiones en el backend
    autoRefreshToken: false, // No refrescar tokens automáticamente
  }
});

export default supabase;
