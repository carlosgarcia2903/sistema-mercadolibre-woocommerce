<?php

namespace App\Http\Controllers;

use App\Models\MlPdf;
use App\Models\Order;
use App\Services\WooCommerceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

class OrdersController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->query('tab', 'woocommerce');
        $platform = in_array($tab, ['mercadolibre', 'falabella', 'paris', 'woocommerce'], true) ? $tab : 'woocommerce';
        $filters = [
            'order_id' => trim((string) $request->query('order_id', '')),
            'date_from' => (string) $request->query('date_from', ''),
            'date_to' => (string) $request->query('date_to', ''),
            'customer' => trim((string) $request->query('customer', '')),
            'status' => (string) $request->query('status', ''),
            'logistic_type' => (string) $request->query('logistic_type', ''),
            'delivery_status' => (string) $request->query('delivery_status', ''),
        ];

        $query = Order::query()->where('platform', $platform);

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
                $query->whereHas('latestMlPdf', fn ($q) => $q->where('logistic_type', 'self_service'));
            } elseif ($filters['logistic_type'] === 'ml') {
                $query->whereHas('latestMlPdf', fn ($q) => $q->whereNull('logistic_type')->orWhere('logistic_type', '!=', 'self_service'));
            }
        }

        if ($platform === 'mercadolibre' && $filters['delivery_status'] !== '') {
            if ($filters['delivery_status'] === 'sin_info') {
                $query->where(function ($q) {
                    $q->whereDoesntHave('latestMlPdf')
                        ->orWhereHas('latestMlPdf', fn ($sq) => $sq->whereNull('shipment_status'));
                });
            } else {
                $query->whereHas('latestMlPdf', fn ($q) => $q->where('shipment_status', $filters['delivery_status']));
            }
        }

        // MercadoLibre: agrupar por pack_id antes de paginar
        if ($platform === 'mercadolibre') {
            $allOrders = $query
                ->with(['sales.product', 'latestMlPdf'])
                ->orderByDesc('ordered_at')
                ->get();

            // Agrupar conservando orden cronológico de la primera orden del pack
            $grouped = [];
            foreach ($allOrders as $order) {
                $key = $order->pack_id ? 'pack_' . $order->pack_id : 'single_' . $order->id;
                $grouped[$key][] = $order;
            }

            $packRows = array_map(function (array $packOrders) {
                $first = $packOrders[0];

                $allItems = [];
                foreach ($packOrders as $o) {
                    foreach ($o->sales as $sale) {
                        $allItems[] = [
                            'name'       => $sale->product?->name ?? 'Producto',
                            'size'       => $sale->size,
                            'color'      => $sale->color,
                            'quantity'   => $sale->quantity,
                            'unit_price' => $sale->unit_price,
                            'total'      => $sale->total,
                        ];
                    }
                }

                $totalAmount  = array_sum(array_map(fn ($o) => (float) $o->total, $packOrders));
                $saleFees     = array_sum(array_map(fn ($o) => (float) $o->sale_fees, $packOrders));
                // El shipping_cost se registra en una sola orden del pack; tomamos el máximo
                $shippingCost = max(array_map(fn ($o) => (float) $o->shipping_cost, $packOrders));
                $received     = $totalAmount - $saleFees - $shippingCost;
                $isPack       = $first->pack_id !== null && count($packOrders) > 1;

                return [
                    'id'                     => $first->id,
                    'pack_id'                => $first->pack_id,
                    'order_ids'              => array_map(fn ($o) => $o->platform_order_id, $packOrders),
                    'platform_order_id'      => $isPack ? (string) $first->pack_id : $first->platform_order_id,
                    'is_pack'                => $isPack,
                    'status'                 => $first->status,
                    'total'                  => $totalAmount,
                    'sale_fees'              => $saleFees,
                    'shipping_cost'          => $shippingCost,
                    'received_amount'        => $received,
                    'currency'               => $first->currency,
                    'ordered_at'             => optional($first->ordered_at)->toDateTimeString(),
                    'customer_name'          => $first->customer_name,
                    'raw'                    => null,
                    'delivery_status'        => $first->latestMlPdf?->shipment_status,
                    'delivery_substatus'     => $first->latestMlPdf?->shipment_substatus,
                    'delivery_logistic_type' => $first->latestMlPdf?->logistic_type,
                    'pdf_download_url'       => $first->latestMlPdf?->pdf_path
                        ? route('mlpdfs.download', $first->latestMlPdf)
                        : null,
                    'total_received'         => $received,
                    'items'                  => $allItems,
                ];
            }, array_values($grouped));

            $page   = (int) $request->input('page', 1);
            $perPage = 20;
            $orders = new \Illuminate\Pagination\LengthAwarePaginator(
                array_slice($packRows, ($page - 1) * $perPage, $perPage),
                count($packRows),
                $perPage,
                $page,
                ['path' => $request->url(), 'query' => $request->query()]
            );
        } else {
            // WooCommerce, Falabella y Paris: paginación estándar (sin packs)
            $isMarketplace = in_array($platform, ['falabella', 'paris'], true);
            $orders = $query
                ->with(['sales.product', 'latestMlPdf'])
                ->orderByDesc('ordered_at')
                ->paginate(20)
                ->withQueryString()
                ->through(function ($order) use ($isMarketplace) {
                    return [
                        'id'                     => $order->id,
                        'pack_id'                => null,
                        'order_ids'              => [$order->platform_order_id],
                        'platform_order_id'      => $order->platform_order_id,
                        'is_pack'                => false,
                        'status'                 => $order->status,
                        'total'                  => $order->total,
                        'sale_fees'              => $isMarketplace ? (float) $order->sale_fees : 0,
                        'shipping_cost'          => $isMarketplace ? (float) $order->shipping_cost : 0,
                        'received_amount'        => $isMarketplace ? (float) $order->received_amount : null,
                        'currency'               => $order->currency,
                        'ordered_at'             => optional($order->ordered_at)->toDateTimeString(),
                        'customer_name'          => $order->customer_name,
                        'raw'                    => $order->raw_json,
                        'delivery_status'        => $order->latestMlPdf?->shipment_status,
                        'delivery_substatus'     => $order->latestMlPdf?->shipment_substatus,
                        'delivery_logistic_type' => $order->latestMlPdf?->logistic_type,
                        'pdf_download_url'       => $order->latestMlPdf?->pdf_path
                            ? route('mlpdfs.download', $order->latestMlPdf)
                            : null,
                        'total_received'         => $isMarketplace ? (float) $order->received_amount : null,
                        'items'                  => $order->sales->map(fn ($sale) => [
                            'name'       => $sale->product?->name ?? 'Producto',
                            'size'       => $sale->size,
                            'color'      => $sale->color,
                            'quantity'   => $sale->quantity,
                            'unit_price' => $sale->unit_price,
                            'total'      => $sale->total,
                        ]),
                    ];
                });
        }

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
                return back()->with('success', 'WooCommerce sincronizado correctamente.');
            } elseif ($platform === 'mercadolibre') {
                Artisan::call('sync:mercadolibre');
                $output = Artisan::output();

                $emailEnviado = str_contains($output, 'Correo enviado');
                preg_match('/(\d+) orden\(es\) nueva\(s\)/', $output, $matches);
                $cantidadNuevas = $matches[1] ?? 0;

                $mensaje = 'MercadoLibre sincronizado correctamente.';
                if ($emailEnviado && $cantidadNuevas > 0) {
                    $mensaje .= " ✉️ Se encontraron {$cantidadNuevas} orden(es) nueva(s) — correo enviado a carlosgarcia.2903@gmail.com.";
                } else {
                    $mensaje .= ' Sin órdenes nuevas, no se envió correo.';
                }

                return back()->with('success', $mensaje);
            } elseif ($platform === 'falabella') {
                Artisan::call('sync:falabella');
                $output = Artisan::output();

                preg_match('/(\d+) orden\(es\) nueva\(s\)/', $output, $matches);
                $cantidadNuevas = $matches[1] ?? 0;

                $mensaje = 'Falabella sincronizado correctamente.';
                if ($cantidadNuevas > 0) {
                    $mensaje .= " ✉️ Se encontraron {$cantidadNuevas} orden(es) nueva(s) — correo enviado a carlosgarcia.2903@gmail.com.";
                } else {
                    $mensaje .= ' Sin órdenes nuevas, no se envió correo.';
                }

                return back()->with('success', $mensaje);
            } elseif ($platform === 'paris') {
                Artisan::call('sync:paris');
                $output = Artisan::output();

                preg_match('/(\d+) orden\(es\) nueva\(s\)/', $output, $matches);
                $cantidadNuevas = $matches[1] ?? 0;

                $mensaje = 'Paris Marketplace sincronizado correctamente.';
                if ($cantidadNuevas > 0) {
                    $mensaje .= " ✉️ Se encontraron {$cantidadNuevas} orden(es) nueva(s) — correo enviado a carlosgarcia.2903@gmail.com.";
                } else {
                    $mensaje .= ' Sin órdenes nuevas, no se envió correo.';
                }

                return back()->with('success', $mensaje);
            } else {
                return back()->with('error', 'Plataforma inválida.');
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return back()->with('error', 'No se pudo conectar con ' . $platform . '. Verifica que el sitio esté en línea y accesible desde esta red.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Error al sincronizar ' . $platform . ': ' . $e->getMessage());
        }

        return back()->with('success', 'Sincronización completada.');
    }

    public function updateStatus(Request $request, Order $order, WooCommerceService $wc)
    {
        $request->validate(['status' => 'required|string']);

        if ($order->platform !== 'woocommerce') {
            return response()->json(['error' => 'Solo se pueden actualizar órdenes de WooCommerce.'], 422);
        }

        $newStatus = $request->input('status');

        try {
            $wc->updateOrderStatus($order->platform_order_id, $newStatus);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'No se pudo actualizar en WooCommerce: ' . $e->getMessage()], 500);
        }

        $order->update(['status' => $newStatus]);

        return response()->json(['status' => $newStatus]);
    }
}
