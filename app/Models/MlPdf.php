<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MlPdf extends Model
{
    protected $fillable = [
        'order_id',
        'platform_shipment_id',
        'pdf_url',
        'pdf_path',
        'downloaded_at',
    ];

    protected $casts = [
        'downloaded_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
