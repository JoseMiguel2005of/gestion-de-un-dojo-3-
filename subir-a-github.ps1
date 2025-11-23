# Script para subir el proyecto a GitHub
# Ejecuta este script desde PowerShell en el directorio del proyecto

Write-Host "Iniciando proceso de subida a GitHub..." -ForegroundColor Green
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
Write-Host "Verificando estado del repositorio..." -ForegroundColor Yellow

# Verificar si ya hay un repositorio git
if (-not (Test-Path .git)) {
    Write-Host "[INFO] Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "[OK] Repositorio Git ya inicializado" -ForegroundColor Green
}

Write-Host ""
Write-Host "Agregando archivos al staging area..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "Verificando si hay cambios para commitear..." -ForegroundColor Yellow
$status = git status --porcelain

if ($status) {
    Write-Host "Haciendo commit de los cambios..." -ForegroundColor Yellow
    git commit -m "Initial commit: Proyecto Dojo con Supabase y configuracion para Vercel"
    Write-Host "[OK] Commit realizado exitosamente" -ForegroundColor Green
} else {
    Write-Host "[INFO] No hay cambios nuevos para commitear" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Configuracion del repositorio remoto" -ForegroundColor Yellow
Write-Host ""
Write-Host "Por favor, ingresa la URL de tu repositorio de GitHub:" -ForegroundColor Cyan
Write-Host "Ejemplo: https://github.com/tu-usuario/tu-repositorio.git" -ForegroundColor Gray
$repoUrl = Read-Host "URL del repositorio"

if ($repoUrl) {
    # Verificar si ya existe un remote origin
    $existingRemote = $null
    try {
        $existingRemote = git remote get-url origin 2>$null
    } catch {
        # No existe remote origin
    }
    
    if ($existingRemote) {
        Write-Host ""
        Write-Host "[ADVERTENCIA] Ya existe un remote 'origin' apuntando a: $existingRemote" -ForegroundColor Yellow
        $overwrite = Read-Host "Deseas reemplazarlo? (s/n)"
        if ($overwrite -eq "s" -or $overwrite -eq "S") {
            git remote remove origin
            git remote add origin $repoUrl
            Write-Host "[OK] Remote 'origin' actualizado" -ForegroundColor Green
        } else {
            Write-Host "[INFO] Manteniendo el remote existente" -ForegroundColor Cyan
        }
    } else {
        git remote add origin $repoUrl
        Write-Host "[OK] Remote 'origin' agregado" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Subiendo codigo a GitHub..." -ForegroundColor Yellow
    
    # Intentar determinar la rama principal
    $currentBranch = git branch --show-current
    if (-not $currentBranch) {
        $currentBranch = "main"
        git branch -M main
    }
    
    Write-Host "Haciendo push a la rama: $currentBranch" -ForegroundColor Yellow
    git push -u origin $currentBranch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Codigo subido exitosamente a GitHub!" -ForegroundColor Green
        Write-Host "Puedes ver tu repositorio en: $repoUrl" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "[ADVERTENCIA] Hubo un error al hacer push. Posibles causas:" -ForegroundColor Yellow
        Write-Host "   1. Problemas de autenticacion (necesitas un Personal Access Token)" -ForegroundColor Yellow
        Write-Host "   2. El repositorio remoto no existe o no tienes permisos" -ForegroundColor Yellow
        Write-Host "   3. Necesitas hacer pull primero si el repositorio tiene contenido" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Revisa la guia GUIA_GITHUB.md para mas ayuda" -ForegroundColor Cyan
    }
} else {
    Write-Host "[ADVERTENCIA] No se proporciono URL. Puedes agregar el remote manualmente con:" -ForegroundColor Yellow
    Write-Host "   git remote add origin https://github.com/tu-usuario/tu-repositorio.git" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Proceso completado" -ForegroundColor Green
