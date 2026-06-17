<?php

namespace App\Console\Commands;

use App\Mail\EtiquetaDisponibleMl;
use App\Mail\NuevasOrdenesMl;
use App\Models\MlPdf;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Services\MercadoLibreService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
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
        $limit  = (int) $this->option('limit');
        $after  = $this->option('after') ?? now()->subDays(1)->startOfDay()->toIso8601ZuluString();
        $this->info("Fetching orders after: {$after}");

        // Órdenes que son nuevas en esta ejecución (para el correo)
        $ordenesNuevas = [];

        do {
            $data    = $ml->searchOrders($sellerId, $offset, $limit, $after);
            $results = $data['results'] ?? [];

            foreach ($results as $o) {
                $esNueva = !Order::where('platform', 'mercadolibre')
                    ->where('platform_order_id', (string) $o['id'])
                    ->exists();

                $order = Order::updateOrCreate(
                    ['platform' => 'mercadolibre', 'platform_order_id' => (string) $o['id']],
                    [
                        'status'         => $o['status'] ?? null,
                        'total'          => (float) ($o['total_amount'] ?? 0),
                        'currency'       => $o['currency_id'] ?? 'CLP',
                        'ordered_at'     => isset($o['date_created']) ? Carbon::parse($o['date_created']) : null,
                        'customer_name'  => $o['buyer']['nickname'] ?? null,
                        'customer_email' => $o['buyer']['email'] ?? null,
                        'raw_json'       => $o,
                    ]
                );

                $order->sales()->delete();
                $itemsParaCorreo = [];

                foreach ($o['order_items'] ?? [] as $item) {
                    $p       = $item['item'] ?? [];
                    $product = null;
                    $variant = null;
                    $size    = $this->extractMlSize($p);

                    if (!empty($p['id'])) {
                        $product = Product::updateOrCreate(
                            ['source' => 'mercadolibre', 'source_id' => (string) $p['id']],
                            [
                                'sku'         => $p['seller_custom_field'] ?? null,
                                'name'        => $p['title'] ?? 'Sin nombre',
                                'description' => null,
                                'price'       => (float) ($p['price'] ?? 0),
                                'stock'       => null,
                            ]
                        );

                        // El cost_price ingresado manualmente nunca se sobrescribe.
                        $variant = ProductVariant::updateOrCreate(
                            ['product_id' => $product->id, 'size' => $size],
                            [
                                'variant_source_id' => isset($p['variation_id']) ? (string) $p['variation_id'] : null,
                                'sku'               => $p['seller_custom_field'] ?? null,
                                'sale_price'        => (float) ($item['unit_price'] ?? 0),
                            ]
                        );
                    }

                    $saleFee = (float) ($item['sale_fee'] ?? 0);

                    Sale::create([
                        'order_id'   => $order->id,
                        'product_id' => $product?->id,
                        'variant_id' => $variant?->id,
                        'size'       => $size,
                        'quantity'   => (int) ($item['quantity'] ?? 1),
                        'unit_price' => (float) ($item['unit_price'] ?? 0),
                        'sale_fee'   => $saleFee,
                        'total'      => (float) ($item['unit_price'] ?? 0) * (int) ($item['quantity'] ?? 1),
                    ]);

                    $itemsParaCorreo[] = [
                        'name'       => $p['title'] ?? 'Sin nombre',
                        'size'       => $size,
                        'quantity'   => (int) ($item['quantity'] ?? 1),
                        'unit_price' => (float) ($item['unit_price'] ?? 0),
                        'total'      => (float) ($item['unit_price'] ?? 0) * (int) ($item['quantity'] ?? 1),
                    ];
                }

                // --- Envío / etiqueta ---
                $shipmentId   = $o['shipping']['id'] ?? null;
                $logisticType = null;
                $pdfPath      = null;

                if ($shipmentId) {
                    $pdfPath  = "mercadolibre/labels/{$shipmentId}.pdf";
                    $shipment = $ml->getShipment($shipmentId);
                    $logisticType      = $shipment['logistic_type'] ?? null;
                    $shipmentStatus    = $shipment['status'] ?? null;
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

                    // La etiqueta acaba de habilitarse (antes no existía, ahora sí)
                    $etiquetaRecienDisponible = $latestHistory
                        && empty($latestHistory->pdf_path)
                        && !empty($storedPdfPath);

                    $hasStatusChanged = !$latestHistory
                        || $latestHistory->order_id !== $order->id
                        || $latestHistory->logistic_type !== $logisticType
                        || $latestHistory->shipment_status !== $shipmentStatus
                        || $latestHistory->shipment_substatus !== $shipmentSubstatus
                        || $latestHistory->pdf_path !== $storedPdfPath;

                    if ($hasStatusChanged) {
                        MlPdf::create([
                            'order_id'             => $order->id,
                            'platform_shipment_id' => (string) $shipmentId,
                            'logistic_type'        => $logisticType,
                            'shipment_status'      => $shipmentStatus,
                            'shipment_substatus'   => $shipmentSubstatus,
                            'pdf_url'              => null,
                            'pdf_path'             => $storedPdfPath,
                            'downloaded_at'        => $storedPdfPath ? now() : null,
                        ]);
                    }

                    $pdfPath = $storedPdfPath;

                    // La etiqueta se acaba de habilitar en una orden que ya conocíamos
                    if ($etiquetaRecienDisponible && !$esNueva) {
                        try {
                            $this->info("Etiqueta recién disponible para orden #{$o['id']}, enviando correo...");
                            Mail::to('carlosgarcia.2903@gmail.com')
                                ->send(new EtiquetaDisponibleMl([
                                    'order_id'      => $o['id'],
                                    'customer'      => $o['buyer']['nickname'] ?? null,
                                    'logistic_type' => $logisticType,
                                    'pdf_path'      => $pdfPath,
                                ]));
                        } catch (\Throwable $e) {
                            $this->error("No se pudo enviar correo de etiqueta de orden #{$o['id']}: " . $e->getMessage());
                        }
                    }
                }

                // Enviar un correo por cada orden nueva
                if ($esNueva) {
                    try {
                        $this->info("Enviando correo para orden #{$o['id']}...");
                        Mail::to('carlosgarcia.2903@gmail.com')
                            ->send(new NuevasOrdenesMl([[
                                'order_id'      => $o['id'],
                                'customer'      => $o['buyer']['nickname'] ?? null,
                                'status'        => $o['status'] ?? null,
                                'total'         => (float) ($o['total_amount'] ?? 0),
                                'logistic_type' => $logisticType,
                                'pdf_path'      => $pdfPath,
                                'items'         => $itemsParaCorreo,
                            ]]));
                    } catch (\Throwable $e) {
                        $this->error("No se pudo enviar correo de orden #{$o['id']}: " . $e->getMessage());
                    }
                    $ordenesNuevas[] = $o['id'];
                }
            }

            $offset += $limit;
        } while (!empty($results));

        if (!empty($ordenesNuevas)) {
            $this->info('Correo enviado. ' . count($ordenesNuevas) . ' orden(es) nueva(s).');
        } else {
            $this->info('Sin órdenes nuevas, no se envía correo.');
        }

        $this->info('Mercado Libre sync complete.');
        return Command::SUCCESS;
    }

    /**
     * Extrae la talla desde los atributos de variación de un ítem de MercadoLibre.
     */
    protected function extractMlSize(array $item): ?string
    {
        foreach ($item['variation_attributes'] ?? [] as $attr) {
            $name = strtolower($attr['name'] ?? '');
            $id   = strtolower($attr['id'] ?? '');
            if (str_contains($name, 'talla') || str_contains($name, 'tamaño')
                || str_contains($id, 'size') || $id === 'size') {
                return ($attr['value_name'] ?? '') ?: null;
            }
        }

        // Si solo hay un atributo de variación, asumimos que es la talla.
        $attrs = $item['variation_attributes'] ?? [];
        if (count($attrs) === 1) {
            return ($attrs[0]['value_name'] ?? '') ?: null;
        }

        return null;
    }
}
