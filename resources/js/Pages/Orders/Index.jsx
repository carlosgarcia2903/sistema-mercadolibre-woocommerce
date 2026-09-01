import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/Components/ui/badge';

const DELIVERY_STATUS_LABELS = {
    pending: 'Pendiente',
    ready_to_ship: 'Listo para enviar',
    handling: 'Preparando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    not_delivered: 'No entregado',
    cancelled: 'Cancelado',
};

function toSpanishDeliveryStatus(status) {
    if (!status) return 'Sin información';
    return DELIVERY_STATUS_LABELS[status] || status.replaceAll('_', ' ');
}

function deliveryBadgeVariant(status) {
    if (status === 'delivered') return 'success';
    if (status === 'cancelled' || status === 'not_delivered') return 'destructive';
    if (status === 'shipped' || status === 'handling' || status === 'ready_to_ship') return 'warning';
    return 'outline';
}

function toSpanishLogisticType(type) {
    if (!type) return 'ML';
    if (type === 'self_service') return 'Flex';
    return 'ML';
}

function formatMoney(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(Number(value));
}

// Identidad visual por plataforma — un solo lugar para colores, emoji e ícono.
const PLATFORMS = {
    woocommerce: {
        label: 'WooCommerce',
        short: 'WooCommerce',
        emoji: '🛍️',
        color: 'violet',
        dot: 'bg-violet-500',
        activeTab: 'bg-violet-600 text-white shadow-sm shadow-violet-600/30',
        syncBtn: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-400',
        header: 'bg-violet-700',
    },
    mercadolibre: {
        label: 'Mercado Libre',
        short: 'ML',
        emoji: '🛒',
        color: 'amber',
        dot: 'bg-amber-400',
        activeTab: 'bg-amber-500 text-white shadow-sm shadow-amber-500/30',
        syncBtn: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-300',
        header: 'bg-violet-700',
    },
    falabella: {
        label: 'Falabella',
        short: 'Falabella',
        emoji: '🟢',
        color: 'green',
        dot: 'bg-green-500',
        activeTab: 'bg-green-600 text-white shadow-sm shadow-green-600/30',
        syncBtn: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-400',
        header: 'bg-violet-700',
    },
    paris: {
        label: 'Paris',
        short: 'Paris',
        emoji: '🔴',
        color: 'red',
        dot: 'bg-red-500',
        activeTab: 'bg-red-600 text-white shadow-sm shadow-red-600/30',
        syncBtn: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-400',
        header: 'bg-violet-700',
    },
    presencial: {
        label: 'Venta en Tienda',
        short: 'Tienda',
        emoji: '🏬',
        color: 'indigo',
        dot: 'bg-indigo-500',
        activeTab: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30',
        syncBtn: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-400',
        header: 'bg-violet-700',
    },
};

// Plataformas que se sincronizan por API (botones de "Sincronizar").
const TAB_ORDER = ['woocommerce', 'mercadolibre', 'falabella', 'paris'];
// Todas las plataformas visibles como tab, incluida "presencial" (se carga desde /pos, no se sincroniza).
const ALL_TABS = [...TAB_ORDER, 'presencial'];

// Estados de WooCommerce (los únicos editables desde acá) — el value es el slug
// real que WooCommerce espera vía API; el label es solo para mostrar en español,
// no se envía a WooCommerce ni lo modifica.
const WOO_STATUSES = [
    { value: 'pending',    label: 'Pendiente de pago' },
    { value: 'processing', label: 'Procesando' },
    { value: 'on-hold',    label: 'En espera' },
    { value: 'completed',  label: 'Completado' },
    { value: 'cancelled',  label: 'Cancelado' },
    { value: 'refunded',   label: 'Reembolsado' },
    { value: 'failed',     label: 'Fallido' },
];

// Traducción de estados a español para mostrar en tabla/filtros — cubre WooCommerce
// y los estados típicos de ML/Falabella/Paris/presencial. Solo texto: el valor
// real que se guarda y se manda a cada plataforma no cambia.
const ORDER_STATUS_LABELS = {
    ...Object.fromEntries(WOO_STATUSES.map((s) => [s.value, s.label])),
    paid: 'Pagado',
    confirmed: 'Confirmado',
    payment_required: 'Pago requerido',
    payment_in_process: 'Pago en proceso',
    partially_paid: 'Pago parcial',
    invalid: 'Inválido',
};

function toSpanishOrderStatus(status) {
    if (!status) return '-';
    return ORDER_STATUS_LABELS[status] || status;
}

function SpinnerIcon({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
    );
}

function SyncIcon({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}

export default function Index({ auth, orders, tab, filters = {}, statusOptions = [], deliveryStatusOptions = [] }) {
    const { props } = usePage();
    const flash = props.flash || {};

    const platform = PLATFORMS[tab] ?? PLATFORMS.woocommerce;
    const isMarketplace = tab === 'mercadolibre' || tab === 'falabella' || tab === 'paris' || tab === 'presencial';

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [syncing, setSyncing] = useState(null);
    const [pendingStatus, setPendingStatus] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusSaved, setStatusSaved] = useState(false);
    const [deliveryEmailSent, setDeliveryEmailSent] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const openOrder = (o) => {
        setSelectedOrder(o);
        setPendingStatus(null);
        setStatusSaved(false);
        setDeliveryEmailSent(false);
    };

    const handleStatusSave = async () => {
        if (!selectedOrder || !pendingStatus || updatingStatus) return;
        setUpdatingStatus(true);
        setStatusSaved(false);
        setDeliveryEmailSent(false);
        try {
            const { data } = await axios.patch(route('orders.updateStatus', selectedOrder.id), { status: pendingStatus });
            setSelectedOrder((prev) => ({ ...prev, status: pendingStatus }));
            setPendingStatus(null);
            setStatusSaved(true);
            setDeliveryEmailSent(!!data?.email_sent);
            router.reload({ only: ['orders'], preserveScroll: true });
        } catch (e) {
            alert('Error al actualizar el estado: ' + (e.response?.data?.error || e.message));
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleSync = (syncPlatform) => {
        setSyncing(syncPlatform);
        router.post(
            route('orders.sync'),
            { platform: syncPlatform },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setSyncing(null),
            },
        );
    };

    const [filterForm, setFilterForm] = useState({
        order_id: filters.order_id || '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        customer: filters.customer || '',
        status: filters.status || '',
        logistic_type: filters.logistic_type || '',
        delivery_status: filters.delivery_status || '',
    });

    const activeFilterCount = Object.values(filterForm).filter(Boolean).length;

    const onFilterChange = (key, value) => {
        setFilterForm((prev) => ({ ...prev, [key]: value }));
    };

    const submitFilters = (e) => {
        e.preventDefault();
        router.get(route('orders.index'), { tab, ...filterForm }, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        const reset = { order_id: '', date_from: '', date_to: '', customer: '', status: '', logistic_type: '', delivery_status: '' };
        setFilterForm(reset);
        router.get(route('orders.index'), { tab }, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Órdenes" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">

                    {/* Flash messages */}
                    <AnimatePresence>
                        {flash.success && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm flex items-start gap-3"
                            >
                                <span className="text-lg leading-none mt-0.5">✅</span>
                                <div>
                                    {flash.success.split('✉️').map((part, i) =>
                                        i === 0 ? (
                                            <span key={i}>{part}</span>
                                        ) : (
                                            <span key={i} className="block mt-1 font-semibold text-green-700 dark:text-green-400">
                                                ✉️{part}
                                            </span>
                                        )
                                    )}
                                </div>
                            </motion.div>
                        )}
                        {flash.error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-center gap-3"
                            >
                                <span className="text-lg">❌</span>
                                {flash.error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Header: título + toolbar de sincronización */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Órdenes</h1>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                Pedidos sincronizados desde tus tiendas y marketplaces
                            </p>
                        </div>

                        <div className="flex items-center gap-1 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-sm">
                            <span className="hidden sm:inline pl-2 pr-1 text-xs font-medium text-gray-400">Sincronizar</span>
                            {TAB_ORDER.map((key) => {
                                const p = PLATFORMS[key];
                                const isSyncing = syncing === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleSync(key)}
                                        disabled={syncing !== null}
                                        title={`Sincronizar ${p.label}`}
                                        aria-label={`Sincronizar ${p.label}`}
                                        className={`relative flex items-center justify-center h-8 w-8 rounded-xl text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${p.syncBtn} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${!isSyncing && 'hover:scale-105 active:scale-95'}`}
                                    >
                                        {isSyncing ? <SpinnerIcon /> : <SyncIcon />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab bar de plataformas — indicador animado */}
                    <div className="relative flex gap-1 rounded-2xl bg-gray-100 dark:bg-slate-800/60 p-1.5 w-full sm:w-fit overflow-x-auto">
                        {ALL_TABS.map((key) => {
                            const p = PLATFORMS[key];
                            const active = tab === key;
                            return (
                                <Link
                                    key={key}
                                    href={route('orders.index', { tab: key })}
                                    className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                                        active ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="orders-tab-indicator"
                                            className={`absolute inset-0 rounded-xl ${p.activeTab}`}
                                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                        />
                                    )}
                                    <span className="relative">{p.emoji}</span>
                                    <span className="relative">{p.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Card principal */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">

                        {/* Barra de filtros colapsable */}
                        <div className="border-b border-gray-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setFiltersOpen((v) => !v)}
                                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M6 12h12M10 19.5h4" />
                                    </svg>
                                    Filtros
                                    {activeFilterCount > 0 && (
                                        <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </span>
                                <motion.svg
                                    animate={{ rotate: filtersOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-4 w-4 text-gray-400"
                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </motion.svg>
                            </button>

                            <AnimatePresence initial={false}>
                                {filtersOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <form onSubmit={submitFilters} className="px-5 pb-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                <input
                                                    type="text"
                                                    value={filterForm.order_id}
                                                    onChange={(e) => onFilterChange('order_id', e.target.value)}
                                                    placeholder="Buscar por ID"
                                                    className="rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                                />
                                                <input
                                                    type="date"
                                                    value={filterForm.date_from}
                                                    onChange={(e) => onFilterChange('date_from', e.target.value)}
                                                    className="rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                                />
                                                <input
                                                    type="date"
                                                    value={filterForm.date_to}
                                                    onChange={(e) => onFilterChange('date_to', e.target.value)}
                                                    className="rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                                />
                                                <input
                                                    type="text"
                                                    value={filterForm.customer}
                                                    onChange={(e) => onFilterChange('customer', e.target.value)}
                                                    placeholder="Buscar cliente"
                                                    className="rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                                />
                                                <select
                                                    value={filterForm.status}
                                                    onChange={(e) => onFilterChange('status', e.target.value)}
                                                    className="rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                                >
                                                    <option value="">Estado (todos)</option>
                                                    {statusOptions.map((status) => (
                                                        <option key={status} value={status}>{toSpanishOrderStatus(status)}</option>
                                                    ))}
                                                </select>
                                                {tab === 'mercadolibre' && (
                                                    <select
                                                        value={filterForm.logistic_type}
                                                        onChange={(e) => onFilterChange('logistic_type', e.target.value)}
                                                        className="rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                                    >
                                                        <option value="">Tipo envío (todos)</option>
                                                        <option value="self_service">Flex</option>
                                                        <option value="ml">ML</option>
                                                    </select>
                                                )}
                                                {tab === 'mercadolibre' && (
                                                    <select
                                                        value={filterForm.delivery_status}
                                                        onChange={(e) => onFilterChange('delivery_status', e.target.value)}
                                                        className="rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                                    >
                                                        <option value="">Estado entrega (todos)</option>
                                                        <option value="sin_info">Sin información</option>
                                                        {deliveryStatusOptions.map((status) => (
                                                            <option key={status} value={status}>{toSpanishDeliveryStatus(status)}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                                                    Aplicar filtros
                                                </button>
                                                <button type="button" onClick={clearFilters} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 transition-colors">
                                                    Limpiar
                                                </button>
                                            </div>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 bg-gray-50/80 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800">
                                        <th className="py-3 px-5">ID</th>
                                        <th className="py-3 px-4">Fecha</th>
                                        <th className="py-3 px-4">Cliente</th>
                                        <th className="py-3 px-4">Estado</th>
                                        {tab === 'mercadolibre' && <th className="py-3 px-4">Tipo envío</th>}
                                        {tab === 'mercadolibre' && <th className="py-3 px-4">Estado entrega</th>}
                                        <th className="py-3 px-4 text-right">Total</th>
                                        {isMarketplace && <th className="py-3 px-4 text-right">Recibido</th>}
                                        {isMarketplace && <th className="py-3 px-4 text-center">Etiqueta</th>}
                                        <th className="py-3 px-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.data.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4 + (tab === 'mercadolibre' ? 2 : 0) + 1 + (isMarketplace ? 2 : 0) + 1}
                                                className="py-16 text-center text-gray-400"
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-3xl">📭</span>
                                                    <span>No hay órdenes para mostrar.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {orders.data.map((o, idx) => (
                                        <motion.tr
                                            key={o.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                                            className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors duration-100"
                                        >
                                            <td className="py-2.5 px-5">
                                                <span className="font-mono text-gray-700 dark:text-gray-300">{o.platform_order_id}</span>
                                                {o.is_pack && (
                                                    <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
                                                        Pack {o.order_ids?.length ?? ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                {o.ordered_at ? new Date(o.ordered_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className="py-2.5 px-4 text-gray-700 dark:text-gray-200">{o.customer_name || '-'}</td>
                                            <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300">{toSpanishOrderStatus(o.status)}</td>
                                            {tab === 'mercadolibre' && (
                                                <td className="py-2.5 px-4">
                                                    <Badge variant={o.delivery_logistic_type === 'self_service' ? 'success' : 'outline'}>
                                                        {toSpanishLogisticType(o.delivery_logistic_type)}
                                                    </Badge>
                                                </td>
                                            )}
                                            {tab === 'mercadolibre' && (
                                                <td className="py-2.5 px-4">
                                                    <Badge variant={deliveryBadgeVariant(o.delivery_status)}>
                                                        {toSpanishDeliveryStatus(o.delivery_status)}
                                                    </Badge>
                                                </td>
                                            )}
                                            <td className="py-2.5 px-4 text-right text-gray-700 dark:text-gray-200">{formatMoney(o.total)}</td>
                                            {isMarketplace && (
                                                <td className="py-2.5 px-4 text-right font-semibold text-green-700 dark:text-green-400">
                                                    {formatMoney(o.total_received)}
                                                </td>
                                            )}
                                            {isMarketplace && (
                                                <td className="py-2.5 px-4 text-center">
                                                    {o.pdf_download_url ? (
                                                        <a
                                                            href={o.pdf_download_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors"
                                                        >
                                                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17v-1h8v1H8zm0-3v-1h8v1H8zm0-3V10h5v1H8z"/>
                                                            </svg>
                                                            PDF
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="py-2.5 px-4 text-right">
                                                <button
                                                    onClick={() => openOrder(o)}
                                                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium text-sm transition-colors"
                                                >
                                                    Ver detalle
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {orders.links.length > 3 && (
                            <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                                {orders.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                            link.active
                                                ? 'bg-gray-900 text-white dark:bg-indigo-500'
                                                : 'bg-gray-50 dark:bg-slate-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                                        } ${!link.url ? 'opacity-40 pointer-events-none' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setSelectedOrder(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800"
                        >

                            {/* Header */}
                            <div className={`${platform.header} px-6 py-4 rounded-t-2xl`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">
                                            {platform.emoji}{' '}
                                            {selectedOrder.is_pack
                                                ? `Pack #${selectedOrder.platform_order_id}`
                                                : `Orden #${selectedOrder.platform_order_id}`}
                                        </h3>
                                        {selectedOrder.is_pack && (
                                            <p className="text-violet-200 text-xs mt-0.5">
                                                Órdenes: {selectedOrder.order_ids?.join(' · ')}
                                            </p>
                                        )}
                                        <p className="text-violet-200 text-sm mt-0.5">
                                            {selectedOrder.ordered_at ? new Date(selectedOrder.ordered_at).toLocaleString() : '-'}
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="text-violet-200 hover:text-white text-xl leading-none mt-1 transition-colors">✕</button>
                                </div>

                                {/* Estado */}
                                <div className="mt-3 flex items-center gap-3">
                                    <span className="text-violet-200 text-sm">Estado:</span>
                                    {tab === 'woocommerce' ? (
                                        <>
                                            <select
                                                value={pendingStatus ?? selectedOrder.status}
                                                onChange={(e) => { setPendingStatus(e.target.value); setStatusSaved(false); }}
                                                disabled={updatingStatus}
                                                className="bg-white/10 text-white text-sm font-medium rounded-lg px-3 py-1.5 border border-white/20 cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
                                            >
                                                {WOO_STATUSES.map((s) => (
                                                    <option key={s.value} value={s.value} className="text-gray-900 bg-white">{s.label}</option>
                                                ))}
                                            </select>
                                            {pendingStatus && pendingStatus !== selectedOrder.status && (
                                                <button
                                                    onClick={handleStatusSave}
                                                    disabled={updatingStatus}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-violet-700 text-sm font-semibold hover:bg-violet-50 disabled:opacity-60 transition-colors"
                                                >
                                                    {updatingStatus ? <SpinnerIcon /> : '💾'}
                                                    {updatingStatus ? 'Guardando...' : 'Guardar cambio'}
                                                </button>
                                            )}
                                            {statusSaved && (
                                                <span className="text-green-300 text-sm font-medium">
                                                    ✓ Estado actualizado
                                                    {deliveryEmailSent && ' · ✉️ Correo de entrega enviado al cliente'}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="bg-white/15 px-3 py-1 rounded-lg text-white text-sm font-semibold uppercase">{toSpanishOrderStatus(selectedOrder.status)}</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* WooCommerce: Facturación + Envío/Retiro + Pago */}
                                {tab === 'woocommerce' && selectedOrder.raw && (() => {
                                    const raw = selectedOrder.raw;
                                    const shippingLine = raw.shipping_lines?.[0];
                                    const isPickup = shippingLine && shippingLine.method_id?.includes('pickup');
                                    const pickupMeta = {};
                                    (shippingLine?.meta_data || []).forEach(m => { pickupMeta[m.key] = m.display_value || m.value; });

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm">
                                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 pb-1 border-b border-gray-200 dark:border-slate-700">Facturación</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">{raw.billing?.first_name} {raw.billing?.last_name}</p>
                                                {raw.billing?.company && <p className="text-gray-600 dark:text-gray-300">{raw.billing.company}</p>}
                                                <p className="text-gray-600 dark:text-gray-300">{raw.billing?.address_1}{raw.billing?.address_2 ? `, ${raw.billing.address_2}` : ''}</p>
                                                <p className="text-gray-600 dark:text-gray-300">{raw.billing?.city}, {raw.billing?.state} {raw.billing?.postcode}</p>
                                                {raw.billing?.phone && <p className="text-gray-600 dark:text-gray-300">📞 {raw.billing.phone}</p>}
                                                <p className="text-gray-600 dark:text-gray-300">✉️ {raw.billing?.email}</p>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm">
                                                {isPickup ? (
                                                    <>
                                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 pb-1 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
                                                            Retiro <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full normal-case font-semibold">🏪 Retiro Local</span>
                                                        </p>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{shippingLine.method_title}</p>
                                                        {pickupMeta.pickup_address && <p className="text-gray-600 dark:text-gray-300">📍 {pickupMeta.pickup_address}</p>}
                                                        {pickupMeta.pickup_details && <p className="text-gray-600 dark:text-gray-300">{pickupMeta.pickup_details}</p>}
                                                        {pickupMeta.pickup_location && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Punto: {pickupMeta.pickup_location}</p>}
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 pb-1 border-b border-gray-200 dark:border-slate-700">Envío</p>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{raw.shipping?.first_name} {raw.shipping?.last_name}</p>
                                                        {raw.shipping?.company && <p className="text-gray-600 dark:text-gray-300">{raw.shipping.company}</p>}
                                                        <p className="text-gray-600 dark:text-gray-300">{raw.shipping?.address_1}{raw.shipping?.address_2 ? `, ${raw.shipping.address_2}` : ''}</p>
                                                        <p className="text-gray-600 dark:text-gray-300">{raw.shipping?.city}, {raw.shipping?.state} {raw.shipping?.postcode}</p>
                                                        {raw.shipping?.phone && <p className="text-gray-600 dark:text-gray-300">📞 {raw.shipping.phone}</p>}
                                                    </>
                                                )}
                                            </div>

                                            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm">
                                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 pb-1 border-b border-gray-200 dark:border-slate-700">Pago</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">{raw.payment_method_title || '-'}</p>
                                                {raw.transaction_id && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">ID: {raw.transaction_id}</p>}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* MercadoLibre: cliente + tipo envío */}
                                {tab === 'mercadolibre' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm">
                                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Cliente</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.customer_name || '-'}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm">
                                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Tipo envío</p>
                                            <Badge variant={selectedOrder.delivery_logistic_type === 'self_service' ? 'success' : 'outline'}>
                                                {toSpanishLogisticType(selectedOrder.delivery_logistic_type)}
                                            </Badge>
                                        </div>
                                    </div>
                                )}

                                {/* Falabella / Paris: cliente */}
                                {(tab === 'falabella' || tab === 'paris') && (
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Cliente</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.customer_name || '-'}</p>
                                    </div>
                                )}

                                {/* Tabla de productos */}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                        Productos{selectedOrder.is_pack ? ` (${selectedOrder.items?.length ?? 0} ítem${(selectedOrder.items?.length ?? 0) !== 1 ? 's' : ''})` : ''}
                                    </p>
                                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="bg-violet-700 text-white">
                                                    <th className="py-2 px-4 text-left font-semibold text-xs">Producto</th>
                                                    <th className="py-2 px-4 text-center font-semibold text-xs">Talla</th>
                                                    <th className="py-2 px-4 text-center font-semibold text-xs">Color</th>
                                                    <th className="py-2 px-4 text-center font-semibold text-xs">Cant.</th>
                                                    <th className="py-2 px-4 text-right font-semibold text-xs">Precio</th>
                                                    <th className="py-2 px-4 text-right font-semibold text-xs">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedOrder.items || []).map((item, idx) => (
                                                    <tr key={idx} className={`border-t border-gray-100 dark:border-slate-700 ${idx % 2 === 1 ? 'bg-gray-50 dark:bg-slate-800/50' : ''}`}>
                                                        <td className="py-2 px-4 text-gray-900 dark:text-white">{item.name}</td>
                                                        <td className="py-2 px-4 text-center text-gray-600 dark:text-gray-300">{item.size || '-'}</td>
                                                        <td className="py-2 px-4 text-center text-gray-600 dark:text-gray-300">{item.color || '-'}</td>
                                                        <td className="py-2 px-4 text-center text-gray-600 dark:text-gray-300">{item.quantity}</td>
                                                        <td className="py-2 px-4 text-right text-gray-600 dark:text-gray-300">{formatMoney(item.unit_price)}</td>
                                                        <td className="py-2 px-4 text-right text-gray-900 dark:text-white">{formatMoney(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Totales */}
                                <div className="flex justify-end">
                                    <div className="w-72 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 text-sm">
                                        {tab === 'woocommerce' && selectedOrder.raw && (() => {
                                            const raw = selectedOrder.raw;
                                            const shippingLine = raw.shipping_lines?.[0];
                                            const isPickup = shippingLine?.method_id?.includes('pickup');
                                            const shipping = parseFloat(raw.shipping_total || 0);
                                            const discount = parseFloat(raw.discount_total || 0);
                                            return (
                                                <>
                                                    {discount > 0 && (
                                                        <div className="flex justify-between px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                                                            <span className="text-gray-500">Descuento</span>
                                                            <span className="text-red-600">-{formatMoney(discount)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                                                        <span className="text-gray-500">Envío</span>
                                                        <span>{isPickup ? <span className="text-amber-700 font-medium text-xs">Retiro en tienda</span> : (shipping > 0 ? formatMoney(shipping) : 'Gratis')}</span>
                                                    </div>
                                                </>
                                            );
                                        })()}

                                        {isMarketplace && (
                                            <>
                                                <div className="flex justify-between px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                                                    <span className="text-gray-500">Subtotal</span>
                                                    <span>{formatMoney(selectedOrder.total)}</span>
                                                </div>
                                                {selectedOrder.sale_fees > 0 && (
                                                    <div className="flex justify-between px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                                                        <span className="text-gray-500">Cargos por venta</span>
                                                        <span className="text-red-600 dark:text-red-400">-{formatMoney(selectedOrder.sale_fees)}</span>
                                                    </div>
                                                )}
                                                {selectedOrder.shipping_cost < 0 ? (
                                                    <div className="flex justify-between px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                                                        <span className="text-gray-500">Bonificación por envío</span>
                                                        <span className="text-green-600 dark:text-green-400">+{formatMoney(Math.abs(selectedOrder.shipping_cost))}</span>
                                                    </div>
                                                ) : selectedOrder.shipping_cost > 0 ? (
                                                    <div className="flex justify-between px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                                                        <span className="text-gray-500">Costo de envío</span>
                                                        <span className="text-red-600 dark:text-red-400">-{formatMoney(selectedOrder.shipping_cost)}</span>
                                                    </div>
                                                ) : null}
                                            </>
                                        )}

                                        <div className="flex justify-between px-4 py-2.5 bg-violet-700 text-white font-bold">
                                            <span>{isMarketplace ? 'Total recibido' : 'Total'}</span>
                                            <span>{formatMoney(isMarketplace ? selectedOrder.received_amount : selectedOrder.total)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Nota del cliente */}
                                {tab === 'woocommerce' && selectedOrder.raw?.customer_note && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300">
                                        <span className="font-semibold">Nota del cliente:</span> {selectedOrder.raw.customer_note}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 pb-5 flex justify-end">
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}
