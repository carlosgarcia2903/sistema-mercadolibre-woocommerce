<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxDocument extends Model
{
    // Notas de crédito: restan en los totales del período.
    public const CREDIT_NOTE_TYPES = [60, 61, 112];

    protected $fillable = [
        'direction', 'period', 'tipo_dte', 'tipo_label', 'folio', 'counterparty_rut', 'counterparty_name',
        'operation_type', 'issued_at', 'received_at', 'exempt_amount', 'net_amount', 'vat_amount',
        'total_amount', 'status', 'raw',
    ];

    protected $casts = [
        'issued_at' => 'date',
        'received_at' => 'datetime',
        'raw' => 'array',
    ];

    public function isCreditNote(): bool
    {
        return in_array((int) $this->tipo_dte, self::CREDIT_NOTE_TYPES, true);
    }
}
