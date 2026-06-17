<?php

use App\Http\Controllers\MercadoLibreAuthController;
use App\Http\Controllers\MlPdfsController;
use App\Http\Controllers\OrdersController;
use App\Http\Controllers\ProductsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RentabilidadController;
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

    $latestMlPdfs = \App\Models\MlPdf::query()
        ->with('order')
        ->orderByDesc('downloaded_at')
        ->limit(10)
        ->get()
        ->map(function ($pdf) {
            return [
                'id' => $pdf->id,
                'platform_shipment_id' => $pdf->platform_shipment_id,
                'logistic_type' => $pdf->logistic_type,
                'shipment_status' => $pdf->shipment_status,
                'shipment_substatus' => $pdf->shipment_substatus,
                'downloaded_at' => optional($pdf->downloaded_at)->toDateTimeString(),
                'order' => $pdf->order ? [
                    'id' => $pdf->order->id,
                    'platform' => $pdf->order->platform,
                    'platform_order_id' => $pdf->order->platform_order_id,
                ] : null,
            ];
        });

    $days = collect();
    for ($i = 6; $i >= 0; $i--) {
        $days->push(now()->subDays($i)->format('Y-m-d'));
    }

    $orderSeries = \App\Models\Order::selectRaw('DATE(ordered_at) as date, COUNT(*) as orders, SUM(total) as sales')
        ->where('ordered_at', '>=', now()->subDays(6)->startOfDay())
        ->groupBy('date')
        ->orderBy('date')
        ->get()
        ->keyBy('date');

    $chart = $days->map(function ($date) use ($orderSeries) {
        $row = $orderSeries->get($date);
        return [
            'date' => $date,
            'orders' => (int) ($row->orders ?? 0),
            'sales' => (float) ($row->sales ?? 0),
        ];
    });

    return Inertia::render('Dashboard', [
        'stats' => [
            'orders_today' => \App\Models\Order::where('ordered_at', '>=', $today)->count(),
            'orders_week' => \App\Models\Order::where('ordered_at', '>=', $week)->count(),
            'sales_today' => (float) \App\Models\Order::where('ordered_at', '>=', $today)->sum('total'),
            'sales_week' => (float) \App\Models\Order::where('ordered_at', '>=', $week)->sum('total'),
            'low_stock' => \App\Models\Product::whereNotNull('stock')->where('stock', '<=', 5)->count(),
        ],
        'chart' => $chart,
        'mlPdfs' => [
            'total' => \App\Models\MlPdf::count(),
            'counts' => [
                'flex' => \App\Models\MlPdf::where('logistic_type', 'self_service')->count(),
                'ml' => \App\Models\MlPdf::where(function ($q) {
                    $q->whereNull('logistic_type')
                      ->orWhere('logistic_type', '!=', 'self_service');
                })->count(),
            ],
            'items' => $latestMlPdfs,
        ],
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/ml/callback', [MercadoLibreAuthController::class, 'callback']);

Route::middleware('auth')->group(function () {
    Route::get('/products', [ProductsController::class, 'index'])->name('products.index');
    Route::get('/orders', [OrdersController::class, 'index'])->name('orders.index');
    Route::post('/orders/sync', [OrdersController::class, 'sync'])->name('orders.sync');
    Route::patch('/orders/{order}/status', [OrdersController::class, 'updateStatus'])->name('orders.updateStatus');
    Route::get('/rentabilidad', [RentabilidadController::class, 'index'])->name('rentabilidad.index');
    Route::patch('/variants/{variant}/cost', [RentabilidadController::class, 'updateCost'])->name('variants.updateCost');
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
