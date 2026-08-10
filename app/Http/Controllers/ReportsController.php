<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportsController extends Controller
{
    public function inventory(Request $request)
    {
        $tab    = $request->query('tab', 'woocommerce');
        $source = in_array($tab, ['mercadolibre', 'falabella', 'paris', 'woocommerce'], true) ? $tab : 'woocommerce';
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

        $products = $query->with('variants')->paginate(50)->withQueryString();

        return Inertia::render('Reports/Inventory', [
            'tab'      => $tab,
            'search'   => $search,
            'products' => $products,
        ]);
    }
}
