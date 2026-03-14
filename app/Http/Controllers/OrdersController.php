<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrdersController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->query('tab', 'woocommerce');
        $platform = $tab === 'mercadolibre' ? 'mercadolibre' : 'woocommerce';

        $orders = Order::query()
            ->where('platform', $platform)
            ->orderByDesc('ordered_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Orders/Index', [
            'tab' => $tab,
            'orders' => $orders,
        ]);
    }
}
