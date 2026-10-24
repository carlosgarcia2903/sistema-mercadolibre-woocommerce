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

    // Órdenes sin preparar por plataforma (packs ML cuentan como 1). Excluye canceladas/devueltas y venta presencial.
    public static function pendingFulfillmentByPlatform(): array
    {
        $platforms = ['woocommerce', 'mercadolibre', 'falabella', 'paris'];

        $rows = static::query()
            ->whereIn('platform', $platforms)
            ->where('fulfillment_status', 'pending')
            ->where(fn ($q) => $q->whereNull('status')->orWhereNotIn('status', ['cancelled', 'canceled', 'refunded', 'returned', 'failed']))
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
