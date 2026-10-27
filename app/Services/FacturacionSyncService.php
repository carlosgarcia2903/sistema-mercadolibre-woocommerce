<?php

namespace App\Services;

use App\Models\TaxApiCall;
use App\Models\TaxDocument;
use App\Models\TaxPeriodSync;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FacturacionSyncService
{
    public const DIRECTIONS = ['ventas', 'compras'];

    // Días del mes siguiente durante los cuales el SII aún puede recibir documentos del mes anterior.
    private const GRACE_DAYS = 20;

    public function __construct(private SimpleApiService $api)
    {
    }

    public function quota(): int
    {
        return (int) config('services.simpleapi.monthly_quota');
    }

    // Solo cuentan las consultas que devolvieron documentos (así lo cobra SimpleAPI).
    public function quotaUsed(): int
    {
        return TaxApiCall::where('consumed', true)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
    }

    public function quotaRemaining(): int
    {
        return max(0, $this->quota() - $this->quotaUsed());
    }

    /** Un período está "abierto" mientras el SII todavía puede agregarle documentos. */
    public function isOpen(string $period): bool
    {
        $start = Carbon::createFromFormat('Ym', $period)->startOfMonth();
        $now = now();

        if ($start->isSameMonth($now)) {
            return true;
        }

        return $start->copy()->addMonth()->isSameMonth($now) && $now->day <= self::GRACE_DAYS;
    }

    /**
     * Sincroniza un lado (ventas|compras) de un mes. Gasta como máximo 1 consulta.
     *
     * @return array{status:string,message:string,documents:int}
     */
    public function syncPeriod(string $direction, string $period, bool $force = false, ?int $minHours = null, int $reserve = 0): array
    {
        if (!in_array($direction, self::DIRECTIONS, true) || !preg_match('/^\d{4}(0[1-9]|1[0-2])$/', $period)) {
            return $this->result('error', 'Período o tipo inválido.');
        }
        if (!$this->api->isConfigured()) {
            return $this->result('error', 'Falta configurar SimpleAPI y las credenciales del SII en el .env.');
        }
        if (Carbon::createFromFormat('Ym', $period)->startOfMonth()->isFuture()) {
            return $this->result('skipped', 'No se puede consultar un mes futuro.');
        }

        $row = TaxPeriodSync::where(['direction' => $direction, 'period' => $period])->first();

        if (!$force && $row) {
            if ($row->is_final) {
                return $this->result('skipped', 'Este mes ya está cerrado y guardado: no necesita nuevas consultas.', $row->documents_count);
            }
            $hours = $minHours ?? (int) config('services.simpleapi.cooldown_hours');
            if ($row->synced_at && $row->synced_at->gt(now()->subHours($hours))) {
                return $this->result('skipped', "Se actualizó hace menos de {$hours} h; se reutilizan los datos guardados.", $row->documents_count);
            }
        }

        if ($this->quotaRemaining() <= $reserve) {
            return $this->result('error', 'No quedan consultas disponibles este mes en tu plan de SimpleAPI.');
        }

        $lock = Cache::lock("facturacion-sync-{$direction}-{$period}", 180);
        if (!$lock->get()) {
            return $this->result('skipped', 'Ya hay una actualización en curso para este mes.');
        }

        try {
            return $this->fetchAndStore($direction, $period);
        } finally {
            $lock->release();
        }
    }

    private function fetchAndStore(string $direction, string $period): array
    {
        $year = (int) substr($period, 0, 4);
        $month = (int) substr($period, 4, 2);

        try {
            $response = $this->api->fetchRcv($direction, $month, $year);
        } catch (\Throwable $e) {
            $this->logCall($direction, $period, null, false, 'sin conexión');
            Log::warning('SimpleAPI RCV: sin conexión', ['direction' => $direction, 'period' => $period, 'error' => $e->getMessage()]);

            return $this->result('error', 'No se pudo conectar con SimpleAPI. Intenta nuevamente en unos minutos.');
        }

        $json = $response->json();
        $valid = $response->successful() && is_array($json) && isset($json['caratula']);

        if (!$valid) {
            $this->logCall($direction, $period, $response->status(), false, 'respuesta inválida');
            Log::warning('SimpleAPI RCV: respuesta inválida', ['status' => $response->status(), 'direction' => $direction, 'period' => $period]);

            $hint = in_array($response->status(), [401, 403], true)
                ? 'La API key fue rechazada.'
                : 'SimpleAPI o el portal del SII no respondió correctamente (HTTP ' . $response->status() . ').';

            return $this->result('error', $hint . ' No se gastó ninguna consulta de tu cuota.');
        }

        $details = $this->details($json, $direction);
        $existing = TaxDocument::where(['direction' => $direction, 'period' => $period])->count();

        // Respuesta vacía cuando ya había datos: probablemente un fallo del portal. No borrar lo guardado.
        if (count($details) === 0 && $existing > 0) {
            $this->logCall($direction, $period, $response->status(), false, 'vacía; se conservan datos');

            return $this->result('error', 'El SII devolvió el mes vacío. Se conservaron los datos que ya tenías guardados.', $existing);
        }

        $this->logCall($direction, $period, $response->status(), count($details) > 0);
        $count = $this->ingest($direction, $period, $json);

        return $this->result('ok', $count === 0 ? 'Sin documentos en este mes (no consumió cuota).' : "Actualizado: {$count} documento(s).", $count);
    }

    /** Guarda la respuesta del RCV (también sirve para cargar respuestas ya descargadas, sin gastar consultas). */
    public function ingest(string $direction, string $period, array $json): int
    {
        $details = $this->details($json, $direction);
        $summary = $json[$direction]['resumenes'] ?? [];

        DB::transaction(function () use ($direction, $period, $details, $summary) {
            $keep = [];
            foreach ($details as $d) {
                $row = $this->mapDocument($direction, $period, $d);
                $doc = TaxDocument::updateOrCreate(
                    [
                        'direction' => $direction,
                        'tipo_dte' => $row['tipo_dte'],
                        'folio' => $row['folio'],
                        'counterparty_rut' => $row['counterparty_rut'],
                    ],
                    $row,
                );
                $keep[] = $doc->id;
            }

            TaxDocument::where(['direction' => $direction, 'period' => $period])
                ->whereNotIn('id', $keep)
                ->delete();

            TaxPeriodSync::updateOrCreate(
                ['direction' => $direction, 'period' => $period],
                [
                    'synced_at' => now(),
                    'is_final' => !$this->isOpen($period),
                    'documents_count' => count($details),
                    'summary' => $summary,
                ],
            );
        });

        return count($details);
    }

    private function details(array $json, string $direction): array
    {
        $key = $direction === 'ventas' ? 'detalleVentas' : 'detalleCompras';

        return $json[$direction][$key] ?? [];
    }

    private function mapDocument(string $direction, string $period, array $d): array
    {
        $isSale = $direction === 'ventas';
        $tipo = (int) ($d['tipoDte'] ?? $d['tipoDTE'] ?? 0);
        $num = fn ($k) => (float) ($d[$k] ?? 0);

        return [
            'direction' => $direction,
            'period' => $period,
            'tipo_dte' => $tipo,
            'tipo_label' => $d['tipoDTEString'] ?? null,
            'folio' => (string) ($d['folio'] ?? ''),
            'counterparty_rut' => (string) ($isSale ? ($d['rutCliente'] ?? '') : ($d['rutProveedor'] ?? '')),
            'counterparty_name' => $d['razonSocial'] ?? null,
            'operation_type' => $isSale ? ($d['tipoVenta'] ?? null) : ($d['tipoCompra'] ?? null),
            'issued_at' => !empty($d['fechaEmision']) ? substr($d['fechaEmision'], 0, 10) : null,
            'received_at' => !empty($d['fechaRecepcion']) ? Carbon::parse($d['fechaRecepcion']) : null,
            'exempt_amount' => $num('montoExento'),
            'net_amount' => $num('montoNeto'),
            'vat_amount' => $isSale ? $num('montoIva') : $num('montoIvaRecuperable'),
            'total_amount' => $num('montoTotal'),
            'status' => $d['estado'] ?? null,
            'raw' => $d,
        ];
    }

    private function logCall(string $direction, string $period, ?int $http, bool $consumed, ?string $note = null): void
    {
        TaxApiCall::create(['direction' => $direction, 'period' => $period, 'http_status' => $http, 'consumed' => $consumed, 'note' => $note]);
    }

    private function result(string $status, string $message, int $documents = 0): array
    {
        return ['status' => $status, 'message' => $message, 'documents' => $documents];
    }
}
