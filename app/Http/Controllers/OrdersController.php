<?php

namespace App\Http\Controllers;

use App\Models\MlPdf;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

class OrdersController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->query('tab', 'woocommerce');
        $platform = $tab === 'mercadolibre' ? 'mercadolibre' : 'woocommerce';
        $filters = [
            'order_id' => trim((string) $request->query('order_id', '')),
            'date_from' => (string) $request->query('date_from', ''),
            'date_to' => (string) $request->query('date_to', ''),
            'customer' => trim((string) $request->query('customer', '')),
            'status' => (string) $request->query('status', ''),
            'logistic_type' => (string) $request->query('logistic_type', ''),
            'delivery_status' => (string) $request->query('delivery_status', ''),
        ];

        $calculateMlNetReceived = function (Order $order): ?float {
            if ($order->platform !== 'mercadolibre' || !is_array($order->raw_json)) {
                return null;
            }

            $paidAmount = (float) ($order->raw_json['paid_amount'] ?? 0);
            $shippingCost = (float) ($order->raw_json['shipping_cost'] ?? 0);
            $saleFee = collect($order->raw_json['order_items'] ?? [])
                ->sum(fn ($item) => (float) ($item['sale_fee'] ?? 0));

            return round($paidAmount - $saleFee - $shippingCost, 2);
        };

        $query = Order::query()
            ->where('platform', $platform);

        if ($filters['order_id'] !== '') {
            $query->where('platform_order_id', 'like', '%' . $filters['order_id'] . '%');
        }

        if ($filters['date_from'] !== '') {
            $query->whereDate('ordered_at', '>=', $filters['date_from']);
        }

        if ($filters['date_to'] !== '') {
            $query->whereDate('ordered_at', '<=', $filters['date_to']);
        }

        if ($filters['customer'] !== '') {
            $query->where('customer_name', 'like', '%' . $filters['customer'] . '%');
        }

        if ($filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if ($platform === 'mercadolibre' && $filters['logistic_type'] !== '') {
            if ($filters['logistic_type'] === 'self_service') {
                $query->whereHas('latestMlPdf', function ($q) {
                    $q->where('logistic_type', 'self_service');
                });
            } elseif ($filters['logistic_type'] === 'ml') {
                $query->whereHas('latestMlPdf', function ($q) {
                    $q->whereNull('logistic_type')
                        ->orWhere('logistic_type', '!=', 'self_service');
                });
            }
        }

        if ($platform === 'mercadolibre' && $filters['delivery_status'] !== '') {
            if ($filters['delivery_status'] === 'sin_info') {
                $query->where(function ($q) {
                    $q->whereDoesntHave('latestMlPdf')
                        ->orWhereHas('latestMlPdf', function ($statusQuery) {
                            $statusQuery->whereNull('shipment_status');
                        });
                });
            } else {
                $query->whereHas('latestMlPdf', function ($q) use ($filters) {
                    $q->where('shipment_status', $filters['delivery_status']);
                });
            }
        }

        $orders = $query
            ->with(['sales.product', 'latestMlPdf'])
            ->orderByDesc('ordered_at')
            ->paginate(20)
            ->withQueryString()
            ->through(function ($order) use ($calculateMlNetReceived) {
                return [
                    'id' => $order->id,
                    'platform_order_id' => $order->platform_order_id,
                    'status' => $order->status,
                    'total' => $order->total,
                    'currency' => $order->currency,
                    'ordered_at' => optional($order->ordered_at)->toDateTimeString(),
                    'customer_name' => $order->customer_name,
                    'delivery_status' => $order->latestMlPdf?->shipment_status,
                    'delivery_substatus' => $order->latestMlPdf?->shipment_substatus,
                    'delivery_logistic_type' => $order->latestMlPdf?->logistic_type,
                    'total_received' => $calculateMlNetReceived($order),
                    'items' => $order->sales->map(function ($sale) {
                        return [
                            'name' => $sale->product?->name ?? 'Producto',
                            'size' => $sale->size,
                            'quantity' => $sale->quantity,
                            'unit_price' => $sale->unit_price,
                            'total' => $sale->total,
                        ];
                    }),
                ];
            });

        $statusOptions = Order::query()
            ->where('platform', $platform)
            ->whereNotNull('status')
            ->select('status')
            ->distinct()
            ->orderBy('status')
            ->pluck('status');

        $deliveryStatusOptions = $platform === 'mercadolibre'
            ? MlPdf::query()
                ->whereNotNull('shipment_status')
                ->select('shipment_status')
                ->distinct()
                ->orderBy('shipment_status')
                ->pluck('shipment_status')
            : collect();

        return Inertia::render('Orders/Index', [
            'tab' => $tab,
            'orders' => $orders,
            'filters' => $filters,
            'statusOptions' => $statusOptions,
            'deliveryStatusOptions' => $deliveryStatusOptions,
        ]);
    }

    public function sync(Request $request)
    {
        $platform = $request->input('platform');

        try {
            if ($platform === 'woocommerce') {
                Artisan::call('sync:woocommerce');
            } elseif ($platform === 'mercadolibre') {
                Artisan::call('sync:mercadolibre');
            } else {
                return back()->with('error', 'Plataforma inválida.');
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return back()->with('error', 'No se pudo conectar con ' . $platform . '. Verifica que el sitio esté en línea y accesible desde esta red.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Error al sincronizar ' . $platform . ': ' . $e->getMessage());
        }

        return back()->with('success', 'Sincronización de ' . $platform . ' completada.');
    }
}
