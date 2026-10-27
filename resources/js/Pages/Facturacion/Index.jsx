import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const money = (n) =>
    n === null || n === undefined
        ? '-'
        : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('-') : '-');

function timeAgo(iso) {
    if (!iso) return null;
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 2) return 'hace un momento';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    return `hace ${days} día${days === 1 ? '' : 's'}`;
}

const TIPOS = {
    33: { name: 'Factura', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
    34: { name: 'Factura exenta', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
    39: { name: 'Boleta', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' },
    41: { name: 'Boleta exenta', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' },
    43: { name: 'Liquidación de factura', cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800' },
    46: { name: 'Factura de compra', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
    52: { name: 'Guía de despacho', cls: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700' },
    56: { name: 'Nota de débito', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' },
    61: { name: 'Nota de crédito', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' },
};
const tipoInfo = (tipo, label) =>
    TIPOS[tipo] ?? {
        name: label || `Tipo ${tipo}`,
        cls: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700',
    };

const ESTADOS = {
    Confirmada: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    Registrada: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    Pendiente: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
    Reclamado: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    Reclamada: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
};
const ESTADO_HELP = {
    Confirmada: 'Documento aceptado en el registro del SII.',
    Registrada: 'Documento registrado y aceptado.',
    Pendiente: 'El SII lo recibió pero aún no está confirmado. En compras: todavía no lo has aceptado o reclamado.',
    Reclamada: 'Reclamaste el documento al SII.',
    Reclamado: 'Reclamaste el documento al SII.',
};

const RAW_LABELS = {
    tipoDTEString: 'Tipo de documento', tipoDte: 'Código de tipo', tipoDTE: 'Código de tipo', tipoVenta: 'Tipo de venta', tipoCompra: 'Tipo de compra',
    rutCliente: 'RUT cliente', rutProveedor: 'RUT proveedor', razonSocial: 'Razón social', folio: 'Folio',
    fechaEmision: 'Fecha de emisión', fechaRecepcion: 'Fecha de recepción en el SII', fechaAcuse: 'Fecha de acuse',
    montoExento: 'Monto exento', montoNeto: 'Monto neto', montoIva: 'IVA', montoIvaRecuperable: 'IVA recuperable',
    montoIvaNoRecuperable: 'IVA no recuperable', montoTotal: 'Total', estado: 'Estado', acuseRecibo: 'Acuse de recibo',
    tipoDocReferencia: 'Tipo de documento de referencia', folioDocReferencia: 'Folio de referencia',
    rutEmisorLiqFactura: 'RUT emisor de la liquidación', indicadorServicio: 'Indicador de servicio',
    numeroInterno: 'Número interno', codigoOtroImpuesto: 'Código otro impuesto', totalOtrosImpuestos: 'Total otros impuestos',
};
const rawLabel = (k) => RAW_LABELS[k] || k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, (c) => c.toUpperCase());
const isAmountKey = (k) => /^(monto|iva|total|neto|exento|valor)/i.test(k) || /Comision|Impuesto/i.test(k);

function Badge({ cls, children, title }) {
    return (
        <span title={title} className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap ${cls}`}>
            {children}
        </span>
    );
}

function Kpi({ label, value, sub, tone = 'default', help }) {
    const tones = {
        default: 'text-gray-900 dark:text-white',
        green: 'text-emerald-600 dark:text-emerald-400',
        red: 'text-red-600 dark:text-red-400',
        blue: 'text-blue-600 dark:text-blue-400',
    };
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4" title={help}>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
            <div className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>
            {sub && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
        </div>
    );
}

const field = 'rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm';

export default function Index({ auth, period, periods, tab, filters, kpis, ivaToPay, syncInfo, documents, tipoOptions, estadoOptions, summary, quota, configured }) {
    const flash = usePage().props.flash || {};
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
    const [search, setSearch] = useState(filters.q || '');

    const periodLabel = periods.find((p) => p.value === period)?.label ?? period;
    const idx = periods.findIndex((p) => p.value === period);

    const go = (params) =>
        router.get(route('facturacion.index'), { period, tab, ...filters, ...params }, { preserveState: true, replace: true });

    const changePeriod = (value) =>
        router.get(route('facturacion.index'), { period: value, tab }, { preserveState: false });

    const runSync = (direction) => {
        const dirs = direction === 'both' ? ['ventas', 'compras'] : [direction];
        const synced = dirs.filter((d) => syncInfo[d].synced_at);
        const cost = dirs.length;
        let force = false;

        if (quota.remaining < cost) {
            alert(`Te quedan ${quota.remaining} consulta(s) este mes y esta acción necesita ${cost}. Se renuevan el día 1 de cada mes, o puedes subir de plan en SimpleAPI.`);
            return;
        }

        if (synced.length > 0) {
            const when = timeAgo(syncInfo[synced[0]].synced_at);
            const ok = confirm(
                `Ya actualizaste este mes ${when}.\n\nVolver a consultar gastará hasta ${cost} consulta(s) de las ${quota.remaining} que te quedan este mes.\n\n¿Actualizar de todas formas?`,
            );
            if (!ok) return;
            force = true;
        } else if (!confirm(`Esto gastará hasta ${cost} consulta(s) de las ${quota.remaining} que te quedan este mes. ¿Continuar?`)) {
            return;
        }

        setBusy(true);
        router.post(route('facturacion.sync'), { direction, period, force }, { preserveScroll: true, onFinish: () => setBusy(false) });
    };

    const submitSearch = (e) => {
        e.preventDefault();
        go({ q: search });
    };

    const quotaPct = quota.total ? Math.min(100, Math.round((quota.used / quota.total) * 100)) : 0;
    const hasAnyData = kpis.ventas.count + kpis.compras.count > 0;
    const direction = tab === 'compras' ? 'compras' : 'ventas';
    const side = tab === 'compras' ? 'Proveedor' : 'Cliente';

    const tabs = [
        { key: 'ventas', label: 'Ventas', count: kpis.ventas.count },
        { key: 'compras', label: 'Compras', count: kpis.compras.count },
        { key: 'resumen', label: 'Resumen por tipo' },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Facturación" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-5">
                    {/* Encabezado */}
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facturación</h1>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                Boletas, facturas y notas de crédito de tu empresa, tal como las tiene registradas el SII.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowHelp((v) => !v)}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {showHelp ? 'Ocultar ayuda' : '¿Cómo leer esta pantalla?'}
                        </button>
                    </div>

                    <AnimatePresence initial={false}>
                        {showHelp && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-900/10 p-5 text-sm text-gray-700 dark:text-gray-300 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="font-semibold mb-1">Los montos</p>
                                        <ul className="space-y-1 list-disc pl-5">
                                            <li><b>Neto:</b> el valor sin IVA.</li>
                                            <li><b>IVA:</b> el 19% que se suma al neto.</li>
                                            <li><b>Exento:</b> parte de la venta que no paga IVA.</li>
                                            <li><b>Total:</b> neto + IVA (+ exento). Es lo que paga el cliente.</li>
                                            <li>Las <b>notas de crédito</b> anulan o rebajan una venta, por eso aparecen en rojo y <b>restan</b> en los totales.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-semibold mb-1">Ventas y compras</p>
                                        <ul className="space-y-1 list-disc pl-5">
                                            <li><b>Ventas:</b> lo que tú emitiste (boletas, facturas…). Incluye las liquidaciones que Mercado Libre emite por ti.</li>
                                            <li><b>Compras:</b> facturas que te emitieron tus proveedores.</li>
                                            <li><b>IVA estimado a pagar</b> = IVA de tus ventas − IVA de tus compras. Es solo una guía: el cálculo oficial lo hace el SII en el F29.</li>
                                            <li><b>Pendiente:</b> el SII ya recibió el documento pero aún no está confirmado.</li>
                                        </ul>
                                    </div>
                                    <div className="md:col-span-2 rounded-xl bg-white/70 dark:bg-slate-900/60 p-3 border border-indigo-100 dark:border-indigo-900/40">
                                        <p className="font-semibold mb-1">Sobre las consultas (para no gastarlas)</p>
                                        Los datos vienen de SimpleAPI, que tiene un límite mensual de consultas según tu plan. Aquí se <b>guardan</b>:
                                        puedes navegar, filtrar y exportar sin gastar nada. Solo se consulta cuando pulsas <b>Actualizar</b>.
                                        Cada lado (ventas o compras) de un mes cuesta 1 consulta, y los meses ya cerrados no necesitan volver a consultarse.
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!configured && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800 px-4 py-3 text-sm">
                            Falta conectar SimpleAPI: agrega <code>SIMPLEAPI_KEY</code>, <code>SII_RUT_EMPRESA</code>, <code>SII_RUT_USUARIO</code> y <code>SII_PASSWORD</code> al archivo <code>.env</code> del servidor.
                        </div>
                    )}
                    {flash.success && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm">{flash.success}</div>
                    )}
                    {flash.error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800 px-4 py-3 text-sm">{flash.error}</div>
                    )}

                    {/* Barra: período + actualizar + cuota */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={idx >= periods.length - 1}
                                onClick={() => changePeriod(periods[idx + 1].value)}
                                className="h-9 w-9 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30"
                                aria-label="Mes anterior"
                            >
                                ‹
                            </button>
                            <select value={period} onChange={(e) => changePeriod(e.target.value)} className={`${field} font-semibold min-w-[11rem]`} aria-label="Mes">
                                {periods.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                        {p.synced ? ' ●' : ''}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                disabled={idx <= 0}
                                onClick={() => changePeriod(periods[idx - 1].value)}
                                className="h-9 w-9 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30"
                                aria-label="Mes siguiente"
                            >
                                ›
                            </button>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                            {['ventas', 'compras'].map((d) => (
                                <div key={d}>
                                    <span className="font-semibold capitalize">{d}:</span>{' '}
                                    {syncInfo[d].synced_at ? `actualizado ${timeAgo(syncInfo[d].synced_at)}` : 'sin datos todavía'}
                                    {syncInfo[d].synced_at && (
                                        <span className={`ml-1.5 ${syncInfo[d].is_final ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {syncInfo[d].is_final ? '· mes cerrado ✓' : '· mes abierto (puede cambiar)'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="ml-auto flex flex-wrap items-center gap-4">
                            <div className="min-w-[10rem]" title="Cada consulta a SimpleAPI gasta 1 de tu cuota mensual. Se renueva el día 1.">
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>Consultas del mes</span>
                                    <span className="font-semibold">{quota.used} de {quota.total}</span>
                                </div>
                                <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${quotaPct >= 80 ? 'bg-red-500' : quotaPct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${quotaPct}%` }}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={busy || !configured}
                                onClick={() => runSync('both')}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                <svg className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0019 12M18.4 9A8 8 0 005 12" />
                                </svg>
                                {busy ? 'Consultando al SII…' : 'Actualizar mes (2 consultas)'}
                            </button>
                        </div>
                    </div>

                    {/* Indicadores */}
                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <Kpi label="Ventas del mes" value={money(kpis.ventas.total)} sub={`${kpis.ventas.count} documentos · neto ${money(kpis.ventas.net)}`} tone="green" help="Total vendido con IVA, descontando notas de crédito" />
                        <Kpi label="Compras del mes" value={money(kpis.compras.total)} sub={`${kpis.compras.count} documentos · neto ${money(kpis.compras.net)}`} tone="blue" help="Total comprado con IVA, descontando notas de crédito" />
                        <Kpi label="IVA de tus ventas" value={money(kpis.ventas.vat)} sub="IVA que cobraste (débito)" help="IVA incluido en tus ventas" />
                        <Kpi label="IVA de tus compras" value={money(kpis.compras.vat)} sub="IVA que pagaste (crédito)" help="IVA recuperable de tus compras" />
                        <Kpi
                            label={ivaToPay >= 0 ? 'IVA estimado a pagar' : 'IVA a favor (estimado)'}
                            value={money(Math.abs(ivaToPay))}
                            sub="Ventas − compras. Referencial"
                            tone={ivaToPay >= 0 ? 'red' : 'green'}
                            help="IVA de ventas menos IVA de compras. El cálculo oficial lo hace el SII en el F29."
                        />
                        <Kpi label="Boletas emitidas" value={kpis.ventas.boletas} sub={kpis.ventas.credit_notes ? `${kpis.ventas.credit_notes} nota(s) de crédito` : 'Sin notas de crédito'} />
                    </div>

                    {/* Pestañas */}
                    <div className="relative flex gap-1 rounded-2xl bg-gray-100 dark:bg-slate-800/60 p-1.5 w-full sm:w-fit overflow-x-auto">
                        {tabs.map((t) => {
                            const active = tab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => router.get(route('facturacion.index'), { period, tab: t.key }, { preserveState: false })}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                >
                                    {active && (
                                        <motion.span layoutId="facturacion-tab" className="absolute inset-0 rounded-xl bg-indigo-600 shadow-sm shadow-indigo-600/30" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                                    )}
                                    <span className="relative">{t.label}</span>
                                    {t.count !== undefined && <span className={`relative text-xs rounded-full px-1.5 ${active ? 'bg-white/25' : 'bg-gray-200 dark:bg-slate-700'}`}>{t.count}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Contenido */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                        {tab !== 'resumen' && (
                            <>
                                <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                                    <form onSubmit={submitSearch} className="flex gap-2 flex-1 min-w-[14rem]">
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder={`Buscar por folio, ${side.toLowerCase()} o RUT`}
                                            className={`${field} flex-1`}
                                        />
                                        <button type="submit" className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm hover:bg-gray-200 dark:hover:bg-slate-700 dark:text-gray-200">Buscar</button>
                                    </form>
                                    <select value={filters.tipo} onChange={(e) => go({ tipo: e.target.value })} className={field}>
                                        <option value="">Todos los tipos</option>
                                        {tipoOptions.map((o) => (
                                            <option key={o.value} value={o.value}>{tipoInfo(o.value, o.label).name}</option>
                                        ))}
                                    </select>
                                    <select value={filters.estado} onChange={(e) => go({ estado: e.target.value })} className={field}>
                                        <option value="">Todos los estados</option>
                                        {estadoOptions.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    {(filters.tipo || filters.estado || filters.q) && (
                                        <button type="button" onClick={() => { setSearch(''); go({ tipo: '', estado: '', q: '' }); }} className="text-sm text-gray-500 underline">Limpiar</button>
                                    )}
                                    <div className="ml-auto flex gap-2">
                                        <button
                                            type="button"
                                            disabled={busy || !configured}
                                            onClick={() => runSync(direction)}
                                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                            title="Consulta solo este lado del mes: gasta 1 consulta"
                                        >
                                            Actualizar solo {direction} (1)
                                        </button>
                                        <a
                                            href={route('facturacion.export', { period, direction })}
                                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                                            title="Descarga un CSV (se abre en Excel) sin gastar consultas"
                                        >
                                            Exportar Excel
                                        </a>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50/80 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800">
                                                <th className="py-3 px-5">Documento</th>
                                                <th className="py-3 px-4">Folio</th>
                                                <th className="py-3 px-4">Fecha</th>
                                                <th className="py-3 px-4">{side}</th>
                                                <th className="py-3 px-4 text-right">Neto</th>
                                                <th className="py-3 px-4 text-right">IVA</th>
                                                <th className="py-3 px-4 text-right">Total</th>
                                                <th className="py-3 px-4">Estado</th>
                                                <th className="py-3 px-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {documents.data.length === 0 && (
                                                <tr>
                                                    <td colSpan={9} className="py-16 text-center text-gray-400">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-3xl">🧾</span>
                                                            {!syncInfo[direction].synced_at ? (
                                                                <>
                                                                    <span>Aún no hay datos de {direction} para {periodLabel}.</span>
                                                                    <span className="text-xs">Pulsa “Actualizar” para traerlos desde el SII.</span>
                                                                </>
                                                            ) : (
                                                                <span>No hay documentos que coincidan.</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {documents.data.map((d, i) => {
                                                const info = tipoInfo(d.tipo, d.tipo_label);
                                                return (
                                                    <motion.tr
                                                        key={d.id}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                                                        onClick={() => setSelected(d)}
                                                        className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/30 cursor-pointer"
                                                    >
                                                        <td className="py-2.5 px-5"><Badge cls={info.cls}>{info.name}</Badge></td>
                                                        <td className="py-2.5 px-4 font-mono text-gray-700 dark:text-gray-300">{d.folio}</td>
                                                        <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(d.issued_at)}</td>
                                                        <td className="py-2.5 px-4">
                                                            <div className="text-gray-800 dark:text-gray-100">{d.name || (d.rut === '66666666-6' ? 'Cliente sin identificar' : '—')}</div>
                                                            <div className="text-xs text-gray-400">{d.rut}</div>
                                                        </td>
                                                        <td className={`py-2.5 px-4 text-right ${d.credit_note ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'}`}>{money(d.net)}</td>
                                                        <td className={`py-2.5 px-4 text-right ${d.credit_note ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'}`}>{money(d.vat)}</td>
                                                        <td className={`py-2.5 px-4 text-right font-semibold ${d.credit_note ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{money(d.total)}</td>
                                                        <td className="py-2.5 px-4">
                                                            {d.status ? <Badge cls={ESTADOS[d.status] ?? 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700'} title={ESTADO_HELP[d.status]}>{d.status}</Badge> : <span className="text-gray-300">—</span>}
                                                        </td>
                                                        <td className="py-2.5 px-4 text-right text-indigo-600 dark:text-indigo-400 text-sm font-medium whitespace-nowrap">Ver detalle</td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {documents.last_page > 1 && (
                                    <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between">
                                        <span className="text-xs text-gray-400">{documents.total} documentos · página {documents.current_page} de {documents.last_page}</span>
                                        <div className="flex gap-1.5">
                                            {documents.links.map((l, i) => (
                                                <button
                                                    key={i}
                                                    disabled={!l.url}
                                                    onClick={() => l.url && router.get(l.url, {}, { preserveState: true })}
                                                    className={`px-3 py-1.5 text-sm rounded-lg ${l.active ? 'bg-gray-900 text-white dark:bg-indigo-500' : 'bg-gray-50 dark:bg-slate-800 dark:text-gray-200'} ${!l.url ? 'opacity-40' : ''}`}
                                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {tab === 'resumen' && (
                            <div className="p-5 space-y-8">
                                {!hasAnyData && (
                                    <div className="py-10 text-center text-gray-400">
                                        <div className="text-3xl mb-2">🧾</div>
                                        Aún no hay datos de {periodLabel}. Pulsa “Actualizar mes” para traerlos desde el SII.
                                    </div>
                                )}
                                {hasAnyData &&
                                    ['ventas', 'compras'].map((d) => (
                                        <div key={d}>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize mb-1">{d} de {periodLabel}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                {d === 'ventas' ? 'Cuántos documentos emitiste de cada tipo y cuánto suman.' : 'Cuántas facturas de proveedores tienes de cada tipo y cuánto suman.'}
                                            </p>
                                            {summary[d].length === 0 ? (
                                                <div className="text-sm text-gray-400">Sin documentos.</div>
                                            ) : (
                                                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-800">
                                                    <table className="min-w-full text-sm">
                                                        <thead>
                                                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50/80 dark:bg-slate-800/40">
                                                                <th className="py-2.5 px-4">Tipo de documento</th>
                                                                <th className="py-2.5 px-4 text-right">Cantidad</th>
                                                                <th className="py-2.5 px-4 text-right">Neto</th>
                                                                <th className="py-2.5 px-4 text-right">IVA</th>
                                                                <th className="py-2.5 px-4 text-right">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {summary[d].map((r) => (
                                                                <tr key={r.tipo} className="border-t border-gray-50 dark:border-slate-800/60">
                                                                    <td className="py-2.5 px-4"><Badge cls={tipoInfo(r.tipo, r.label).cls}>{tipoInfo(r.tipo, r.label).name}</Badge></td>
                                                                    <td className="py-2.5 px-4 text-right">{r.count}</td>
                                                                    <td className="py-2.5 px-4 text-right">{money(r.net)}</td>
                                                                    <td className="py-2.5 px-4 text-right">{money(r.vat)}</td>
                                                                    <td className={`py-2.5 px-4 text-right font-semibold ${r.credit_note ? 'text-red-600' : ''}`}>{money(r.total)}</td>
                                                                </tr>
                                                            ))}
                                                            <tr className="border-t-2 border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/30 font-bold">
                                                                <td className="py-2.5 px-4">Total {d}</td>
                                                                <td className="py-2.5 px-4 text-right">{kpis[d].count}</td>
                                                                <td className="py-2.5 px-4 text-right">{money(kpis[d].net)}</td>
                                                                <td className="py-2.5 px-4 text-right">{money(kpis[d].vat)}</td>
                                                                <td className="py-2.5 px-4 text-right">{money(kpis[d].total)}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detalle del documento */}
            <AnimatePresence>
                {selected && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => setSelected(null)}
                    >
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
                        >
                            <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100 dark:border-slate-800">
                                <div>
                                    <Badge cls={tipoInfo(selected.tipo, selected.tipo_label).cls}>{tipoInfo(selected.tipo, selected.tipo_label).name}</Badge>
                                    <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">Folio {selected.folio}</h2>
                                    <p className="text-sm text-gray-500">Emitido el {fmtDate(selected.issued_at)}</p>
                                </div>
                                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Cerrar">×</button>
                            </div>

                            <div className="p-5 space-y-5">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="col-span-2 rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3">
                                        <div className="text-xs uppercase tracking-wide text-gray-400">{side}</div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{selected.name || (selected.rut === '66666666-6' ? 'Cliente sin identificar (boleta)' : 'Sin nombre registrado')}</div>
                                        <div className="text-gray-500">{selected.rut}</div>
                                    </div>
                                    {selected.exempt !== 0 && <Row label="Exento" value={money(selected.exempt)} />}
                                    <Row label="Neto (sin IVA)" value={money(selected.net)} />
                                    <Row label="IVA" value={money(selected.vat)} />
                                    <Row label="Total" value={money(selected.total)} strong />
                                    {selected.status && <Row label="Estado" value={`${selected.status}${ESTADO_HELP[selected.status] ? ' — ' + ESTADO_HELP[selected.status] : ''}`} wide />}
                                    {selected.operation && <Row label="Tipo de operación" value={selected.operation} />}
                                    {selected.received_at && <Row label="Recibido por el SII" value={selected.received_at} />}
                                </div>
                                {selected.credit_note && (
                                    <p className="text-xs text-red-600">Es una nota de crédito: los montos se muestran negativos porque restan de los totales.</p>
                                )}

                                <details className="rounded-xl border border-gray-100 dark:border-slate-800">
                                    <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300">Todos los datos del SII</summary>
                                    <dl className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                                        {Object.entries(selected.raw).map(([k, v]) => (
                                            <div key={k} className="flex justify-between gap-3 border-b border-gray-50 dark:border-slate-800/60 py-1">
                                                <dt className="text-gray-500">{rawLabel(k)}</dt>
                                                <dd className="text-gray-800 dark:text-gray-100 text-right break-all">{isAmountKey(k) && !isNaN(Number(v)) ? money(Number(v)) : String(v)}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </details>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}

function Row({ label, value, strong, wide }) {
    return (
        <div className={wide ? 'col-span-2' : ''}>
            <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
            <div className={strong ? 'text-lg font-bold text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}>{value}</div>
        </div>
    );
}
