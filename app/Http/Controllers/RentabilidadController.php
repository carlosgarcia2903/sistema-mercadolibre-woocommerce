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

        $variants = ProductVariant::query()
            ->whereHas('product', fn ($q) => $q->where('source', $source))
            ->with('product:id,name,source')
            ->get()
            ->sortBy([
                fn ($v) => $v->product->name ?? '',
                fn ($v) => $v->size ?? '',
            ])
            ->values();

        $rows = $variants->map(function (ProductVariant $v) use ($agg, $source) {
            $a = $agg->get($v->id);

            $units    = (int) ($a->units ?? 0);
            $netTotal = (float) ($a->net_total ?? 0);
            $feeTotal = (float) ($a->fee_total ?? 0);
            $cost     = $v->cost_price !== null ? (float) $v->cost_price : null;

            // Neto unitario: para ML, descuenta la comisión; si no hay ventas usa el precio venta.
            $netUnit = $units > 0
                ? $netTotal / $units
                : ($source === 'mercadolibre' ? null : (float) $v->sale_price);

            $costTotal   = $cost !== null ? $cost * $units : null;
            $profitTotal = ($cost !== null) ? $netTotal - $costTotal : null;
            $marginUnit  = ($cost !== null && $netUnit !== null) ? $netUnit - $cost : null;
            $marginPct   = ($marginUnit !== null && $netUnit > 0) ? ($marginUnit / $netUnit) * 100 : null;

            return [
                'id'            => $v->id,
                'product_name'  => $v->product->name ?? 'Sin nombre',
                'size'          => $v->size,
                'sku'           => $v->sku,
                'sale_price'    => (float) $v->sale_price,
                'cost_price'    => $cost,
                'units_sold'    => $units,
                'net_unit'      => $netUnit !== null ? round($netUnit) : null,
                'fee_total'     => round($feeTotal),
                'margin_unit'   => $marginUnit !== null ? round($marginUnit) : null,
                'margin_pct'    => $marginPct !== null ? round($marginPct, 1) : null,
                'profit_total'  => $profitTotal !== null ? round($profitTotal) : null,
                'cost_total'    => $costTotal !== null ? round($costTotal) : null,
            ];
        });

        // Resumen del periodo.
        $toPay       = $rows->whereNotNull('cost_total')->sum('cost_total');
        $totalSales  = $rows->sum(fn ($r) => $r['net_unit'] !== null ? $r['net_unit'] * $r['units_sold'] : 0);
        $totalProfit = $rows->whereNotNull('profit_total')->sum('profit_total');
        $unitsTotal  = $rows->sum('units_sold');
        $missingCost = $rows->where('units_sold', '>', 0)->whereNull('cost_price')->count();

        return Inertia::render('Rentabilidad/Index', [
            'tab'   => $tab,
            'month' => $month,
            'rows'  => $rows->values(),
            'summary' => [
                'to_pay'       => round($toPay),
                'total_sales'  => round($totalSales),
                'total_profit' => round($totalProfit),
                'units_total'  => $unitsTotal,
                'avg_margin'   => $totalSales > 0 ? round(($totalProfit / $totalSales) * 100, 1) : null,
                'missing_cost' => $missingCost,
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
