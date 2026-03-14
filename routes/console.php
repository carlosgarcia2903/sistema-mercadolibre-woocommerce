<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('sync:woocommerce')->everyTenMinutes();
Schedule::command('sync:mercadolibre')->everyTenMinutes();
Schedule::command('ml:refresh-token')->cron('0 */5 * * *');
