<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductsController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->query('tab', 'woocommerce');
        $source = $tab === 'mercadolibre' ? 'mercadolibre' : 'woocommerce';

        $products = Product::query()
            ->where('source', $source)
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Products/Index', [
            'tab' => $tab,
            'products' => $products,
        ]);
    }
}
