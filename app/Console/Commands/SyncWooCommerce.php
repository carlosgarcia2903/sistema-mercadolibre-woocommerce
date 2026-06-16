<?php

namespace App\Console\Commands;

use App\Mail\NuevaOrdenWooCommerce;
use App\Models\Order;
use App\Models\Product;
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
                Product::updateOrCreate(
                    ['source' => 'woocommerce', 'source_id' => (string) $p['id']],
                    [
                        'sku'         => $p['sku'] ?: null,
                        'name'        => $p['name'] ?? 'Sin nombre',
                        'description' => $p['short_description'] ?? null,
                        'price'       => (float) ($p['price'] ?? 0),
                        'stock'       => $p['stock_quantity'] ?? null,
                    ]
                );
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

                    Sale::create([
                        'order_id'   => $order->id,
                        'product_id' => $product?->id,
                        'size'       => $size,
                        'quantity'   => (int) ($item['quantity'] ?? 1),
                        'unit_price' => (float) ($item['price'] ?? 0),
                        'total'      => (float) ($item['total'] ?? 0),
                    ]);
                }

                if ($esNueva) {
                    $nuevas++;
                    $this->info("Enviando correo para orden #{$o['id']}...");
                    Mail::to('carlosgarcia.2903@gmail.com')
                        ->send(new NuevaOrdenWooCommerce($o));
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
}
