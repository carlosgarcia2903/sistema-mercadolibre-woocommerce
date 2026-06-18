<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\MercadoLibreService;
use Illuminate\Console\Command;

class SyncMlVariants extends Command
{
    protected $signature = 'sync:ml-variants {--only-missing : Solo productos sin variantes}';
    protected $description = 'Fetch all tallas for every MercadoLibre product from /items/{id}';

    public function handle(MercadoLibreService $ml)
    {
        $query = Product::query()->where('source', 'mercadolibre');

        if ($this->option('only-missing')) {
            $query->whereDoesntHave('variants');
        }

        $products = $query->get();
        $total    = $products->count();

        $this->info("Sincronizando variantes de {$total} productos ML...");
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $created = 0;

        foreach ($products as $product) {
            try {
                $itemData   = $ml->getItem($product->source_id);
                $variations = $itemData['variations'] ?? [];

                if (empty($variations)) {
                    ProductVariant::updateOrCreate(
                        ['product_id' => $product->id, 'size' => null],
                        ['sale_price' => (float) ($itemData['price'] ?? $product->price)]
                    );
                    $created++;
                } else {
                    $tallasVistas = [];
                    foreach ($variations as $v) {
                        $size  = null;
                        $price = (float) ($v['price'] ?? $product->price);

                        foreach ($v['attribute_combinations'] ?? [] as $attr) {
                            $id   = strtolower($attr['id'] ?? '');
                            $name = strtolower($attr['name'] ?? '');
                            if ($id === 'size' || str_contains($name, 'talla') || str_contains($name, 'tamaño')) {
                                $size = ($attr['value_name'] ?? '') ?: null;
                                break;
                            }
                        }

                        if ($size === null || isset($tallasVistas[$size])) continue;
                        $tallasVistas[$size] = true;

                        ProductVariant::updateOrCreate(
                            ['product_id' => $product->id, 'size' => $size],
                            ['sale_price' => $price]
                        );
                        $created++;
                    }

                    // Solo color sin talla → variante única con size null
                    if (empty($tallasVistas)) {
                        ProductVariant::updateOrCreate(
                            ['product_id' => $product->id, 'size' => null],
                            ['sale_price' => (float) ($itemData['price'] ?? $product->price)]
                        );
                        $created++;
                    }
                }
            } catch (\Throwable $e) {
                $this->newLine();
                $this->error("Error en producto #{$product->source_id} ({$product->name}): " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Listo. {$created} variante(s) creadas/actualizadas.");

        return Command::SUCCESS;
    }
}
