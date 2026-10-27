<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\MercadoLibreService;
use Illuminate\Console\Command;

class SyncMlUpdates extends Command
{
    protected $signature = 'sync:ml-updates {--days=45 : cuántos días hacia atrás revisar}';

    protected $description = 'Refresca estado y reembolsos de órdenes ML ya guardadas (cancelaciones y devoluciones tardías), sin recrear ventas ni enviar correos';

    public function handle(MercadoLibreService $ml): int
    {
        $sellerId = config('services.mercadolibre.user_id');
        if (!$sellerId) {
            $this->error('MERCADOLIBRE_USER_ID is not set in .env');

            return self::FAILURE;
        }

        $after = now()->subDays((int) $this->option('days'))->startOfDay()->toIso8601ZuluString();
        $offset = 0;
        $limit = 50;
        $checked = 0;
        $changed = 0;

        do {
            $data = $ml->searchOrders($sellerId, $offset, $limit, $after);
            $results = $data['results'] ?? [];

            foreach ($results as $o) {
                $order = Order::where('platform', 'mercadolibre')->where('platform_order_id', (string) $o['id'])->first();
                if (!$order) {
                    continue; // las órdenes nuevas las agrega sync:mercadolibre
                }
                $checked++;

                $status = $o['status'] ?? null;
                $refunded = Order::refundedFromMl($o);

                if ($order->status !== $status || (float) $order->refunded_amount !== $refunded) {
                    $this->line("#{$order->platform_order_id}: {$order->status} → {$status}, reembolsado {$order->refunded_amount} → {$refunded}");
                    $changed++;
                }

                $order->update(['status' => $status, 'refunded_amount' => $refunded, 'raw_json' => $o]);
            }

            $offset += $limit;
            $total = $data['paging']['total'] ?? 0;
        } while ($offset < $total);

        $this->info("Revisadas {$checked} órdenes, {$changed} con cambios.");

        return self::SUCCESS;
    }
}
