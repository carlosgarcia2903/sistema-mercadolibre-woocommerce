<?php

namespace App\Console\Commands;

use App\Models\MlClaim;
use App\Models\MlPdf;
use App\Models\Order;
use App\Services\MercadoLibreService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SyncMlClaims extends Command
{
    protected $signature = 'sync:ml-claims {--debug : muestra la respuesta cruda del primer reclamo} {--days=90 : ignora reclamos cerrados más antiguos}';

    protected $description = 'Trae reclamos y devoluciones de Mercado Libre y los asocia a su venta';

    public function handle(MercadoLibreService $ml): int
    {
        $sellerId = (string) config('services.mercadolibre.user_id');
        $cutoff = now()->subDays((int) $this->option('days'));
        $seen = 0;
        $fetchedDetails = 0;

        foreach (['opened' => 5, 'closed' => 3] as $status => $maxPages) {
            for ($page = 0; $page < $maxPages; $page++) {
                try {
                    $res = $ml->searchClaims(['status' => $status, 'limit' => 50, 'offset' => $page * 50]);
                } catch (\Throwable $e) {
                    $this->error("No se pudieron leer reclamos ({$status}): " . $e->getMessage());
                    $this->line('Si es un 403, la aplicación de Mercado Libre necesita el permiso de "Post-venta / Reclamos".');

                    return self::FAILURE;
                }

                $rows = $res['data'] ?? [];
                if ($this->option('debug') && $seen === 0 && $rows) {
                    $this->line(json_encode($rows[0], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                }

                foreach ($rows as $c) {
                    $updated = !empty($c['last_updated']) ? Carbon::parse($c['last_updated']) : null;
                    if ($status === 'closed' && $updated && $updated->lt($cutoff)) {
                        continue;
                    }
                    $seen++;

                    $existing = MlClaim::where('claim_id', (string) $c['id'])->first();
                    $changed = !$existing || !$existing->last_updated_at || !$updated || !$existing->last_updated_at->equalTo($updated);

                    $detail = $c;
                    $return = [];
                    if ($changed) {
                        $detail = $ml->getClaim($c['id']) ?: $c;
                        $fetchedDetails++;
                        $related = $detail['related_entities'] ?? [];
                        if (in_array('return', (array) $related, true)) {
                            $return = $ml->getClaimReturn($c['id']);
                        }
                    }

                    $this->store($detail, $return, $sellerId, $existing);
                }

                if (count($rows) < 50) {
                    break;
                }
            }
        }

        $this->info("Reclamos revisados: {$seen} (detalle consultado en {$fetchedDetails}).");

        return self::SUCCESS;
    }

    private function store(array $c, array $return, string $sellerId, ?MlClaim $existing): void
    {
        $players = $c['players'] ?? [];
        $seller = collect($players)->first(fn ($p) => ($p['type'] ?? null) === 'seller' || (string) ($p['user_id'] ?? '') === $sellerId);
        $needsAction = ($c['status'] ?? null) === 'opened' && !empty($seller['available_actions'] ?? []);

        $resolution = $c['resolution'] ?? [];
        $benefited = $resolution['benefited'] ?? null;
        $benefited = is_array($benefited) ? implode(',', $benefited) : $benefited;

        $r = $return['data'][0] ?? $return['results'][0] ?? $return;

        $order = $this->findOrder($c['resource'] ?? null, (string) ($c['resource_id'] ?? ''));

        MlClaim::updateOrCreate(
            ['claim_id' => (string) $c['id']],
            [
                'order_id' => $order?->id ?? $existing?->order_id,
                'resource' => $c['resource'] ?? null,
                'resource_id' => isset($c['resource_id']) ? (string) $c['resource_id'] : null,
                'type' => $c['type'] ?? null,
                'stage' => $c['stage'] ?? null,
                'status' => $c['status'] ?? null,
                'reason_id' => $c['reason_id'] ?? null,
                'needs_action' => $needsAction,
                'resolution_reason' => $resolution['reason'] ?? $existing?->resolution_reason,
                'resolution_benefited' => $benefited ?? $existing?->resolution_benefited,
                'resolution_closed_by' => $resolution['closed_by'] ?? $existing?->resolution_closed_by,
                'return_status' => $r['status'] ?? $existing?->return_status,
                'return_subtype' => $r['subtype'] ?? $existing?->return_subtype,
                'opened_at' => !empty($c['date_created']) ? Carbon::parse($c['date_created']) : null,
                'last_updated_at' => !empty($c['last_updated']) ? Carbon::parse($c['last_updated']) : null,
                'raw' => $c,
            ],
        );
    }

    /** Un reclamo apunta a una orden, un envío o un pago: se busca la venta de las tres formas. */
    private function findOrder(?string $resource, string $resourceId): ?Order
    {
        if ($resourceId === '') {
            return null;
        }

        $base = Order::where('platform', 'mercadolibre');

        return match ($resource) {
            'order' => (clone $base)->where('platform_order_id', $resourceId)->first(),
            'shipment' => ($pdf = MlPdf::where('platform_shipment_id', $resourceId)->whereNotNull('order_id')->latest('id')->first())
                ? Order::find($pdf->order_id) : null,
            'payment' => (clone $base)->where('raw_json', 'like', '%"id":' . $resourceId . '%')->first(),
            default => (clone $base)->where('platform_order_id', $resourceId)->first(),
        };
    }
}
