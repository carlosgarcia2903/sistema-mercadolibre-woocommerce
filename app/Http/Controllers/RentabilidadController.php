<?php

namespace App\Http\Controllers;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RentabilidadController extends Controller
{
    // Estados que NO se pagan al proveedor (cancelados / devueltos / reembolsados)
    protected array $excludedStatuses = [
        'cancelled', 'canceled', 'refunded', 'returned',
    ];

    public function index(Request $request)
    {
        $tab    = $request->query('tab', 'woocommerce');
        $source = $tab === 'mercadolibre' ? 'mercadolibre' : 'woocommerce';

        // Periodo: mes seleccionado (YYYY-MM), por defecto el mes actual.
        $month = $request->query('month', now()->format('Y-m'));
        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Throwable $e) {
            $start = now()->startOfMonth();
            $month = $start->format('Y-m');
        }
        $end = (clone $start)->endOfMonth();

        // Ventas individuales del periodo (una fila por sale).
        $sales = DB::table('sales')
            ->join('orders', 'sales.order_id', '=', 'orders.id')
            ->leftJoin('product_variants', 'sales.variant_id', '=', 'product_variants.id')
            ->leftJoin('products', 'product_variants.product_id', '=', 'products.id')
            ->where('orders.platform', $source)
            ->whereBetween('orders.ordered_at', [$start, $end])
            ->whereNotIn(DB::raw('LOWER(orders.status)'), $this->excludedStatuses)
            ->orderBy('orders.ordered_at')
            ->select(
                'orders.ordered_at',
                'orders.platform_order_id',
                'orders.customer_name',
                'products.name as product_name',
                'product_variants.size',
                'sales.quantity',
                'sales.unit_price',
                'sales.sale_fee',
                DB::raw('(sales.unit_price - sales.sale_fee) as net_unit'),
                DB::raw('(sales.unit_price - sales.sale_fee) * sales.quantity as net_total')
            )
            ->get();

        $rows = $sales->map(fn ($s) => [
            'ordered_at'        => $s->ordered_at,
            'platform_order_id' => $s->platform_order_id,
            'customer_name'     => $s->customer_name,
            'product_name'      => $s->product_name ?? 'Sin nombre',
            'size'              => $s->size,
            'quantity'          => (int) $s->quantity,
            'unit_price'        => round((float) $s->unit_price),
            'net_unit'          => round((float) $s->net_unit),
            'net_total'         => round((float) $s->net_total),
        ])->values();

        $unitsTotal = $rows->sum('quantity');
        $totalSales = $rows->sum('net_total');

        return Inertia::render('Rentabilidad/Index', [
            'tab'     => $tab,
            'month'   => $month,
            'rows'    => $rows->values(),
            'summary' => [
                'units_total' => $unitsTotal,
                'total_sales' => round($totalSales),
            ],
        ]);
    }

    public function updateCost(Request $request, ProductVariant $variant)
    {
        $data = $request->validate([
            'cost_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $variant->update(['cost_price' => $data['cost_price'] ?? null]);

        return response()->json([
            'id'         => $variant->id,
            'cost_price' => $variant->cost_price !== null ? (float) $variant->cost_price : null,
        ]);
    }
}
