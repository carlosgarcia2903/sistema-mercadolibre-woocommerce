<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxApiCall extends Model
{
    protected $fillable = ['direction', 'period', 'http_status', 'consumed', 'note'];

    protected $casts = ['consumed' => 'boolean'];
}
