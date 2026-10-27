<?php

namespace App\Http\Controllers;

use App\Models\TaxDocument;
use App\Models\TaxPeriodSync;
use App\Services\FacturacionSyncService;
use App\Services\SimpleApiService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FacturacionController extends Controller
{
    public function __construct(private FacturacionSyncService $sync, private SimpleApiService $api)
    {
    }

    public function index(Request $request)
    {
        $period = $this->period($request->query('period'));
        $tab = in_array($request->query('tab'), ['ventas', 'compras', 'resumen'], true) ? $request->query('tab') : 'ventas';
        $filters = [
            'tipo' => (string) $request->query('tipo', ''),
            'q' => trim((string) $request->query('q', '')),
            'estado' => (string) $request->query('estado', ''),
        ];

        $all = TaxDocument::where('period', $period)->get();
        $syncs = TaxPeriodSync::where('period', $period)->get()->keyBy('direction');

        $kpis = [];
        foreach (FacturacionSyncService::DIRECTIONS as $dir) {
            $docs = $all->where('direction', $dir);
            $sign = fn ($d) => $d->isCreditNote() ? -1 : 1;
            $kpis[$dir] = [
                'count' => $docs->count(),
                'net' => (float) $docs->sum(fn ($d) => $sign($d) * (float) $d->net_amount),
                'exempt' => (float) $docs->sum(fn ($d) => $sign($d) * (float) $d->exempt_amount),
                'vat' => (float) $docs->sum(fn ($d) => $sign($d) * (float) $d->vat_amount),
                'total' => (float) $docs->sum(fn ($d) => $sign($d) * (float) $d->total_amount),
                'boletas' => $docs->whereIn('tipo_dte', [39, 41])->count(),
                'credit_notes' => $docs->filter->isCreditNote()->count(),
                'pending' => $docs->where('status', 'Pendiente')->count(),
            ];
        }

        $syncInfo = [];
        foreach (FacturacionSyncService::DIRECTIONS as $dir) {
            $row = $syncs->get($dir);
            $syncInfo[$dir] = [
                'synced_at' => optional($row?->synced_at)->toIso8601String(),
                'is_final' => (bool) $row?->is_final,
                'open' => $this->sync->isOpen($period),
            ];
        }

        $documents = null;
        $tipoOptions = [];
        $estadoOptions = [];
        if ($tab !== 'resumen') {
            $base = TaxDocument::where(['period' => $period, 'direction' => $tab]);
            $tipoOptions = (clone $base)->select('tipo_dte', 'tipo_label')->distinct()->orderBy('tipo_dte')->get()
                ->map(fn ($r) => ['value' => $r->tipo_dte, 'label' => $r->tipo_label ?: 'Tipo ' . $r->tipo_dte])->values();
            $estadoOptions = (clone $base)->whereNotNull('status')->distinct()->orderBy('status')->pluck('status');

            $query = clone $base;
            if ($filters['tipo'] !== '') {
                $query->where('tipo_dte', (int) $filters['tipo']);
            }
            if ($filters['estado'] !== '') {
                $query->where('status', $filters['estado']);
            }
            if ($filters['q'] !== '') {
                $q = $filters['q'];
                $query->where(fn ($w) => $w->where('folio', 'like', "%{$q}%")
                    ->orWhere('counterparty_name', 'like', "%{$q}%")
                    ->orWhere('counterparty_rut', 'like', "%{$q}%"));
            }

            $documents = $query->orderByDesc('issued_at')->orderByDesc('folio')->paginate(25)->withQueryString()
                ->through(fn ($d) => $this->present($d));
        }

        $summary = [];
        if ($tab === 'resumen') {
            foreach (FacturacionSyncService::DIRECTIONS as $dir) {
                $summary[$dir] = $all->where('direction', $dir)->groupBy('tipo_dte')->map(function ($docs, $tipo) {
                    $first = $docs->first();
                    $sign = fn ($d) => $d->isCreditNote() ? -1 : 1;

                    return [
                        'tipo' => (int) $tipo,
                        'label' => $first->tipo_label ?: 'Tipo ' . $tipo,
                        'count' => $docs->count(),
                        'net' => (float) $docs->sum(fn ($d) => $sign($d) * (float) $d->net_amount),
                        'exempt' => (float) $docs->sum(fn ($d) => $sign($d) * (float) $d->exempt_amount),
                        'vat' => (float) $docs->sum(fn ($d) => $sign($d) * (float) $d->vat_amount),
                        'total' => (float) $docs->sum(fn ($d) => $sign($d) * (float) $d->total_amount),
                        'credit_note' => $first->isCreditNote(),
                    ];
                })->sortKeys()->values();
            }
        }

        return Inertia::render('Facturacion/Index', [
            'period' => $period,
            'periods' => $this->periodOptions(),
            'tab' => $tab,
            'filters' => $filters,
            'kpis' => $kpis,
            'ivaToPay' => $kpis['ventas']['vat'] - $kpis['compras']['vat'],
            'syncInfo' => $syncInfo,
            'documents' => $documents,
            'tipoOptions' => $tipoOptions,
            'estadoOptions' => $estadoOptions,
            'summary' => $summary,
            'quota' => [
                'used' => $this->sync->quotaUsed(),
                'total' => $this->sync->quota(),
                'remaining' => $this->sync->quotaRemaining(),
            ],
            'configured' => $this->api->isConfigured(),
            'cooldownHours' => (int) config('services.simpleapi.cooldown_hours'),
        ]);
    }

    public function sync(Request $request)
    {
        $data = $request->validate([
            'direction' => ['required', 'in:ventas,compras,both'],
            'period' => ['required', 'regex:/^\d{4}(0[1-9]|1[0-2])$/'],
            'force' => ['sometimes', 'boolean'],
        ]);

        $directions = $data['direction'] === 'both' ? FacturacionSyncService::DIRECTIONS : [$data['direction']];
        $force = (bool) ($data['force'] ?? false);

        $messages = [];
        $failed = false;
        foreach ($directions as $dir) {
            $res = $this->sync->syncPeriod($dir, $data['period'], $force);
            $messages[] = ucfirst($dir) . ': ' . $res['message'];
            $failed = $failed || $res['status'] === 'error';
        }

        return back()->with($failed ? 'error' : 'success', implode(' · ', $messages));
    }

    public function export(Request $request)
    {
        $period = $this->period($request->query('period'));
        $direction = $request->query('direction') === 'compras' ? 'compras' : 'ventas';

        $docs = TaxDocument::where(['period' => $period, 'direction' => $direction])
            ->orderBy('issued_at')->orderBy('folio')->get();

        $name = "facturacion-{$direction}-{$period}.csv";

        return response()->streamDownload(function () use ($docs, $direction) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Tipo', 'Folio', 'Fecha emisión', $direction === 'ventas' ? 'RUT cliente' : 'RUT proveedor', $direction === 'ventas' ? 'Cliente' : 'Proveedor', 'Exento', 'Neto', 'IVA', 'Total', 'Estado'], ';');
            foreach ($docs as $d) {
                $sign = $d->isCreditNote() ? -1 : 1;
                fputcsv($out, [
                    $d->tipo_label ?: $d->tipo_dte, $d->folio, optional($d->issued_at)->format('d-m-Y'), $d->counterparty_rut, $d->counterparty_name,
                    round($sign * $d->exempt_amount), round($sign * $d->net_amount), round($sign * $d->vat_amount), round($sign * $d->total_amount), $d->status,
                ], ';');
            }
            fclose($out);
        }, $name, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function present(TaxDocument $d): array
    {
        $sign = $d->isCreditNote() ? -1 : 1;

        return [
            'id' => $d->id,
            'tipo' => $d->tipo_dte,
            'tipo_label' => $d->tipo_label,
            'folio' => $d->folio,
            'issued_at' => optional($d->issued_at)->format('Y-m-d'),
            'received_at' => optional($d->received_at)->format('Y-m-d H:i'),
            'rut' => $d->counterparty_rut,
            'name' => $d->counterparty_name,
            'operation' => $d->operation_type,
            'exempt' => $sign * (float) $d->exempt_amount,
            'net' => $sign * (float) $d->net_amount,
            'vat' => $sign * (float) $d->vat_amount,
            'total' => $sign * (float) $d->total_amount,
            'status' => $d->status,
            'credit_note' => $d->isCreditNote(),
            'raw' => array_filter($d->raw ?? [], fn ($v) => $v !== null && $v !== '' && $v !== '0' && $v !== 0),
        ];
    }

    private function period(?string $value): string
    {
        return $value && preg_match('/^\d{4}(0[1-9]|1[0-2])$/', $value) ? $value : now()->format('Ym');
    }

    private function periodOptions(): array
    {
        $synced = TaxPeriodSync::select('period', 'direction', 'is_final')->get()->groupBy('period');
        $options = [];
        for ($i = 0; $i < 12; $i++) {
            $d = Carbon::now()->startOfMonth()->subMonths($i);
            $key = $d->format('Ym');
            $options[] = [
                'value' => $key,
                'label' => ucfirst($d->locale('es')->translatedFormat('F Y')),
                'synced' => isset($synced[$key]),
            ];
        }

        return $options;
    }
}
