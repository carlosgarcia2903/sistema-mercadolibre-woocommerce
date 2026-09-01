<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PosController extends Controller
{
    // Cantidad mínima de la misma talla para que aplique el precio mayorista.
    const WHOLESALE_MIN_QTY = 3;

    public function index()
    {
        $products = Product::query()
            ->where('source', 'presencial')
            ->with(['variants' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')])
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => $this->serializeProduct($p));

        return Inertia::render('Pos/Index', [
            'products' => $products,
            'wholesaleMinQty' => self::WHOLESALE_MIN_QTY,
        ]);
    }

    public function storeProduct(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        $product = Product::create([
            'name' => $data['name'],
            'source' => 'presencial',
            'price' => 0,
        ]);

        if ($request->hasFile('image')) {
            $product->update(['image_path' => $this->storeImage($request)]);
        }

        return back()->with('success', 'Producto creado.');
    }

    public function updateProduct(Request $request, Product $product)
    {
        $this->ensurePresencial($product);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        $product->name = $data['name'];

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $product->image_path = $this->storeImage($request);
        }

        $product->save();

        return back()->with('success', 'Producto actualizado.');
    }

    public function destroyProduct(Product $product)
    {
        $this->ensurePresencial($product);

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }
        $product->delete();

        return back()->with('success', 'Producto eliminado.');
    }

    public function storeVariant(Request $request, Product $product)
    {
        $this->ensurePresencial($product);

        $data = $request->validate([
            'size' => ['nullable', 'string', 'max:50'],
            'sale_price' => ['required', 'numeric', 'min:0'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $nextOrder = (int) $product->variants()->max('sort_order') + 1;

        $product->variants()->create([
            'size' => $data['size'] ?: null,
            'sort_order' => $nextOrder,
            'sale_price' => $data['sale_price'],
            'wholesale_price' => $data['wholesale_price'] ?: null,
        ]);

        return back()->with('success', 'Talla agregada.');
    }

    public function reorderVariants(Request $request, Product $product)
    {
        $this->ensurePresencial($product);

        $data = $request->validate([
            'variant_ids' => ['required', 'array'],
            'variant_ids.*' => ['integer', 'exists:product_variants,id'],
        ]);

        $ids = $product->variants()->pluck('id');
        abort_unless(collect($data['variant_ids'])->sort()->values()->all() === $ids->sort()->values()->all(), 422);

        foreach ($data['variant_ids'] as $index => $variantId) {
            ProductVariant::where('id', $variantId)->update(['sort_order' => $index]);
        }

        return back()->with('success', 'Orden actualizado.');
    }

    public function updateVariant(Request $request, ProductVariant $variant)
    {
        $this->ensurePresencial($variant->product);

        $data = $request->validate([
            'size' => ['nullable', 'string', 'max:50'],
            'sale_price' => ['required', 'numeric', 'min:0'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $variant->update([
            'size' => $data['size'] ?: null,
            'sale_price' => $data['sale_price'],
            'wholesale_price' => $data['wholesale_price'] ?: null,
        ]);

        return back()->with('success', 'Talla actualizada.');
    }

    public function destroyVariant(ProductVariant $variant)
    {
        $this->ensurePresencial($variant->product);

        $variant->delete();

        return back()->with('success', 'Talla eliminada.');
    }

    public function checkout(Request $request)
    {
        $data = $request->validate([
            'customer_name' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $variantIds = collect($data['items'])->pluck('variant_id')->unique();
        $variants = ProductVariant::with('product')
            ->whereIn('id', $variantIds)
            ->get()
            ->keyBy('id');

        foreach ($variants as $variant) {
            $this->ensurePresencial($variant->product);
        }

        $order = DB::transaction(function () use ($data, $variants) {
            $order = Order::create([
                'platform' => 'presencial',
                'platform_order_id' => $this->nextOrderNumber(),
                'status' => 'paid',
                'total' => 0,
                'shipping_cost' => 0,
                'sale_fees' => 0,
                'received_amount' => 0,
                'currency' => 'CLP',
                'ordered_at' => now(),
                'customer_name' => $data['customer_name'] ?? null,
            ]);

            $total = 0;

            foreach ($data['items'] as $item) {
                $variant = $variants[$item['variant_id']];
                $qty = (int) $item['quantity'];
                $unitPrice = $this->effectiveUnitPrice($variant, $qty);
                $lineTotal = $unitPrice * $qty;
                $total += $lineTotal;

                Sale::create([
                    'order_id' => $order->id,
                    'product_id' => $variant->product_id,
                    'variant_id' => $variant->id,
                    'size' => $variant->size,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'sale_fee' => 0,
                    'total' => $lineTotal,
                ]);
            }

            $order->update([
                'total' => $total,
                'received_amount' => $total,
            ]);

            return $order;
        });

        return back()->with('success', "Venta registrada #{$order->platform_order_id} por " . number_format($order->total, 0, ',', '.'));
    }

    protected function effectiveUnitPrice(ProductVariant $variant, int $qty): float
    {
        if ($variant->wholesale_price !== null && $qty >= self::WHOLESALE_MIN_QTY) {
            return (float) $variant->wholesale_price;
        }

        return (float) $variant->sale_price;
    }

    protected function nextOrderNumber(): string
    {
        do {
            $seq = Order::where('platform', 'presencial')->count() + 1;
            $number = 'PDV-' . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
        } while (Order::where('platform', 'presencial')->where('platform_order_id', $number)->exists());

        return $number;
    }

    protected function storeImage(Request $request): string
    {
        return $request->file('image')->store('pos', 'public');
    }

    protected function ensurePresencial(Product $product): void
    {
        abort_unless($product->source === 'presencial', 404);
    }

    protected function serializeProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'image_url' => $product->image_path ? Storage::disk('public')->url($product->image_path) : null,
            'variants' => $product->variants->map(fn ($v) => [
                'id' => $v->id,
                'size' => $v->size,
                'sale_price' => (float) $v->sale_price,
                'wholesale_price' => $v->wholesale_price !== null ? (float) $v->wholesale_price : null,
            ]),
        ];
    }
}
