<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;

class ReportsController extends Controller
{
    public function inventory(Request $request)
    {
        $tab    = $request->query('tab', 'woocommerce');
        $source = $tab === 'mercadolibre' ? 'mercadolibre' : 'woocommerce';
        $search = $request->query('search', '');

        $query = Product::query()
            ->where('source', $source)
            ->orderBy('name');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        $products = $query->paginate(50)->withQueryString();

        return Inertia::render('Reports/Inventory', [
            'tab'      => $tab,
            'search'   => $search,
            'products' => $products,
        ]);
    }

    public function orders(Request $request)
    {
        $tab = $request->query('tab', 'woocommerce');
        $platform = $tab === 'mercadolibre' ? 'mercadolibre' : 'woocommerce';

        $from = $request->query('from');
        $to = $request->query('to');

        $query = Order::query()->where('platform', $platform);
        if ($from) {
            $query->where('ordered_at', '>=', $from);
        }
        if ($to) {
            $query->where('ordered_at', '<=', $to);
        }

        $orders = $query->orderByDesc('ordered_at')->paginate(20)->withQueryString();

        return Inertia::render('Reports/Orders', [
            'tab' => $tab,
            'orders' => $orders,
            'filters' => ['from' => $from, 'to' => $to],
        ]);
    }

    public function platformSummary(Request $request)
    {
        $tab = $request->query('tab', 'woocommerce');
        $platform = $tab === 'mercadolibre' ? 'mercadolibre' : 'woocommerce';

        $rows = Order::query()
            ->where('platform', $platform)
            ->select(['platform', 'total', 'raw_json', 'ordered_at', 'created_at'])
            ->get();

        $summary = $rows
            ->groupBy(function ($order) {
                $date = $order->ordered_at ?? $order->created_at;
                return ($date ? $date->format('Y-m') : now()->format('Y-m')) . '|' . $order->platform;
            })
            ->map(function ($group, $key) {
                [$period, $platform] = explode('|', $key, 2);

                $ordersCount = $group->count();
                $totalSales = (float) $group->sum('total');

                $receivedAmount = null;
                if ($platform === 'mercadolibre') {
                    $receivedAmount = (float) $group->sum(function ($order) {
                        $raw = $order->raw_json;
                        if (!is_array($raw)) {
                            return 0;
                        }

                        $paidAmount = (float) ($raw['paid_amount'] ?? 0);
                        $shippingCost = (float) ($raw['shipping_cost'] ?? 0);
                        $saleFee = collect($raw['order_items'] ?? [])
                            ->sum(fn ($item) => (float) ($item['sale_fee'] ?? 0));

                        return $paidAmount - $saleFee - $shippingCost;
                    });
                }

                return [
                    'period' => $period,
                    'platform' => $platform,
                    'orders_count' => $ordersCount,
                    'total_sales' => round($totalSales, 2),
                    'received_amount' => $receivedAmount !== null ? round($receivedAmount, 2) : null,
                ];
            })
            ->values()
            ->sortBy([
                ['period', 'desc'],
                ['platform', 'asc'],
            ])
            ->values()
            ->map(function ($row) {
                return [
                    'period' => $row['period'],
                    'platform' => $row['platform'],
                    'orders_count' => (int) $row['orders_count'],
                    'total_sales' => (float) $row['total_sales'],
                    'received_amount' => $row['received_amount'] !== null ? (float) $row['received_amount'] : null,
                ];
            });

        $summary = $summary->map(function ($row) {
            return [
                'period' => $row['period'],
                'platform' => $row['platform'],
                'orders_count' => (int) $row['orders_count'],
                'total_sales' => (float) $row['total_sales'],
                'received_amount' => $row['received_amount'] !== null ? (float) $row['received_amount'] : null,
            ];
        });

        return Inertia::render('Reports/PlatformSummary', [
            'tab' => $tab,
            'summary' => $summary,
        ]);
    }

    public function exportOrdersCsv(Request $request)
    {
        $tab = $request->query('tab', 'woocommerce');
        $platform = $tab === 'mercadolibre' ? 'mercadolibre' : 'woocommerce';
        $from = $request->query('from');
        $to = $request->query('to');

        $query = Order::query()->where('platform', $platform);
        if ($from) {
            $query->where('ordered_at', '>=', $from);
        }
        if ($to) {
            $query->where('ordered_at', '<=', $to);
        }

        $rows = $query->orderByDesc('ordered_at')->get();

        $csv = "platform_order_id,ordered_at,customer_name,customer_email,status,total,currency\n";
        foreach ($rows as $o) {
            $csv .= sprintf(
                "%s,%s,%s,%s,%s,%s,%s\n",
                $o->platform_order_id,
                optional($o->ordered_at)->toDateTimeString(),
                str_replace(',', ' ', $o->customer_name ?? ''),
                $o->customer_email ?? '',
                $o->status ?? '',
                $o->total,
                $o->currency
            );
        }

        return Response::make($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="orders_'.$platform.'.csv"',
        ]);
    }
}
