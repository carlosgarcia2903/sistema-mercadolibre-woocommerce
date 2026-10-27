<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxPeriodSync extends Model
{
    protected $fillable = ['direction', 'period', 'synced_at', 'is_final', 'documents_count', 'summary'];

    protected $casts = [
        'synced_at' => 'datetime',
        'is_final' => 'boolean',
        'summary' => 'array',
    ];
}
