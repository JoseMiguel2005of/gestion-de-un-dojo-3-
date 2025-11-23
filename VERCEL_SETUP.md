# Guía de Configuración para Vercel

Esta guía te ayudará a configurar tu aplicación Dojo en Vercel con Supabase.

## 📋 Pasos para Desplegar en Vercel

### 1. Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Navega a **Settings** > **Environment Variables**
3. Agrega las siguientes variables:

#### Variables Obligatorias de Supabase:
```
SUPABASE_URL=https://sgebsbtrokowtdtjwnmu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWJzYnRyb2tvd3RkdGp3bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NDk5OTksImV4cCI6MjA3OTQyNTk5OX0.uoTChrvYEZBUuL-RnmrlYAN1mGn65K8BiYMdrOLmeJg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWJzYnRyb2tvd3RkdGp3bm11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg0OTk5OSwiZXhwIjoyMDc5NDI1OTk5fQ.9W7oJGAR6VDUQCOTTDIaVh17a-FxU3QsTn8RhJgf7gg
```
**Nota**: `SUPABASE_SERVICE_ROLE_KEY` es opcional pero recomendado para operaciones del backend que requieren permisos elevados.

#### Variables del Servidor:
```
PORT=3001
JWT_SECRET=tu_clave_secreta_muy_segura_aqui_cambiar_por_una_real
FRONTEND_URL=https://tu-dominio.vercel.app
CORS_ORIGIN=https://tu-dominio.vercel.app
```

#### Variables de Correo (Opcional):
```
EMAIL_USER=gestiondojo86@gmail.com
EMAIL_PASS=GestionDojo12
```

#### Variables Adicionales:
```
LOG_LEVEL=info
NODE_ENV=production
```

#### Variable para el Frontend (Importante):
```
VITE_API_URL=https://tu-dominio.vercel.app/api
```
**Nota**: Esta variable debe configurarse en Vercel y se usará durante el build del frontend. Reemplaza `tu-dominio.vercel.app` con tu dominio real de Vercel.

### 2. Configurar el Build en Vercel

Vercel detectará automáticamente la configuración desde `vercel.json`. Asegúrate de que:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install && cd backend && npm install`

### 3. Estructura del Proyecto

El proyecto tiene la siguiente estructura:
```
/
├── backend/          # API Express con Supabase
├── src/              # Frontend React
├── dist/             # Build del frontend
└── vercel.json       # Configuración de Vercel
```

### 4. Verificar la Conexión a Supabase

Una vez desplegado, verifica que la conexión a Supabase funcione:

1. Visita `https://tu-dominio.vercel.app/api/health`
2. Deberías ver un mensaje de estado OK
3. Revisa los logs en Vercel para verificar que no hay errores de conexión

### 5. Configurar CORS

Asegúrate de que `FRONTEND_URL` en Vercel apunte a tu dominio de producción. Esto es importante para que CORS funcione correctamente.

## 🔧 Solución de Problemas

### Error: "No se pudo conectar a Supabase"
- Verifica que las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` estén configuradas correctamente en Vercel
- Asegúrate de que las variables estén disponibles para el entorno de producción

### Error: CORS
- Verifica que `FRONTEND_URL` y `CORS_ORIGIN` apunten a tu dominio de Vercel
- Asegúrate de que no haya espacios extra en las variables de entorno

### Error: Build falla
- Verifica que todas las dependencias estén en `package.json`
- Revisa los logs de build en Vercel para más detalles

## 📝 Notas Importantes

1. **JWT_SECRET**: Cambia este valor por una clave segura y única. Puedes generar una con:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Variables de Entorno**: Las variables configuradas en Vercel tienen prioridad sobre los archivos `.env` locales.

3. **Supabase**: Asegúrate de que tu proyecto de Supabase esté activo y las credenciales sean correctas.

## 🚀 Despliegue

Una vez configuradas todas las variables:

1. Haz push a tu repositorio
2. Vercel detectará los cambios y desplegará automáticamente
3. Revisa los logs de despliegue en Vercel
4. Visita tu dominio para verificar que todo funcione

