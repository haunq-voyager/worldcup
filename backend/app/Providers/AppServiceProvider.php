<?php

namespace App\Providers;

use App\Contracts\GoogleIdentityContract;
use App\Integrations\GoogleIdentityAdapter;
use Google\Client;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Client::class, function (): Client {
            $client = new Client();
            $client->setClientId((string) config('google.client_id'));

            return $client;
        });

        $this->app->bind(GoogleIdentityContract::class, GoogleIdentityAdapter::class);
    }

    public function boot(): void
    {
    }
}
