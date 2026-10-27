<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'platform',
        'platform_order_id',
        'pack_id',
        'status',
        'fulfillment_status',
        'fulfillment_updated_at',
        'total',
        'shipping_cost',
        'sale_fees',
        'received_amount',
        'refunded_amount',
        'currency',
        'ordered_at',
        'customer_name',
        'customer_email',
        'raw_json',
    ];

    protected $casts = [
        'ordered_at' => 'datetime',
        'fulfillment_updated_at' => 'datetime',
        'raw_json' => 'array',
    ];

    // Estados que no cuentan como venta en totales, dashboard ni rentabilidad.
    public const EXCLUDED_STATUSES = ['cancelled', 'canceled', 'refunded', 'returned', 'failed'];

    /** Ventas que sí cuentan: no canceladas/devueltas y no reembolsadas por completo. */
    public function scopeCounted($query)
    {
        return $query
            ->where(fn ($q) => $q->whereNull('orders.status')->orWhereNotIn(\Illuminate\Support\Facades\DB::raw('LOWER(orders.status)'), self::EXCLUDED_STATUSES))
            ->whereRaw('(orders.total <= 0 OR orders.refunded_amount < orders.total)');
    }

    /** Monto efectivo vendido: total menos lo reembolsado al comprador. */
    public const EFFECTIVE_TOTAL_SQL = 'GREATEST(orders.total - orders.refunded_amount, 0)';

    /** Fracción de la orden que sigue vigente (1 = sin devoluciones, 0 = reembolsada por completo). */
    public function keptFraction(): float
    {
        $total = (float) $this->total;

        return $total > 0 ? max(0.0, 1 - ((float) $this->refunded_amount / $total)) : 1.0;
    }

    /** Suma lo devuelto al comprador según los pagos de una orden de Mercado Libre. */
    public static function refundedFromMl(array $mlOrder): float
    {
        return round(collect($mlOrder['payments'] ?? [])->sum(fn ($p) => (float) ($p['transaction_amount_refunded'] ?? 0)), 2);
    }

    public function claims()
    {
        return $this->hasMany(MlClaim::class);
    }

    // Órdenes sin preparar por plataforma (packs ML cuentan como 1). Excluye canceladas/devueltas y venta presencial.
    public static function pendingFulfillmentByPlatform(): array
    {
        $platforms = ['woocommerce', 'mercadolibre', 'falabella', 'paris'];

        $rows = static::query()
            ->whereIn('platform', $platforms)
            ->where('fulfillment_status', 'pending')
            ->counted()
            ->selectRaw('platform, COUNT(DISTINCT COALESCE(pack_id, CAST(id AS CHAR))) as total')
            ->groupBy('platform')
            ->pluck('total', 'platform');

        $byPlatform = [];
        foreach ($platforms as $p) {
            $byPlatform[$p] = (int) ($rows[$p] ?? 0);
        }

        return ['total' => array_sum($byPlatform), 'byPlatform' => $byPlatform];
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function mlPdfs()
    {
        return $this->hasMany(MlPdf::class);
    }

    public function latestMlPdf()
    {
        return $this->hasOne(MlPdf::class)->latestOfMany('id');
    }
}
