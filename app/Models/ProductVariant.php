<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'size',
        'sort_order',
        'variant_source_id',
        'sku',
        'sale_price',
        'wholesale_price',
        'cost_price',
    ];

    protected $casts = [
        'sale_price' => 'decimal:2',
        'wholesale_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class, 'variant_id');
    }
}
