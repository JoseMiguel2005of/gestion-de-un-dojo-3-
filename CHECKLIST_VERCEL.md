# ✅ Checklist para Desplegar en Vercel

## Antes de Subir a Vercel

### ✅ Configuración del Código
- [x] Archivo `vercel.json` configurado
- [x] Archivo `api/index.js` creado para funciones serverless
- [x] `backend/server.js` exporta la app correctamente
- [x] Cliente de Supabase configurado con credenciales correctas
- [x] Dependencias agregadas (`@supabase/supabase-js` en backend)

### 📋 Variables de Entorno a Configurar en Vercel

Ve a **Settings > Environment Variables** en Vercel y agrega:

#### 🔴 OBLIGATORIAS:
- [ ] `SUPABASE_URL` = `https://sgebsbtrokowtdtjwnmu.supabase.co`
- [ ] `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWJzYnRyb2tvd3RkdGp3bm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NDk5OTksImV4cCI6MjA3OTQyNTk5OX0.uoTChrvYEZBUuL-RnmrlYAN1mGn65K8BiYMdrOLmeJg`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWJzYnRyb2tvd3RkdGp3bm11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg0OTk5OSwiZXhwIjoyMDc5NDI1OTk5fQ.9W7oJGAR6VDUQCOTTDIaVh17a-FxU3QsTn8RhJgf7gg`
- [ ] `JWT_SECRET` = (genera una clave segura - ver instrucciones abajo)
- [ ] `VITE_API_URL` = `https://tu-dominio.vercel.app/api` (⚠️ **IMPORTANTE**: Reemplaza con tu dominio real después del primer despliegue)

#### 🟡 RECOMENDADAS:
- [ ] `FRONTEND_URL` = `https://tu-dominio.vercel.app` (después del primer despliegue)
- [ ] `CORS_ORIGIN` = `https://tu-dominio.vercel.app` (después del primer despliegue)
- [ ] `NODE_ENV` = `production`
- [ ] `LOG_LEVEL` = `info`

#### 🟢 OPCIONALES:
- [ ] `EMAIL_USER` = `gestiondojo86@gmail.com`
- [ ] `EMAIL_PASS` = `GestionDojo12`
- [ ] `PORT` = `3001`

### 🔑 Generar JWT_SECRET

Ejecuta este comando para generar una clave segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y úsalo como valor de `JWT_SECRET` en Vercel.

## 🚀 Pasos para Desplegar

### 1. Primera vez (sin VITE_API_URL completo)
1. Sube el código a tu repositorio (GitHub, GitLab, etc.)
2. Conecta el repositorio a Vercel
3. Configura las variables de entorno (excepto `VITE_API_URL`, `FRONTEND_URL`, `CORS_ORIGIN`)
4. Haz el primer despliegue
5. Anota el dominio que Vercel te asigna (ej: `tu-proyecto.vercel.app`)

### 2. Actualizar variables con el dominio real
1. Ve a **Settings > Environment Variables**
2. Actualiza:
   - `VITE_API_URL` = `https://tu-proyecto.vercel.app/api`
   - `FRONTEND_URL` = `https://tu-proyecto.vercel.app`
   - `CORS_ORIGIN` = `https://tu-proyecto.vercel.app`
3. Haz un nuevo despliegue (o Vercel lo hará automáticamente)

### 3. Verificar el Despliegue
1. Visita `https://tu-proyecto.vercel.app/api/health`
   - Deberías ver: `{"status":"OK","timestamp":"...","message":"API del Dojo funcionando correctamente"}`
2. Visita `https://tu-proyecto.vercel.app`
   - Deberías ver la aplicación funcionando
3. Revisa los logs en Vercel para verificar que no hay errores

## ⚠️ Notas Importantes

1. **VITE_API_URL**: Esta variable se usa durante el BUILD del frontend. Si la cambias, necesitas hacer un nuevo build.

2. **Primer Despliegue**: La primera vez, puedes dejar `VITE_API_URL` como `http://localhost:3001/api` temporalmente, y luego actualizarlo después de obtener tu dominio de Vercel.

3. **Supabase**: Asegúrate de que tu proyecto de Supabase esté activo y las tablas estén creadas.

4. **CORS**: Si tienes problemas de CORS, verifica que `FRONTEND_URL` y `CORS_ORIGIN` coincidan exactamente con tu dominio de Vercel (incluyendo `https://`).

## 🔍 Verificación Post-Despliegue

- [ ] El endpoint `/api/health` responde correctamente
- [ ] La aplicación frontend carga sin errores
- [ ] Puedes hacer login (si tienes usuarios creados)
- [ ] Las peticiones a la API funcionan correctamente
- [ ] No hay errores en los logs de Vercel

## 📞 Si algo falla

1. Revisa los logs de build en Vercel
2. Revisa los logs de runtime en Vercel
3. Verifica que todas las variables de entorno estén configuradas
4. Verifica que las credenciales de Supabase sean correctas
5. Revisa `VERCEL_SETUP.md` para más detalles

