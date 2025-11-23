# 🚀 Guía para Subir el Proyecto a GitHub

Esta guía te ayudará a subir tu proyecto Dojo a GitHub paso a paso.

## 📋 Prerrequisitos

1. Tener una cuenta de GitHub (si no la tienes, créala en [github.com](https://github.com))
2. Tener Git instalado en tu computadora
3. Tener acceso a tu repositorio de GitHub (creado o existente)

## 🔧 Paso 1: Verificar que Git esté instalado

Abre PowerShell o Terminal y ejecuta:
```bash
git --version
```

Si no está instalado, descárgalo desde [git-scm.com](https://git-scm.com/)

## 📁 Paso 2: Navegar al directorio del proyecto

Abre PowerShell o Terminal y navega a tu proyecto:
```powershell
cd "C:\Users\holaj\OneDrive\Desktop\DOJO DEFINITIVO\DOJO DEFINITIVO\Interfaz Dojo\secreto-de-codigos-main"
```

## 🔄 Paso 3: Inicializar Git (si no está inicializado)

Si el proyecto no tiene Git inicializado, ejecuta:
```bash
git init
```

## 📝 Paso 4: Agregar todos los archivos

Agrega todos los archivos del proyecto:
```bash
git add .
```

## 💾 Paso 5: Hacer el primer commit

```bash
git commit -m "Initial commit: Proyecto Dojo con Supabase y configuración para Vercel"
```

## 🔗 Paso 6: Conectar con tu repositorio de GitHub

### Opción A: Si ya tienes un repositorio en GitHub

1. Ve a tu repositorio en GitHub
2. Copia la URL del repositorio (ej: `https://github.com/tu-usuario/tu-repositorio.git`)

3. Agrega el repositorio remoto:
```bash
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
```

4. Verifica que se agregó correctamente:
```bash
git remote -v
```

### Opción B: Si necesitas crear un nuevo repositorio

1. Ve a [GitHub](https://github.com) y haz clic en "New repository"
2. Dale un nombre a tu repositorio (ej: `dojo-gestion`)
3. **NO** inicialices con README, .gitignore o licencia (ya los tienes)
4. Copia la URL del repositorio
5. Ejecuta los comandos de la Opción A

## 🚀 Paso 7: Subir el código a GitHub

### Primera vez (rama main/master):
```bash
git branch -M main
git push -u origin main
```

Si tu repositorio usa `master` en lugar de `main`:
```bash
git push -u origin master
```

### Si te pide autenticación:

**Opción 1: Personal Access Token (Recomendado)**
1. Ve a GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Genera un nuevo token con permisos `repo`
3. Cuando Git te pida la contraseña, usa el token en su lugar

**Opción 2: GitHub CLI**
```bash
gh auth login
```

## ✅ Paso 8: Verificar

1. Ve a tu repositorio en GitHub
2. Deberías ver todos tus archivos subidos
3. Verifica que los archivos sensibles (`.env`, `node_modules`) NO estén visibles

## 📤 Comandos para Futuras Actualizaciones

Cada vez que hagas cambios y quieras subirlos:

```bash
# 1. Ver qué archivos cambiaron
git status

# 2. Agregar los cambios
git add .

# 3. Hacer commit con un mensaje descriptivo
git commit -m "Descripción de los cambios realizados"

# 4. Subir los cambios
git push
```

## 🔒 Archivos que NO se suben (gracias a .gitignore)

- `node_modules/` - Dependencias (se instalan con npm install)
- `.env` - Variables de entorno sensibles
- `dist/` - Archivos compilados
- Archivos temporales y de sistema

## ⚠️ Notas Importantes

1. **NUNCA subas archivos `.env`** con credenciales reales
2. Los archivos `.env.example` o `configuracion_ejemplo.env` SÍ se pueden subir (no tienen datos sensibles)
3. Si accidentalmente subiste un archivo con credenciales:
   - Elimínalo del repositorio
   - Cambia las credenciales inmediatamente
   - Considera usar GitHub Secrets para variables de entorno

## 🆘 Solución de Problemas

### Error: "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
```

### Error: "failed to push some refs"
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Error de autenticación
- Verifica que tu token de GitHub sea válido
- O configura SSH keys para GitHub

## 📚 Recursos Adicionales

- [Documentación de Git](https://git-scm.com/doc)
- [Guía de GitHub](https://docs.github.com/)
- [GitHub Desktop](https://desktop.github.com/) - Interfaz gráfica (alternativa)

