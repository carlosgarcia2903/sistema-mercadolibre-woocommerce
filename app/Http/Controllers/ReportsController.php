<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;

class ReportsController extends Controller
{
    public function inventory()
    {
        $products = Product::query()
            ->whereNotNull('stock')
            ->orderBy('stock')
            ->paginate(20);

        return Inertia::render('Reports/Inventory', [
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

    public function platformSummary()
    {
        $summary = Order::query()
            ->selectRaw('platform, COUNT(*) as orders_count, SUM(total) as total_sales')
            ->groupBy('platform')
            ->get();

        return Inertia::render('Reports/PlatformSummary', [
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
