# World Cup 2026 Predictor - Setup Script (Windows PowerShell)
# Run: .\setup.ps1

Write-Host "=== World Cup 2026 Predictor Setup ===" -ForegroundColor Cyan

# ---- BACKEND ----
Write-Host "`n[1/6] Creating Laravel project..." -ForegroundColor Yellow
Set-Location C:\DEV\worldcup
composer create-project laravel/laravel backend-temp --prefer-dist
if ($?) {
    # Move our custom files into the fresh Laravel project
    $filesToCopy = @(
        "app\Models",
        "app\Http\Controllers\Api",
        "database\migrations",
        "database\seeders",
        "routes\api.php",
        "config\cors.php"
    )
    foreach ($f in $filesToCopy) {
        $src = "backend\$f"
        $dst = "backend-temp\$f"
        if (Test-Path $src) {
            Copy-Item -Recurse -Force $src $dst
        }
    }
    # Rename
    Remove-Item -Recurse -Force backend -ErrorAction SilentlyContinue
    Rename-Item backend-temp backend
    Write-Host "Laravel project created." -ForegroundColor Green
} else {
    Write-Host "composer not found. Skipping Laravel scaffold." -ForegroundColor Red
    Write-Host "Run manually: composer create-project laravel/laravel backend-temp" -ForegroundColor Yellow
}

# ---- BACKEND .env ----
Write-Host "`n[2/6] Setting up backend .env..." -ForegroundColor Yellow
Set-Location C:\DEV\worldcup\backend
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
}
Write-Host "Edit backend\.env and set your DB credentials, then continue." -ForegroundColor Cyan

# Install Sanctum
Write-Host "`n[3/6] Installing Sanctum..." -ForegroundColor Yellow
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Run migrations and seed
Write-Host "`n[4/6] Running migrations and seeders..." -ForegroundColor Yellow
php artisan migrate --seed

# ---- FRONTEND ----
Write-Host "`n[5/6] Setting up Next.js frontend..." -ForegroundColor Yellow
Set-Location C:\DEV\worldcup\frontend
npm install
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.local.example" ".env.local" -ErrorAction SilentlyContinue
}

Write-Host "`n[6/6] Done!" -ForegroundColor Green
Write-Host @"

To start the app:
  Backend:  cd backend && php artisan serve
  Frontend: cd frontend && npm run dev

Access:
  Frontend: http://localhost:3000
  Backend:  http://localhost:8000/api

"@ -ForegroundColor Cyan
