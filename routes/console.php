<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sincronización incremental (desde las 00:00 de ayer) — 8:00, 11:00, 13:00, 16:00, 20:00
Schedule::command('sync:woocommerce')->cron('0 8,11,13,16,20 * * *');
Schedule::command('sync:mercadolibre')->cron('0 8,11,13,16,20 * * *');
Schedule::command('ml:refresh-token')->cron('0 */5 * * *');
