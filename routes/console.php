<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sincronización incremental (desde las 00:00 de ayer) — cada 30 minutos
Schedule::command('sync:woocommerce')->everyThirtyMinutes()->withoutOverlapping();
Schedule::command('sync:mercadolibre')->everyThirtyMinutes()->withoutOverlapping();
Schedule::command('sync:falabella')->everyThirtyMinutes()->withoutOverlapping();
Schedule::command('sync:paris')->everyThirtyMinutes()->withoutOverlapping();
Schedule::command('ml:refresh-token')->cron('0 */5 * * *');
