FROM php:8.2-cli-alpine

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-install pdo pdo_pgsql zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

RUN composer config --global process-timeout 600 \
    && composer create-project laravel/laravel . --prefer-dist --no-interaction \
    && composer require laravel/sanctum guzzlehttp/guzzle --no-interaction \
    && php artisan vendor:publish --provider="Laravel\\Sanctum\\SanctumServiceProvider" --no-interaction \
    && find database/migrations -name '*personal_access_tokens*' -exec mv {} database/migrations/2026_06_20_064755_create_personal_access_tokens_table.php \;

COPY app/Models/           app/Models/
COPY app/Http/Controllers/ app/Http/Controllers/
COPY app/Console/Commands/ app/Console/Commands/
COPY database/migrations/  database/migrations/
COPY database/seeders/     database/seeders/
COPY routes/api.php        routes/api.php
COPY routes/console.php    routes/console.php
COPY config/cors.php       config/cors.php
COPY bootstrap/app.php     bootstrap/app.php
COPY .env.example          .env

RUN sed -i 's/^DB_HOST=.*/DB_HOST=postgres/' .env \
    && sed -i 's/^CACHE_DRIVER=.*/CACHE_DRIVER=file/' .env \
    && sed -i 's/^SESSION_DRIVER=.*/SESSION_DRIVER=file/' .env \
    && sed -i 's/^QUEUE_CONNECTION=.*/QUEUE_CONNECTION=sync/' .env \
    && php artisan key:generate --force

EXPOSE 8000

# Sync runtime env (from docker-compose) into .env so `artisan serve` forwards
# them to its child server process, then boot.
CMD ["sh", "-c", "sed -i \"s|^APP_URL=.*|APP_URL=${APP_URL}|; s|^FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_URL}|; s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS}|\" .env && php artisan config:clear && php artisan migrate --force && php artisan db:seed --force && php artisan serve --host=0.0.0.0 --port=8000"]
