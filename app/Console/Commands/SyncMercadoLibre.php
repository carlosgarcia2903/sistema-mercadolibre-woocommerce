<?php

namespace App\Console\Commands;

use App\Models\MlPdf;
use App\Models\Order;
use App\Models\Product;
use App\Models\Sale;
use App\Services\MercadoLibreService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class SyncMercadoLibre extends Command
{
    protected $signature = 'sync:mercadolibre {--offset=0} {--limit=50} {--after= : ISO8601 date to fetch orders from}';
    protected $description = 'Sync orders and labels from Mercado Libre';

    public function handle(MercadoLibreService $ml)
    {
        $sellerId = config('services.mercadolibre.user_id');
        if (!$sellerId) {
            $this->error('MERCADOLIBRE_USER_ID is not set in .env');
            return Command::FAILURE;
        }

        $this->info('Syncing Mercado Libre orders...');
        $offset = (int) $this->option('offset');
        $limit = (int) $this->option('limit');
        $after = $this->option('after') ?? now()->subDays(3)->toIso8601String();
        $this->info("Fetching orders after: {$after}");

        do {
            $data = $ml->searchOrders($sellerId, $offset, $limit, $after);
            $results = $data['results'] ?? [];

            foreach ($results as $o) {
                $order = Order::updateOrCreate(
                    ['platform' => 'mercadolibre', 'platform_order_id' => (string) $o['id']],
                    [
                        'status' => $o['status'] ?? null,
                        'total' => (float) ($o['total_amount'] ?? 0),
                        'currency' => $o['currency_id'] ?? 'CLP',
                        'ordered_at' => isset($o['date_created']) ? Carbon::parse($o['date_created']) : null,
                        'customer_name' => $o['buyer']['nickname'] ?? null,
                        'customer_email' => $o['buyer']['email'] ?? null,
                        'raw_json' => $o,
                    ]
                );

                $order->sales()->delete();
                foreach ($o['order_items'] ?? [] as $item) {
                    $p = $item['item'] ?? [];
                    $product = null;
                    if (!empty($p['id'])) {
                        $product = Product::updateOrCreate(
                            ['source' => 'mercadolibre', 'source_id' => (string) $p['id']],
                            [
                                'sku' => $p['seller_custom_field'] ?? null,
                                'name' => $p['title'] ?? 'Sin nombre',
                                'description' => null,
                                'price' => (float) ($p['price'] ?? 0),
                                'stock' => null,
                            ]
                        );
                    }

                    Sale::create([
                        'order_id' => $order->id,
                        'product_id' => $product?->id,
                        'quantity' => (int) ($item['quantity'] ?? 1),
                        'unit_price' => (float) ($item['unit_price'] ?? 0),
                        'total' => (float) ($item['unit_price'] ?? 0) * (int) ($item['quantity'] ?? 1),
                    ]);
                }

                $shipmentId = $o['shipping']['id'] ?? null;
                if ($shipmentId) {
                    $pdfPath = "mercadolibre/labels/{$shipmentId}.pdf";
                    $pdfBinary = null;
                    $shipment = $ml->getShipment($shipmentId);
                    $logisticType = $shipment['logistic_type'] ?? null;
                    $shipmentStatus = $shipment['status'] ?? null;
                    $shipmentSubstatus = $shipment['substatus'] ?? null;

                    if (!Storage::disk('local')->exists($pdfPath)) {
                        $pdfBinary = $ml->getShipmentLabel($shipmentId);
                        if ($pdfBinary) {
                            Storage::disk('local')->put($pdfPath, $pdfBinary);
                        }
                    }

                    $storedPdfPath = Storage::disk('local')->exists($pdfPath) ? $pdfPath : null;

                    $latestHistory = MlPdf::query()
                        ->where('platform_shipment_id', (string) $shipmentId)
                        ->orderByDesc('id')
                        ->first();

                    $hasStatusChanged = !$latestHistory
                        || $latestHistory->order_id !== $order->id
                        || $latestHistory->logistic_type !== $logisticType
                        || $latestHistory->shipment_status !== $shipmentStatus
                        || $latestHistory->shipment_substatus !== $shipmentSubstatus
                        || $latestHistory->pdf_path !== $storedPdfPath;

                    if ($hasStatusChanged) {
                        MlPdf::create([
                            'order_id' => $order->id,
                            'platform_shipment_id' => (string) $shipmentId,
                            'logistic_type' => $logisticType,
                            'shipment_status' => $shipmentStatus,
                            'shipment_substatus' => $shipmentSubstatus,
                            'pdf_url' => null,
                            'pdf_path' => $storedPdfPath,
                            'downloaded_at' => $storedPdfPath ? now() : null,
                        ]);
                    }
                }
            }

            $offset += $limit;
        } while (!empty($results));

        $this->info('Mercado Libre sync complete.');
        return Command::SUCCESS;
    }
}
