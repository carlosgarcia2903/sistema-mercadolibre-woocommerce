<?php

namespace App\Console\Commands;

use App\Mail\NuevaOrdenFalabella;
use App\Models\MlPdf;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Services\FalabellaService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class SyncFalabella extends Command
{
    protected $signature = 'sync:falabella {--offset=0} {--limit=100} {--after= : ISO8601 date to fetch orders from}';
    protected $description = 'Sync orders and shipping labels from Falabella Seller Center';

    public function handle(FalabellaService $fb)
    {
        if (!config('services.falabella.user_id') || !config('services.falabella.api_key')) {
            $this->error('FALABELLA_USER_ID / FALABELLA_API_KEY no están configurados en .env');
            return Command::FAILURE;
        }

        $this->info('Syncing Falabella orders...');
        $offset = (int) $this->option('offset');
        $limit  = (int) $this->option('limit');
        $after  = $this->option('after') ?? now()->subDays(1)->startOfDay()->toIso8601String();
        $afterDate = Carbon::parse($after);
        $this->info("Fetching orders after: {$after}");

        $ordenesNuevas = [];
        $correosNuevos = [];

        do {
            // OJO: no se envía CreatedAfter a la API. Se comprobó que el filtro de
            // fecha de Falabella tiene una ventana de lookback no documentada — con
            // fechas de más de ~1 mes atrás, la API devuelve 0 resultados aunque
            // existan órdenes reales dentro de ese rango. Se trae todo y se filtra
            // la fecha del lado del cliente, igual que se hizo para Paris.
            $orders = $fb->getOrders(null, $offset, $limit);

            foreach ($orders as $o) {
                $orderId = (string) ($o['OrderId'] ?? $o['OrderNumber'] ?? null);
                if (!$orderId) {
                    continue;
                }

                $orderedAt = isset($o['CreatedAt']) ? $this->parseDate($o['CreatedAt']) : null;
                if ($orderedAt && $orderedAt->lt($afterDate)) {
                    continue;
                }

                $esNueva = !Order::where('platform', 'falabella')
                    ->where('platform_order_id', $orderId)
                    ->exists();

                // Los ítems (con precios y SKU) requieren una llamada aparte.
                $items = $fb->getOrderItems($orderId);

                // Costo de envío a cargo del vendedor (si el payload lo incluye).
                $shippingCost = collect($items)->sum(
                    fn ($i) => (float) ($i['ShippingServiceCost'] ?? 0)
                );

                // Falabella NO expone la comisión de venta en GetOrderItems: vive en
                // la API de finanzas/liquidaciones (fase 2). Por ahora queda en 0, de
                // modo que received = total - envío (estimado).
                $saleFees = 0.0;

                $total    = (float) ($o['Price'] ?? collect($items)->sum(fn ($i) => (float) ($i['PaidPrice'] ?? 0)));
                $received = $total - $saleFees - $shippingCost;

                $status = $this->extractStatus($o, $items);

                $order = Order::updateOrCreate(
                    ['platform' => 'falabella', 'platform_order_id' => $orderId],
                    [
                        'pack_id'         => null,
                        'status'          => $status,
                        'total'           => $total,
                        'shipping_cost'   => $shippingCost,
                        'sale_fees'       => $saleFees,
                        'received_amount' => $received,
                        'currency'        => $items[0]['Currency'] ?? 'CLP',
                        'ordered_at'      => $orderedAt,
                        'customer_name'   => trim(($o['CustomerFirstName'] ?? '') . ' ' . ($o['CustomerLastName'] ?? '')) ?: null,
                        'customer_email'  => null,
                        'raw_json'        => ['order' => $o, 'items' => $items],
                    ]
                );

                $order->sales()->delete();
                $itemsParaCorreo = [];
                $orderItemIds    = [];

                // Agrupar ítems por SKU (Falabella trae una línea por unidad).
                $agrupados = collect($items)->groupBy(fn ($i) => $i['Sku'] ?? $i['ShopSku'] ?? 'sin-sku');

                foreach ($agrupados as $sku => $lineas) {
                    $first    = $lineas->first();
                    $name     = $first['Name'] ?? 'Sin nombre';
                    $size     = $this->extractSize($first);
                    $quantity = $lineas->count();
                    $unit     = (float) ($first['ItemPrice'] ?? $first['PaidPrice'] ?? 0);

                    foreach ($lineas as $l) {
                        if (!empty($l['OrderItemId'])) {
                            $orderItemIds[] = (string) $l['OrderItemId'];
                        }
                    }

                    $product = Product::updateOrCreate(
                        ['source' => 'falabella', 'source_id' => (string) $sku],
                        [
                            'sku'         => $first['ShopSku'] ?? $sku,
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

                // --- Etiqueta de envío (GetDocument) ---
                $pdfPath = null;
                if (!empty($orderItemIds)) {
                    $pdfPath = "falabella/labels/{$orderId}.pdf";

                    if (!Storage::disk('local')->exists($pdfPath)) {
                        $pdfBinary = $fb->getDocument($orderItemIds, 'shippingLabel');
                        if ($pdfBinary) {
                            Storage::disk('local')->put($pdfPath, $pdfBinary);
                        }
                    }

                    $storedPdfPath = Storage::disk('local')->exists($pdfPath) ? $pdfPath : null;

                    $latestHistory = MlPdf::query()
                        ->where('platform', 'falabella')
                        ->where('order_id', $order->id)
                        ->orderByDesc('id')
                        ->first();

                    $hasChanged = !$latestHistory
                        || $latestHistory->shipment_status !== $status
                        || $latestHistory->pdf_path !== $storedPdfPath;

                    if ($hasChanged) {
                        MlPdf::create([
                            'order_id'             => $order->id,
                            'platform'             => 'falabella',
                            'platform_shipment_id' => $orderId,
                            'logistic_type'        => null,
                            'shipment_status'      => $status,
                            'shipment_substatus'   => null,
                            'pdf_url'              => null,
                            'pdf_path'             => $storedPdfPath,
                            'downloaded_at'        => $storedPdfPath ? now() : null,
                        ]);
                    }

                    $pdfPath = $storedPdfPath;
                }

                if ($esNueva) {
                    $correosNuevos[] = [
                        'order_id' => $orderId,
                        'customer' => $order->customer_name,
                        'status'   => $status,
                        'pdf_path' => $pdfPath,
                        'items'    => $itemsParaCorreo,
                        'total'    => $total,
                    ];
                    $ordenesNuevas[] = $orderId;
                }
            }

            $offset += $limit;
        } while (!empty($orders) && count($orders) === $limit);

        foreach ($correosNuevos as $datos) {
            try {
                $this->info("Enviando correo para orden {$datos['order_id']} (" . count($datos['items']) . " ítem(s))...");
                Mail::to('carlosgarcia.2903@gmail.com')->send(new NuevaOrdenFalabella($datos));
            } catch (\Throwable $e) {
                $this->error("No se pudo enviar correo de orden {$datos['order_id']}: " . $e->getMessage());
            }
        }

        if (!empty($ordenesNuevas)) {
            $this->info('Correo(s) enviado(s). ' . count($ordenesNuevas) . ' orden(es) nueva(s).');
        } else {
            $this->info('Sin órdenes nuevas, no se envía correo.');
        }

        $this->info('Falabella sync complete.');
        return Command::SUCCESS;
    }

    /**
     * Extrae el estado de la orden (Falabella lo entrega en Statuses o por ítem).
     */
    protected function extractStatus(array $order, array $items): ?string
    {
        // El estado por ítem es el más confiable (viene siempre como string plano).
        if (!empty($items[0]['Status']) && is_string($items[0]['Status'])) {
            return $items[0]['Status'];
        }

        // Fallback: Statuses.Status a nivel de orden. La API es inconsistente en
        // cómo envuelve este campo (string plano, lista de strings, o lista de
        // objetos {Status: "..."}), así que probamos las variantes conocidas.
        $statuses = data_get($order, 'Statuses.Status') ?? data_get($order, 'Statuses');

        if (is_string($statuses)) {
            return $statuses;
        }

        if (is_array($statuses)) {
            $first = $statuses[0] ?? reset($statuses);
            if (is_string($first)) {
                return $first;
            }
            if (is_array($first) && isset($first['Status']) && is_string($first['Status'])) {
                return $first['Status'];
            }
        }

        return null;
    }

    /**
     * Extrae la talla desde el campo Variation del ítem.
     *
     * Formatos observados en la API: "{}" o "[]" (sin variación), JSON tipo
     * {"Talla":"M"}/{"Color":"Rojo","Talla":"M"}, o el formato clásico
     * "Talla:M" / "Color:Rojo,Talla:M".
     */
    protected function extractSize(array $item): ?string
    {
        $variation = trim((string) ($item['Variation'] ?? ''));

        if (in_array($variation, ['', '0', '{}', '[]', 'null'], true)) {
            return null;
        }

        $decoded = json_decode($variation, true);
        if (is_array($decoded)) {
            foreach ($decoded as $key => $value) {
                if ($this->isSizeKey((string) $key)) {
                    return is_scalar($value) ? (trim((string) $value) ?: null) : null;
                }
            }
            return null;
        }

        // Formato clásico "Talla:M" o "Color:Rojo,Talla:M".
        foreach (explode(',', $variation) as $pair) {
            if (!str_contains($pair, ':')) {
                continue;
            }
            [$key, $value] = array_map('trim', explode(':', $pair, 2));
            if ($this->isSizeKey($key)) {
                return $value ?: null;
            }
        }

        // Variación de un solo valor sin clave (ej. "M").
        return !str_contains($variation, ':') ? ($variation ?: null) : null;
    }

    protected function isSizeKey(string $key): bool
    {
        $key = mb_strtolower($key);
        return str_contains($key, 'talla') || str_contains($key, 'size') || str_contains($key, 'tamaño');
    }

    protected function parseDate(string $value): ?Carbon
    {
        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
