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

        // Ventas válidas del periodo agregadas por variante.
        $agg = DB::table('sales')
            ->join('orders', 'sales.order_id', '=', 'orders.id')
            ->whereNotNull('sales.variant_id')
            ->where('orders.platform', $source)
            ->whereBetween('orders.ordered_at', [$start, $end])
            ->whereNotIn(DB::raw('LOWER(orders.status)'), $this->excludedStatuses)
            ->groupBy('sales.variant_id')
            ->select(
                'sales.variant_id',
                DB::raw('SUM(sales.quantity) as units'),
                DB::raw('SUM(sales.unit_price * sales.quantity) as gross_total'),
                DB::raw('SUM(sales.sale_fee * sales.quantity) as fee_total'),
                DB::raw('SUM((sales.unit_price - sales.sale_fee) * sales.quantity) as net_total')
            )
            ->get()
            ->keyBy('variant_id');

        // Solo variantes que tienen ventas en el periodo seleccionado.
        $variantIds = $agg->keys()->filter()->values();

        $variants = ProductVariant::query()
            ->whereIn('id', $variantIds)
            ->with('product:id,name,source')
            ->get()
            ->sortBy([
                fn ($v) => $v->product->name ?? '',
                fn ($v) => $v->size ?? '',
            ])
            ->values();

        $rows = $variants->map(function (ProductVariant $v) use ($agg, $source) {
            $a        = $agg->get($v->id);
            $units    = (int) ($a->units ?? 0);
            $netTotal = (float) ($a->net_total ?? 0);
            $netUnit  = $units > 0 ? round($netTotal / $units) : round((float) $v->sale_price);

            return [
                'id'           => $v->id,
                'product_name' => $v->product->name ?? 'Sin nombre',
                'size'         => $v->size,
                'sale_price'   => round((float) $v->sale_price),
                'units_sold'   => $units,
                'net_unit'     => $netUnit,
                'net_total'    => round($netTotal),
            ];
        });

        $unitsTotal = $rows->sum('units_sold');
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
