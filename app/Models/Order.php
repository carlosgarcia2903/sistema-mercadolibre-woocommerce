<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'platform',
        'platform_order_id',
        'status',
        'total',
        'currency',
        'ordered_at',
        'customer_name',
        'customer_email',
        'raw_json',
    ];

    protected $casts = [
        'ordered_at' => 'datetime',
        'raw_json' => 'array',
    ];

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
