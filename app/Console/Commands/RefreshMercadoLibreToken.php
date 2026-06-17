<?php

namespace App\Console\Commands;

use App\Services\MercadoLibreService;
use Illuminate\Console\Command;

class RefreshMercadoLibreToken extends Command
{
    protected $signature = 'ml:refresh-token';
    protected $description = 'Refresh Mercado Libre access token and update .env';

    public function handle(MercadoLibreService $ml)
    {
        try {
            $ml->refreshAccessToken(true);
            $this->info('Token refreshed.');
        } catch (\Throwable $e) {
            $this->error('Token refresh failed: ' . $e->getMessage());
        }

        return Command::SUCCESS;
    }
}
