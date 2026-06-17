<?php

namespace App\Console\Commands;

use App\Mail\NuevaOrdenWooCommerce;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Services\WooCommerceService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

class SyncWooCommerce extends Command
{
    protected $signature = 'sync:woocommerce {--after= : ISO8601 date to fetch orders after}';
    protected $description = 'Sync products and orders from WooCommerce';

    public function handle(WooCommerceService $wc)
    {
        if (!config('services.woocommerce.url')) {
            $this->error('WOOCOMMERCE_URL is not set in .env');
            return Command::FAILURE;
        }

        $this->info('Syncing products...');
        $page = 1;
        do {
            $products = $wc->fetchProducts($page, 50);
            foreach ($products as $p) {
                $product = Product::updateOrCreate(
                    ['source' => 'woocommerce', 'source_id' => (string) $p['id']],
                    [
                        'sku'         => $p['sku'] ?: null,
                        'name'        => $p['name'] ?? 'Sin nombre',
                        'description' => $p['short_description'] ?? null,
                        'price'       => (float) ($p['price'] ?? 0),
                        'stock'       => $p['stock_quantity'] ?? null,
                    ]
                );

                $this->syncWooVariants($wc, $product, $p);
            }
            $page++;
        } while (!empty($products));

        $this->info('Syncing orders...');
        $after = $this->option('after') ?? now()->subDays(1)->startOfDay()->toIso8601String();
        $this->info("Fetching orders after: {$after}");

        $nuevas = 0;
        $page   = 1;

        do {
            $orders = $wc->fetchOrders($page, 50, $after);

            foreach ($orders as $o) {
                $esNueva = !Order::where('platform', 'woocommerce')
                    ->where('platform_order_id', (string) $o['id'])
                    ->exists();

                $order = Order::updateOrCreate(
                    ['platform' => 'woocommerce', 'platform_order_id' => (string) $o['id']],
                    [
                        'status'         => $o['status'] ?? null,
                        'total'          => (float) ($o['total'] ?? 0),
                        'currency'       => $o['currency'] ?? 'CLP',
                        'ordered_at'     => isset($o['date_created_gmt']) ? Carbon::parse($o['date_created_gmt']) : null,
                        'customer_name'  => trim(($o['billing']['first_name'] ?? '') . ' ' . ($o['billing']['last_name'] ?? '')) ?: null,
                        'customer_email' => $o['billing']['email'] ?? null,
                        'raw_json'       => $o,
                    ]
                );

                $order->sales()->delete();
                foreach ($o['line_items'] ?? [] as $item) {
                    $product = Product::where('source', 'woocommerce')
                        ->where('source_id', (string) ($item['product_id'] ?? ''))
                        ->first();

                    $size = null;
                    foreach ($item['meta_data'] ?? [] as $meta) {
                        $key = strtolower($meta['key'] ?? '');
                        if (in_array($key, ['talla', 'pa_talla', 'attribute_pa_talla', 'attribute_talla'])) {
                            $size = is_array($meta['value']) ? json_encode($meta['value']) : (string) $meta['value'];
                            break;
                        }
                        if ($size === null && str_contains($key, 'talla')) {
                            $size = is_array($meta['value']) ? json_encode($meta['value']) : (string) $meta['value'];
                        }
                    }

                    $variant = $this->matchWooVariant($product, $item, $size);

                    Sale::create([
                        'order_id'   => $order->id,
                        'product_id' => $product?->id,
                        'variant_id' => $variant?->id,
                        'size'       => $size,
                        'quantity'   => (int) ($item['quantity'] ?? 1),
                        'unit_price' => (float) ($item['price'] ?? 0),
                        'sale_fee'   => 0, // WooCommerce no cobra comisión por venta
                        'total'      => (float) ($item['total'] ?? 0),
                    ]);
                }

                if ($esNueva) {
                    $nuevas++;
                    try {
                        $this->info("Enviando correo para orden #{$o['id']}...");
                        Mail::to('carlosgarcia.2903@gmail.com')
                            ->send(new NuevaOrdenWooCommerce($o));
                    } catch (\Throwable $e) {
                        $this->error("No se pudo enviar correo de orden #{$o['id']}: " . $e->getMessage());
                    }
                }
            }

            $page++;
        } while (!empty($orders));

        if ($nuevas > 0) {
            $this->info("Se enviaron {$nuevas} correo(s) con órdenes nuevas.");
        } else {
            $this->info('Sin órdenes nuevas, no se enviaron correos.');
        }

        $this->info('WooCommerce sync complete.');
        return Command::SUCCESS;
    }

    /**
     * Sincroniza las variaciones (tallas) de un producto WooCommerce.
     * Los productos simples (sin variaciones) generan una sola variante con size null.
     * El cost_price ingresado manualmente nunca se sobrescribe.
     */
    protected function syncWooVariants(WooCommerceService $wc, Product $product, array $p): void
    {
        $type = $p['type'] ?? 'simple';

        if ($type !== 'variable') {
            ProductVariant::updateOrCreate(
                ['product_id' => $product->id, 'size' => null],
                [
                    'variant_source_id' => (string) $p['id'],
                    'sku'               => $p['sku'] ?: null,
                    'sale_price'        => (float) ($p['price'] ?? 0),
                ]
            );
            return;
        }

        $vpage = 1;
        do {
            $variations = $wc->fetchProductVariations($p['id'], $vpage, 50);
            foreach ($variations as $v) {
                $size = $this->extractSizeFromAttributes($v['attributes'] ?? []);

                ProductVariant::updateOrCreate(
                    ['product_id' => $product->id, 'size' => $size],
                    [
                        'variant_source_id' => (string) ($v['id'] ?? ''),
                        'sku'               => ($v['sku'] ?? '') ?: null,
                        'sale_price'        => (float) ($v['price'] ?? 0),
                    ]
                );
            }
            $vpage++;
        } while (!empty($variations));
    }

    /**
     * Extrae la talla desde el arreglo de atributos de una variación WooCommerce.
     */
    protected function extractSizeFromAttributes(array $attributes): ?string
    {
        foreach ($attributes as $attr) {
            $name = strtolower($attr['name'] ?? '');
            if (str_contains($name, 'talla') || str_contains($name, 'size') || str_contains($name, 'tamaño')) {
                return ($attr['option'] ?? '') ?: null;
            }
        }

        // Si solo hay un atributo, asumimos que es la talla.
        if (count($attributes) === 1) {
            return ($attributes[0]['option'] ?? '') ?: null;
        }

        return null;
    }

    /**
     * Busca la variante que corresponde a una línea de pedido, por id de variación o por talla.
     */
    protected function matchWooVariant(?Product $product, array $item, ?string $size): ?ProductVariant
    {
        if (!$product) {
            return null;
        }

        $variationId = $item['variation_id'] ?? null;
        if ($variationId) {
            $variant = ProductVariant::where('product_id', $product->id)
                ->where('variant_source_id', (string) $variationId)
                ->first();
            if ($variant) {
                return $variant;
            }
        }

        return ProductVariant::where('product_id', $product->id)
            ->where('size', $size)
            ->first();
    }
}
