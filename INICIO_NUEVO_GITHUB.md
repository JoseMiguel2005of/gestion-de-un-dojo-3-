# 🆕 Crear Proyecto Nuevo en GitHub - Guía Paso a Paso

Esta guía te ayudará a crear un proyecto completamente nuevo en GitHub desde cero.

## 📋 Paso 1: Limpiar el Repositorio Local

Primero, vamos a limpiar cualquier configuración de Git anterior:

```powershell
# 1. Navegar al proyecto
cd "C:\Users\holaj\OneDrive\Desktop\DOJO DEFINITIVO\DOJO DEFINITIVO\Interfaz Dojo\secreto-de-codigos-main"

# 2. Eliminar la carpeta .git (esto borra todo el historial de Git)
Remove-Item -Recurse -Force .git

# 3. Inicializar un nuevo repositorio Git limpio
git init

# 4. Agregar todos los archivos
git add .

# 5. Hacer el primer commit
git commit -m "Initial commit: Proyecto Dojo - Sistema de gestion con Supabase"
```

## 📦 Paso 2: Crear Nuevo Repositorio en GitHub

1. Ve a [GitHub.com](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** (arriba a la derecha) y selecciona **"New repository"**
3. Configura el repositorio:
   - **Repository name**: `dojo-gestion` (o el nombre que prefieras)
   - **Description**: "Sistema de gestión para Dojo con React, Express y Supabase"
   - **Visibility**: 
     - ✅ **Public** (si quieres que sea visible)
     - ✅ **Private** (si quieres que sea privado)
   - ⚠️ **NO marques**:
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
   (Ya tienes estos archivos en tu proyecto)
4. Haz clic en **"Create repository"**

## 🔗 Paso 3: Conectar y Subir el Código

Después de crear el repositorio, GitHub te mostrará instrucciones. Ejecuta estos comandos:

```powershell
# 1. Asegúrate de estar en el directorio del proyecto
cd "C:\Users\holaj\OneDrive\Desktop\DOJO DEFINITIVO\DOJO DEFINITIVO\Interfaz Dojo\secreto-de-codigos-main"

# 2. Agregar el repositorio remoto (REEMPLAZA con tu URL)
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git

# 3. Cambiar a la rama main
git branch -M main

# 4. Subir el código
git push -u origin main
```

## ✅ Paso 4: Verificar

1. Ve a tu repositorio en GitHub
2. Deberías ver todos tus archivos
3. Verifica que NO aparezcan:
   - `node_modules/` (debe estar en .gitignore)
   - Archivos `.env` con credenciales reales

## 🎯 Resumen de Comandos Completos

Copia y pega estos comandos en PowerShell (reemplaza la URL con la de tu repositorio):

```powershell
cd "C:\Users\holaj\OneDrive\Desktop\DOJO DEFINITIVO\DOJO DEFINITIVO\Interfaz Dojo\secreto-de-codigos-main"

# Limpiar y empezar de nuevo
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
git init
git add .
git commit -m "Initial commit: Proyecto Dojo - Sistema de gestion con Supabase"

# Conectar con GitHub (REEMPLAZA LA URL)
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git branch -M main
git push -u origin main
```

## 🔐 Si te pide autenticación

GitHub ya no acepta contraseñas. Necesitas un **Personal Access Token**:

1. Ve a GitHub > Tu perfil > Settings
2. Developer settings > Personal access tokens > Tokens (classic)
3. Generate new token (classic)
4. Dale un nombre (ej: "Vercel Deployment")
5. Selecciona el scope `repo` (todos los permisos de repositorio)
6. Generate token
7. **Copia el token** (solo se muestra una vez)
8. Cuando Git te pida la contraseña, usa el token en su lugar

## ⚠️ Notas Importantes

- El comando `Remove-Item -Recurse -Force .git` elimina todo el historial de Git local
- Esto NO afecta tu código, solo el historial de versiones
- Si ya tenías commits importantes, haz un backup primero
- Los archivos sensibles (`.env`) están protegidos por `.gitignore`

## 🚀 Después de Subir

Una vez que el código esté en GitHub, puedes:
1. Conectar el repositorio a Vercel
2. Configurar las variables de entorno
3. Desplegar tu aplicación

¡Listo! 🎉

