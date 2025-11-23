# Script para crear un nuevo repositorio en GitHub desde cero
# Este script limpia el repositorio local y prepara todo para un nuevo inicio

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREAR NUEVO REPOSITORIO EN GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Git esta instalado
try {
    $gitVersion = git --version
    Write-Host "[OK] Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git no esta instalado. Por favor instalalo desde https://git-scm.com/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "PASO 1: Limpiando repositorio local..." -ForegroundColor Yellow

# Eliminar .git si existe
if (Test-Path .git) {
    Write-Host "Eliminando historial de Git anterior..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .git
    Write-Host "[OK] Historial eliminado" -ForegroundColor Green
} else {
    Write-Host "[INFO] No hay repositorio Git previo" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "PASO 2: Inicializando nuevo repositorio Git..." -ForegroundColor Yellow
git init
Write-Host "[OK] Repositorio inicializado" -ForegroundColor Green

Write-Host ""
Write-Host "PASO 3: Agregando archivos..." -ForegroundColor Yellow
git add .
Write-Host "[OK] Archivos agregados" -ForegroundColor Green

Write-Host ""
Write-Host "PASO 4: Haciendo commit inicial..." -ForegroundColor Yellow
git commit -m "Initial commit: Proyecto Dojo - Sistema de gestion con Supabase"
Write-Host "[OK] Commit realizado" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SIGUIENTE PASO: Crear repositorio en GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ve a https://github.com/new" -ForegroundColor Yellow
Write-Host "2. Crea un nuevo repositorio (NO marques README, .gitignore o license)" -ForegroundColor Yellow
Write-Host "3. Copia la URL del repositorio" -ForegroundColor Yellow
Write-Host ""
Write-Host "Luego ejecuta estos comandos:" -ForegroundColor Cyan
Write-Host "   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git" -ForegroundColor Gray
Write-Host "   git branch -M main" -ForegroundColor Gray
Write-Host "   git push -u origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "O presiona Enter para continuar y agregar el remote ahora..." -ForegroundColor Cyan
$continuar = Read-Host "Presiona Enter para continuar o 'n' para salir"

if ($continuar -ne "n" -and $continuar -ne "N") {
    Write-Host ""
    Write-Host "Ingresa la URL de tu repositorio de GitHub:" -ForegroundColor Yellow
    Write-Host "Ejemplo: https://github.com/tu-usuario/tu-repositorio.git" -ForegroundColor Gray
    $repoUrl = Read-Host "URL del repositorio"
    
    if ($repoUrl) {
        Write-Host ""
        Write-Host "Agregando remote origin..." -ForegroundColor Yellow
        git remote add origin $repoUrl
        Write-Host "[OK] Remote agregado" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Cambiando a rama main..." -ForegroundColor Yellow
        git branch -M main
        Write-Host "[OK] Rama cambiada a main" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Subiendo codigo a GitHub..." -ForegroundColor Yellow
        Write-Host "Si te pide autenticacion, usa un Personal Access Token" -ForegroundColor Cyan
        git push -u origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[OK] Codigo subido exitosamente!" -ForegroundColor Green
            Write-Host "Puedes ver tu repositorio en: $repoUrl" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "[ADVERTENCIA] Hubo un error al hacer push" -ForegroundColor Yellow
            Write-Host "Posibles causas:" -ForegroundColor Yellow
            Write-Host "  1. Problemas de autenticacion (necesitas Personal Access Token)" -ForegroundColor Yellow
            Write-Host "  2. El repositorio no existe o no tienes permisos" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Revisa INICIO_NUEVO_GITHUB.md para mas ayuda" -ForegroundColor Cyan
        }
    } else {
        Write-Host "[INFO] No se proporciono URL. Puedes agregarlo manualmente mas tarde" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "Proceso completado!" -ForegroundColor Green
Write-Host "Revisa INICIO_NUEVO_GITHUB.md para instrucciones detalladas" -ForegroundColor Cyan

