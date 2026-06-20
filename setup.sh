#!/bin/bash
# World Cup 2026 Predictor - Setup Script (Linux/Mac)
set -e

echo "=== World Cup 2026 Predictor Setup ==="

# ---- BACKEND ----
echo -e "\n[1/5] Creating Laravel project..."
cd "$(dirname "$0")"

composer create-project laravel/laravel backend-temp --prefer-dist

# Copy our custom source files
cp -r backend/app/Models/. backend-temp/app/Models/
cp -r backend/app/Http/Controllers/Api/. backend-temp/app/Http/Controllers/Api/
cp -r backend/database/migrations/. backend-temp/database/migrations/
cp -r backend/database/seeders/. backend-temp/database/seeders/
cp backend/routes/api.php backend-temp/routes/api.php
cp backend/config/cors.php backend-temp/config/cors.php
cp backend/.env.example backend-temp/.env.example

rm -rf backend
mv backend-temp backend
echo "Laravel project ready."

# ---- BACKEND ENV ----
echo -e "\n[2/5] Setting up backend .env..."
cd backend
cp .env.example .env

echo ""
echo "IMPORTANT: Edit backend/.env with your PostgreSQL credentials before continuing."
echo "Press Enter when ready..."
read -r

php artisan key:generate
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\\Sanctum\\SanctumServiceProvider"

echo -e "\n[3/5] Running migrations and seeders..."
php artisan migrate --seed

# ---- FRONTEND ----
echo -e "\n[4/5] Setting up Next.js frontend..."
cd ../frontend
npm install
cp .env.local.example .env.local

echo -e "\n[5/5] Done!"
echo ""
echo "Start the app:"
echo "  Backend:  cd backend && php artisan serve"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000/api"
