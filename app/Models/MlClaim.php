<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MlClaim extends Model
{
    protected $fillable = [
        'claim_id', 'order_id', 'resource', 'resource_id', 'type', 'stage', 'status', 'reason_id', 'needs_action',
        'resolution_reason', 'resolution_benefited', 'resolution_closed_by', 'return_status', 'return_subtype',
        'opened_at', 'last_updated_at', 'raw',
    ];

    protected $casts = [
        'needs_action' => 'boolean',
        'opened_at' => 'datetime',
        'last_updated_at' => 'datetime',
        'raw' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function isOpen(): bool
    {
        return $this->status === 'opened';
    }

    public const TYPE_LABELS = [
        'mediations' => 'Reclamo con mediación',
        'returns' => 'Devolución',
        'fulfillment' => 'Reclamo de Full',
        'ml_case' => 'Caso de Mercado Libre',
        'cancel_purchase' => 'Cancelación de compra',
        'change' => 'Cambio de producto',
        'service' => 'Reclamo de servicio',
    ];

    public const STAGE_LABELS = [
        'claim' => 'Reclamo',
        'dispute' => 'En mediación',
        'recontact' => 'Recontacto',
        'stale' => 'Sin respuesta',
        'none' => 'Sin etapa',
    ];

    // Prefijos de motivo de Mercado Libre → texto simple. Lo desconocido se muestra con su código.
    public const REASON_PREFIXES = [
        'PNR' => 'El comprador dice que no recibió el producto',
        'PDD' => 'Producto defectuoso o diferente al publicado',
        'PDC' => 'Producto defectuoso o diferente al publicado',
        'CS' => 'Compra cancelada / arrepentimiento del comprador',
        'BR' => 'Arrepentimiento del comprador',
        'SYI' => 'Problema con el envío',
    ];

    public static function reasonLabel(?string $reasonId): string
    {
        if (!$reasonId) {
            return 'Motivo no informado';
        }
        foreach (self::REASON_PREFIXES as $prefix => $label) {
            if (str_starts_with(strtoupper($reasonId), $prefix)) {
                return $label;
            }
        }

        return 'Motivo ' . $reasonId;
    }

    public static function benefitedLabel(?string $benefited): ?string
    {
        if (!$benefited) {
            return null;
        }
        $map = ['complainant' => 'el comprador', 'respondent' => 'el vendedor (tú)', 'both' => 'ambos', 'none' => 'nadie'];
        $parts = array_map(fn ($b) => $map[trim($b)] ?? trim($b), explode(',', $benefited));

        return implode(' y ', $parts);
    }

    public const RETURN_STATUS_LABELS = [
        'pending' => 'esperando que el comprador envíe el producto',
        'shipped' => 'el producto viene de vuelta',
        'delivered' => 'el producto ya llegó a ti',
        'closed' => 'finalizada',
        'cancelled' => 'cancelada',
        'expired' => 'vencida',
        'failed' => 'fallida',
    ];

    /** Datos listos para mostrar, con una frase simple que explica la situación. */
    public function present(): array
    {
        $type = self::TYPE_LABELS[$this->type] ?? ($this->type ? ucfirst(str_replace('_', ' ', $this->type)) : 'Reclamo');
        $reason = self::reasonLabel($this->reason_id);
        $returnLabel = $this->return_status ? (self::RETURN_STATUS_LABELS[$this->return_status] ?? $this->return_status) : null;

        $sentence = "{$type}: {$reason}.";
        if ($this->isOpen()) {
            $sentence .= $this->needs_action ? ' Está abierto y te toca actuar en Mercado Libre.' : ' Está abierto, esperando respuesta de la otra parte.';
        } else {
            $who = self::benefitedLabel($this->resolution_benefited);
            $sentence .= ' Está cerrado' . ($who ? ", resuelto a favor de {$who}" : '') . '.';
        }
        if ($returnLabel) {
            $sentence .= " Devolución: {$returnLabel}.";
        }

        return [
            'id' => $this->id,
            'claim_id' => $this->claim_id,
            'status' => $this->status,
            'status_label' => $this->isOpen() ? 'Abierto' : 'Cerrado',
            'needs_action' => $this->needs_action,
            'type_label' => $type,
            'stage_label' => self::STAGE_LABELS[$this->stage] ?? null,
            'reason_label' => $reason,
            'return_label' => $returnLabel,
            'has_return' => (bool) $this->return_status,
            'resolution' => self::benefitedLabel($this->resolution_benefited),
            'summary' => $sentence,
            'opened_at' => optional($this->opened_at)->toDateTimeString(),
            'closed_at' => $this->isOpen() ? null : optional($this->last_updated_at)->toDateTimeString(),
        ];
    }
}
