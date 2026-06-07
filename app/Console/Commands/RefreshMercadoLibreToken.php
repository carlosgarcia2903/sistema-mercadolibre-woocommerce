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
        $ml->refreshAccessToken(true);

        $this->info('Token refreshed.');
        return Command::SUCCESS;
    }
}
