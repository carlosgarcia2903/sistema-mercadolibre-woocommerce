<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'sku',
        'name',
        'description',
        'image_path',
        'price',
        'stock',
        'source',
        'source_id',
    ];

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }
}
