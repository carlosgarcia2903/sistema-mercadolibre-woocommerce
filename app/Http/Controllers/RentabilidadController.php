<?php

namespace App\Http\Controllers;

use App\Models\ProductVariant;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RentabilidadController extends Controller
{
    protected array $excludedStatuses = [
        'cancelled', 'canceled', 'refunded', 'returned',
    ];

    public function index(Request $request)
    {
        $tab      = $request->query('tab', 'mercadolibre');
        $platform = in_array($tab, ['mercadolibre', 'falabella', 'paris', 'presencial', 'woocommerce'], true) ? $tab : 'woocommerce';
        // ML, Falabella, Paris y presencial almacenan received_amount a nivel de orden → usan neto recibido.
        $isMl     = in_array($platform, ['mercadolibre', 'falabella', 'paris', 'presencial'], true);

        $month = $request->query('month', now()->format('Y-m'));
        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Throwable) {
            $start = now()->startOfMonth();
            $month = $start->format('Y-m');
        }
        $end = (clone $start)->endOfMonth();

        // Cargar todas las ventas del período con sus relaciones
        $sales = Sale::query()
            ->with(['product', 'variant', 'order'])
            ->whereHas('order', fn ($q) => $q
                ->where('platform', $platform)
                ->whereBetween('ordered_at', [$start, $end])
                ->whereNotIn(DB::raw('LOWER(status)'), $this->excludedStatuses)
            )
            ->get();

        // Para ML: pre-calcular received proporcional por sale dentro de cada orden.
        // received proporcional = order.received_amount × (sale.total / sum_totals_en_esa_orden)
        $orderReceivedMap = []; // order_id → received_amount
        $orderTotalsMap   = []; // order_id → sum of sale.total en esa orden

        if ($isMl) {
            foreach ($sales as $sale) {
                $oid = $sale->order_id;
                if (!isset($orderReceivedMap[$oid])) {
                    $orderReceivedMap[$oid] = (float) ($sale->order->received_amount ?? 0);
                    $orderTotalsMap[$oid]   = 0;
                }
                $orderTotalsMap[$oid] += (float) $sale->total;
            }
        }

        // Agrupar por producto
        $byProduct = [];

        foreach ($sales as $sale) {
            $productId   = $sale->product_id ?? 0;
            $productName = $sale->product?->name ?? 'Sin nombre';
            $qty         = (int) $sale->quantity;
            $gross       = (float) $sale->total;
            $costUnit    = $sale->variant?->cost_price !== null
                ? (float) $sale->variant->cost_price
                : null;

            // Received proporcional (ML) o gross (WC)
            if ($isMl) {
                $oid        = $sale->order_id;
                $orderTotal = $orderTotalsMap[$oid] ?? 0;
                $received   = $orderTotal > 0
                    ? round($orderReceivedMap[$oid] * ($gross / $orderTotal))
                    : 0;
            } else {
                $received = $gross;
            }

            if (!isset($byProduct[$productId])) {
                $byProduct[$productId] = [
                    'product_id'     => $productId,
                    'product_name'   => $productName,
                    'total_qty'      => 0,
                    'total_gross'    => 0,
                    'total_received' => 0,
                    'total_cost'     => 0,
                    'has_cost'       => false,
                ];
            }

            $byProduct[$productId]['total_qty']      += $qty;
            $byProduct[$productId]['total_gross']    += $gross;
            $byProduct[$productId]['total_received'] += $received;

            if ($costUnit !== null) {
                $byProduct[$productId]['total_cost'] += $costUnit * $qty;
                $byProduct[$productId]['has_cost']    = true;
            }
        }

        // Calcular ganancia y margen, ordenar por qty desc
        $products = collect($byProduct)
            ->map(function ($p) use ($isMl) {
                $income  = $isMl ? $p['total_received'] : $p['total_gross'];
                $profit  = $p['has_cost'] ? $income - $p['total_cost'] : null;
                $margin  = ($profit !== null && $income > 0)
                    ? round($profit / $income * 100, 1)
                    : null;

                return [
                    'product_id'     => $p['product_id'],
                    'product_name'   => $p['product_name'],
                    'total_qty'      => $p['total_qty'],
                    'total_gross'    => round($p['total_gross']),
                    'total_received' => round($p['total_received']),
                    'total_cost'     => $p['has_cost'] ? round($p['total_cost']) : null,
                    'profit'         => $profit !== null ? round($profit) : null,
                    'margin_pct'     => $margin,
                ];
            })
            ->sortByDesc('total_qty')
            ->values();

        // Serie diaria para gráfico de líneas
        $daily = Sale::query()
            ->join('orders', 'sales.order_id', '=', 'orders.id')
            ->where('orders.platform', $platform)
            ->whereBetween('orders.ordered_at', [$start, $end])
            ->whereNotIn(DB::raw('LOWER(orders.status)'), $this->excludedStatuses)
            ->groupBy(DB::raw('DATE(orders.ordered_at)'))
            ->orderBy(DB::raw('DATE(orders.ordered_at)'))
            ->selectRaw('DATE(orders.ordered_at) as date, SUM(sales.quantity) as qty, SUM(sales.total) as gross')
            ->get()
            ->map(fn ($r) => [
                'date'  => $r->date,
                'qty'   => (int) $r->qty,
                'gross' => round((float) $r->gross),
            ])
            ->values();

        // Summary cards
        $totalUnits    = $products->sum('total_qty');
        $totalGross    = $products->sum('total_gross');
        $totalReceived = $products->sum('total_received');
        $costsKnown    = $products->filter(fn ($p) => $p['total_cost'] !== null);
        $totalCost     = $costsKnown->isNotEmpty() ? $costsKnown->sum('total_cost') : null;
        $totalProfit   = $totalCost !== null
            ? ($isMl ? $totalReceived : $totalGross) - $totalCost
            : null;

        return Inertia::render('Rentabilidad/Index', [
            'tab'      => $tab,
            'month'    => $month,
            'products' => $products,
            'daily'    => $daily,
            'summary'  => [
                'total_units'    => $totalUnits,
                'total_gross'    => round($totalGross),
                'total_received' => round($totalReceived),
                'total_cost'     => $totalCost !== null ? round($totalCost) : null,
                'total_profit'   => $totalProfit !== null ? round($totalProfit) : null,
            ],
        ]);
    }

    public function updateCost(Request $request, ProductVariant $variant)
    {
        $data = $request->validate([
            'cost_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $cost = isset($data['cost_price']) ? (int) round($data['cost_price']) : null;
        $variant->update(['cost_price' => $cost]);

        return response()->json([
            'id'         => $variant->id,
            'cost_price' => $variant->cost_price !== null ? (int) $variant->cost_price : null,
        ]);
    }
}
