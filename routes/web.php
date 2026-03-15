<?php

use App\Http\Controllers\MercadoLibreAuthController;
use App\Http\Controllers\MlPdfsController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\ProductsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportsController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('dashboard');
});

Route::get('/dashboard', function () {
    $today = now()->startOfDay();
    $week = now()->startOfWeek();

    return Inertia::render('Dashboard', [
        'stats' => [
            'orders_today' => \App\Models\Order::where('ordered_at', '>=', $today)->count(),
            'orders_week' => \App\Models\Order::where('ordered_at', '>=', $week)->count(),
            'sales_today' => (float) \App\Models\Order::where('ordered_at', '>=', $today)->sum('total'),
            'sales_week' => (float) \App\Models\Order::where('ordered_at', '>=', $week)->sum('total'),
            'low_stock' => \App\Models\Product::whereNotNull('stock')->where('stock', '<=', 5)->count(),
        ],
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/ml/callback', [MercadoLibreAuthController::class, 'callback']);

Route::middleware('auth')->group(function () {
    Route::get('/products', [ProductsController::class, 'index'])->name('products.index');
    Route::get('/orders', [OrdersController::class, 'index'])->name('orders.index');
    Route::get('/ml-pdfs', [MlPdfsController::class, 'index'])->name('mlpdfs.index');
    Route::get('/ml-pdfs/{mlPdf}/download', [MlPdfsController::class, 'download'])->name('mlpdfs.download');
    Route::get('/reports/inventory', [ReportsController::class, 'inventory'])->name('reports.inventory');
    Route::get('/reports/orders', [ReportsController::class, 'orders'])->name('reports.orders');
    Route::get('/reports/platforms', [ReportsController::class, 'platformSummary'])->name('reports.platforms');
    Route::get('/reports/orders/export', [ReportsController::class, 'exportOrdersCsv'])->name('reports.orders.export');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
