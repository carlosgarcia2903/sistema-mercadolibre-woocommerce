<?php

namespace App\Console\Commands;

use App\Mail\NuevaOrdenParis;
use App\Models\MlPdf;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Services\ParisService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class SyncParis extends Command
{
    protected $signature = 'sync:paris {--after= : ISO8601 date to fetch orders from}';
    protected $description = 'Sync orders and shipping labels from Paris Marketplace';

    protected array $excludedStatuses = ['cancelled', 'canceled', 'returned', 'refunded'];

    public function handle(ParisService $paris)
    {
        if (!config('services.paris.url') || !config('services.paris.api_key')) {
            $this->error('PARIS_URL / PARIS_API_KEY no están configurados en .env');
            return Command::FAILURE;
        }

        $this->info('Syncing Paris Marketplace orders...');
        $after = $this->option('after') ?? now()->subDays(1)->startOfDay()->toIso8601String();
        $afterDate = Carbon::parse($after);
        $this->info("Fetching orders after: {$after}");

        // La API no filtra por fecha ni pagina de forma confiable (verificado):
        // trae todo y filtramos localmente.
        try {
            $allOrders = $paris->getOrders();
        } catch (\Throwable $e) {
            $this->error('No se pudo conectar con Paris Marketplace: ' . $e->getMessage());
            return Command::FAILURE;
        }

        $ordenesNuevas = [];
        $correosNuevos = [];

        foreach ($allOrders as $o) {
            $orderId = (string) ($o['originOrderNumber'] ?? '');
            if (!$orderId) {
                continue;
            }

            $orderedAt = $this->parseDate($o['originOrderDate'] ?? $o['createdAt'] ?? null);
            if ($orderedAt && $orderedAt->lt($afterDate)) {
                continue;
            }

            $esNueva = !Order::where('platform', 'paris')
                ->where('platform_order_id', $orderId)
                ->exists();

            // Una orden puede tener varios subOrders (envíos) con sus propios ítems.
            $subOrders = $o['subOrders'] ?? [];
            $items     = collect($subOrders)->flatMap(fn ($s) => $s['items'] ?? [])->all();

            $status = $this->extractStatus($subOrders);

            // Paris SÍ expone la comisión directamente por ítem — a diferencia de
            // Falabella, no es necesario estimarla en 0.
            $saleFees = collect($items)->sum(fn ($i) => (float) ($i['commission'] ?? 0));

            // Costo de envío: por ítem si viene, si no se usa el "cost" del subOrder.
            $shippingCost = collect($items)->sum(fn ($i) => (float) ($i['shippingCost'] ?? 0));
            if ($shippingCost === 0.0) {
                $shippingCost = collect($subOrders)->sum(fn ($s) => (float) ($s['cost'] ?? 0));
            }

            $total = collect($items)->sum(
                fn ($i) => (float) ($i['priceAfterDiscounts'] ?? $i['grossPrice'] ?? $i['basePrice'] ?? 0)
            );
            $received = $total - $saleFees - $shippingCost;

            $customerName = trim((string) ($o['customer']['name'] ?? '')) ?: null;

            $order = Order::updateOrCreate(
                ['platform' => 'paris', 'platform_order_id' => $orderId],
                [
                    'pack_id'         => null,
                    'status'          => $status,
                    'total'           => $total,
                    'shipping_cost'   => $shippingCost,
                    'sale_fees'       => $saleFees,
                    'received_amount' => $received,
                    'currency'        => 'CLP',
                    'ordered_at'      => $orderedAt,
                    'customer_name'   => $customerName,
                    'customer_email'  => $o['customer']['email'] ?? null,
                    'raw_json'        => $o,
                ]
            );

            $order->sales()->delete();
            $itemsParaCorreo = [];

            // Agrupar ítems por SKU vendedor.
            $agrupados = collect($items)->groupBy(fn ($i) => $i['sellerSku'] ?? $i['sku'] ?? 'sin-sku');

            foreach ($agrupados as $sku => $grupo) {
                $first    = $grupo->first();
                $name     = $first['name'] ?? 'Sin nombre';
                $size     = $this->cleanSize($first['size'] ?? null);
                $quantity = $grupo->count();
                $unit     = (float) ($first['priceAfterDiscounts'] ?? $first['grossPrice'] ?? $first['basePrice'] ?? 0);

                $product = Product::updateOrCreate(
                    ['source' => 'paris', 'source_id' => (string) $sku],
                    [
                        'sku'         => (string) $sku,
                        'name'        => $name,
                        'description' => null,
                        'price'       => $unit,
                        'stock'       => null,
                    ]
                );

                $variant = ProductVariant::updateOrCreate(
                    ['product_id' => $product->id, 'size' => $size],
                    ['sale_price' => $unit]
                );

                Sale::create([
                    'order_id'   => $order->id,
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size'       => $size,
                    'quantity'   => $quantity,
                    'unit_price' => $unit,
                    'sale_fee'   => 0,
                    'total'      => $unit * $quantity,
                ]);

                $itemsParaCorreo[] = [
                    'name'       => $name,
                    'size'       => $size,
                    'quantity'   => $quantity,
                    'unit_price' => $unit,
                    'total'      => $unit * $quantity,
                ];
            }

            // --- Etiqueta de envío: viene embebida en subOrders[].label[] ---
            $pdfPath = null;
            $labelUrl = collect($subOrders)
                ->flatMap(fn ($s) => $s['label'] ?? [])
                ->first(fn ($l) => ($l['format'] ?? null) === 'pdf')['url'] ?? null;

            if ($labelUrl) {
                $pdfPath = "paris/labels/{$orderId}.pdf";

                if (!Storage::disk('local')->exists($pdfPath)) {
                    $pdfBinary = $paris->downloadLabel($labelUrl);
                    if ($pdfBinary) {
                        Storage::disk('local')->put($pdfPath, $pdfBinary);
                    }
                }
            }

            $storedPdfPath = ($pdfPath && Storage::disk('local')->exists($pdfPath)) ? $pdfPath : null;

            $latestHistory = MlPdf::query()
                ->where('platform', 'paris')
                ->where('order_id', $order->id)
                ->orderByDesc('id')
                ->first();

            $hasChanged = !$latestHistory
                || $latestHistory->shipment_status !== $status
                || $latestHistory->pdf_path !== $storedPdfPath;

            if ($hasChanged) {
                MlPdf::create([
                    'order_id'             => $order->id,
                    'platform'             => 'paris',
                    'platform_shipment_id' => $orderId,
                    'logistic_type'        => null,
                    'shipment_status'      => $status,
                    'shipment_substatus'   => null,
                    'pdf_url'              => null,
                    'pdf_path'             => $storedPdfPath,
                    'downloaded_at'        => $storedPdfPath ? now() : null,
                ]);
            }

            if ($esNueva) {
                $correosNuevos[] = [
                    'order_id' => $orderId,
                    'customer' => $customerName,
                    'status'   => $status,
                    'pdf_path' => $storedPdfPath,
                    'items'    => $itemsParaCorreo,
                    'total'    => $total,
                ];
                $ordenesNuevas[] = $orderId;
            }
        }

        foreach ($correosNuevos as $datos) {
            try {
                $this->info("Enviando correo para orden {$datos['order_id']} (" . count($datos['items']) . " ítem(s))...");
                Mail::to('carlosgarcia.2903@gmail.com')->send(new NuevaOrdenParis($datos));
            } catch (\Throwable $e) {
                $this->error("No se pudo enviar correo de orden {$datos['order_id']}: " . $e->getMessage());
            }
        }

        if (!empty($ordenesNuevas)) {
            $this->info('Correo(s) enviado(s). ' . count($ordenesNuevas) . ' orden(es) nueva(s).');
        } else {
            $this->info('Sin órdenes nuevas, no se envía correo.');
        }

        $this->info('Paris Marketplace sync complete.');
        return Command::SUCCESS;
    }

    /**
     * Estado de la orden: se toma del primer subOrder (el nombre normalizado,
     * ej. "shipped", "delivered"). Si hay múltiples subOrders con distinto
     * estado, se usa el más reciente/relevante (el primero de la lista).
     */
    protected function extractStatus(array $subOrders): ?string
    {
        $name = $subOrders[0]['status']['name'] ?? null;

        return is_string($name) ? mb_strtolower($name) : null;
    }

    /**
     * El campo `size` ya viene como texto plano (ej. "0 A 3 Meses"). Solo se
     * normaliza el caso de "sin talla" (guion, vacío, "N/A").
     */
    protected function cleanSize(mixed $size): ?string
    {
        if (!is_string($size)) {
            return null;
        }

        $size = trim($size);

        return in_array(mb_strtolower($size), ['', '-', 'n/a', 'na', 'sin talla'], true) ? null : $size;
    }

    protected function parseDate(mixed $value): ?Carbon
    {
        if (!is_string($value) || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
