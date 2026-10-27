<?php

namespace App\Http\Controllers;

use App\Models\MlClaim;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClaimsController extends Controller
{
    public function index(Request $request)
    {
        $estado = in_array($request->query('estado'), ['abiertos', 'cerrados', 'todos'], true) ? $request->query('estado') : 'abiertos';
        $q = trim((string) $request->query('q', ''));

        $query = MlClaim::with(['order.sales.product'])->orderByDesc('needs_action')->orderByDesc('opened_at');
        if ($estado === 'abiertos') {
            $query->where('status', 'opened');
        } elseif ($estado === 'cerrados') {
            $query->where('status', '!=', 'opened');
        }
        if ($q !== '') {
            $query->where(fn ($w) => $w->where('claim_id', 'like', "%{$q}%")
                ->orWhere('resource_id', 'like', "%{$q}%")
                ->orWhereHas('order', fn ($o) => $o->where('platform_order_id', 'like', "%{$q}%")
                    ->orWhere('customer_name', 'like', "%{$q}%")));
        }

        $claims = $query->paginate(20)->withQueryString()->through(function (MlClaim $c) {
            $o = $c->order;

            return $c->present() + [
                'resource_id' => $c->resource_id,
                'order' => $o ? [
                    'id' => $o->id,
                    'number' => $o->pack_id ?: $o->platform_order_id,
                    'platform_order_id' => $o->platform_order_id,
                    'customer' => $o->customer_name,
                    'ordered_at' => optional($o->ordered_at)->toDateTimeString(),
                    'total' => (float) $o->total,
                    'refunded' => (float) $o->refunded_amount,
                    'status' => $o->status,
                    'products' => $o->sales->map(fn ($s) => trim(($s->product?->name ?? 'Producto') . ($s->size ? " (talla {$s->size})" : '')))->values(),
                    'ml_url' => 'https://www.mercadolibre.cl/ventas/' . $o->platform_order_id . '/detalle',
                ] : null,
            ];
        });

        $open = MlClaim::where('status', 'opened');
        $monthStart = now()->startOfMonth();

        return Inertia::render('Claims/Index', [
            'claims' => $claims,
            'estado' => $estado,
            'q' => $q,
            'kpis' => [
                'open' => (clone $open)->count(),
                'needs_action' => (clone $open)->where('needs_action', true)->count(),
                'returns_in_progress' => (clone $open)->whereNotNull('return_status')->count(),
                'refunded_month' => round((float) Order::whereHas('claims')->where('ordered_at', '>=', $monthStart->copy()->subDays(60))
                    ->where('updated_at', '>=', $monthStart)->sum('refunded_amount')),
            ],
        ]);
    }
}
