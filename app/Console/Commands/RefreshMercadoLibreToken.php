<?php

namespace App\Console\Commands;

use App\Services\MercadoLibreService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class RefreshMercadoLibreToken extends Command
{
    protected $signature = 'ml:refresh-token';
    protected $description = 'Refresh Mercado Libre access token and update .env';

    public function handle(MercadoLibreService $ml)
    {
        $data = $ml->refreshAccessToken();

        $envPath = base_path('.env');
        $env = File::get($envPath);

        $env = preg_replace('/^MERCADOLIBRE_TOKEN=.*$/m', 'MERCADOLIBRE_TOKEN='.$data['access_token'], $env);
        $env = preg_replace('/^MERCADOLIBRE_REFRESH_TOKEN=.*$/m', 'MERCADOLIBRE_REFRESH_TOKEN='.$data['refresh_token'], $env);

        File::put($envPath, $env);

        $this->info('Token refreshed.');
        return Command::SUCCESS;
    }
}
