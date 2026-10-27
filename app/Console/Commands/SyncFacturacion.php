<?php

namespace App\Console\Commands;

use App\Models\TaxPeriodSync;
use App\Services\FacturacionSyncService;
use Illuminate\Console\Command;

class SyncFacturacion extends Command
{
    protected $signature = 'facturacion:sync {--period= : YYYYMM (por defecto el mes actual)} {--auto : modo programado: respeta pausas y reserva de cuota} {--force : ignora la pausa entre consultas}';

    protected $description = 'Actualiza ventas y compras del SII (RCV) vía SimpleAPI, gastando el mínimo de consultas';

    public function handle(FacturacionSyncService $svc): int
    {
        $auto = (bool) $this->option('auto');
        if ($auto && !config('services.simpleapi.auto_sync')) {
            $this->line('Sincronización automática desactivada (SIMPLEAPI_AUTO_SYNC=false).');

            return self::SUCCESS;
        }

        $periods = $this->option('period') ? [$this->option('period')] : [now()->format('Ym')];

        // El mes anterior se revisa hasta que quede guardado como cerrado.
        if (!$this->option('period')) {
            $prev = now()->subMonthNoOverflow()->format('Ym');
            $final = TaxPeriodSync::where('period', $prev)->where('is_final', true)->count();
            if ($final < count(FacturacionSyncService::DIRECTIONS) && TaxPeriodSync::where('period', $prev)->exists()) {
                array_unshift($periods, $prev);
            }
        }

        $minHours = $auto ? (int) config('services.simpleapi.auto_min_hours') : null;
        $reserve = $auto ? (int) config('services.simpleapi.reserve') : 0;

        foreach ($periods as $period) {
            foreach (FacturacionSyncService::DIRECTIONS as $dir) {
                $res = $svc->syncPeriod($dir, $period, (bool) $this->option('force'), $minHours, $reserve);
                $this->line("[{$period}] {$dir}: {$res['status']} — {$res['message']}");
            }
        }

        $this->info('Cuota del mes: ' . $svc->quotaUsed() . '/' . $svc->quota());

        return self::SUCCESS;
    }
}
