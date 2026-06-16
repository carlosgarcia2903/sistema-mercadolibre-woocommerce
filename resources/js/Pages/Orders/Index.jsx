import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
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

export default function Index({ auth, orders, tab, filters = {}, statusOptions = [], deliveryStatusOptions = [] }) {
    const { props } = usePage();
    const flash = props.flash || {};

    const tabs = [
        { key: 'woocommerce', label: 'WooCommerce' },
        { key: 'mercadolibre', label: 'Mercado Libre' },
    ];
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [syncing, setSyncing] = useState(null);
    const [pendingStatus, setPendingStatus] = useState(null); // status seleccionado pero no guardado
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusSaved, setStatusSaved] = useState(false);

    const WOO_STATUSES = [
        { value: 'pending',    label: 'Pendiente de pago' },
        { value: 'processing', label: 'Procesando' },
        { value: 'on-hold',    label: 'En espera' },
        { value: 'completed',  label: 'Completado' },
        { value: 'cancelled',  label: 'Cancelado' },
        { value: 'refunded',   label: 'Reembolsado' },
        { value: 'failed',     label: 'Fallido' },
    ];

    const openOrder = (o) => {
        setSelectedOrder(o);
        setPendingStatus(null);
        setStatusSaved(false);
    };

    const handleStatusSave = async () => {
        if (!selectedOrder || !pendingStatus || updatingStatus) return;
        setUpdatingStatus(true);
        setStatusSaved(false);
        try {
            await axios.patch(route('orders.updateStatus', selectedOrder.id), { status: pendingStatus });
            setSelectedOrder((prev) => ({ ...prev, status: pendingStatus }));
            setPendingStatus(null);
            setStatusSaved(true);
            // Refrescar la tabla en background
            router.reload({ only: ['orders'], preserveScroll: true });
        } catch (e) {
            alert('Error al actualizar el estado: ' + (e.response?.data?.error || e.message));
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleSync = (platform) => {
        setSyncing(platform);
        router.post(
            route('orders.sync'),
            { platform },
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

    const onFilterChange = (key, value) => {
        setFilterForm((prev) => ({ ...prev, [key]: value }));
    };

    const submitFilters = (e) => {
        e.preventDefault();
        router.get(
            route('orders.index'),
            {
                tab,
                ...filterForm,
            },
            { preserveState: true, replace: true },
        );
    };

    const clearFilters = () => {
        const reset = {
            order_id: '',
            date_from: '',
            date_to: '',
            customer: '',
            status: '',
            logistic_type: '',
            delivery_status: '',
        };
        setFilterForm(reset);
        router.get(
            route('orders.index'),
            { tab },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Órdenes" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg p-6 border border-transparent dark:border-slate-800">
                        {flash.success && (
                            <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm flex items-start gap-3">
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
                            </div>
                        )}
                        {flash.error && (
                            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm flex items-center gap-3">
                                <span className="text-lg">❌</span>
                                {flash.error}
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-semibold">Órdenes</h1>
                            <div className="flex items-center gap-2">
                                {/* Botones de sincronización */}
                                <button
                                    onClick={() => handleSync('woocommerce')}
                                    disabled={syncing !== null}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {syncing === 'woocommerce' ? (
                                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    )}
                                    {syncing === 'woocommerce' ? 'Sincronizando…' : 'Sync WooCommerce'}
                                </button>
                                <button
                                    onClick={() => handleSync('mercadolibre')}
                                    disabled={syncing !== null}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {syncing === 'mercadolibre' ? (
                                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    )}
                                    {syncing === 'mercadolibre' ? 'Sincronizando…' : 'Sync MercadoLibre'}
                                </button>

                                <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />

                                {tabs.map((t) => (
                                    <Link
                                        key={t.key}
                                        href={route('orders.index', { tab: t.key })}
                                        className={`px-3 py-1 rounded-full text-sm ${
                                            tab === t.key
                                                ? 'bg-gray-900 text-white dark:bg-indigo-500'
                                                : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200'
                                        }`}
                                    >
                                        {t.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={submitFilters} className="mb-4 rounded-lg border border-gray-200 dark:border-slate-800 p-4">
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
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
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
                                            <option key={status} value={status}>
                                                {toSpanishDeliveryStatus(status)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600"
                                >
                                    Filtrar
                                </button>
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </form>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                                        <th className="py-2 pr-4">ID</th>
                                        <th className="py-2 pr-4">Fecha</th>
                                        <th className="py-2 pr-4">Cliente</th>
                                        <th className="py-2 pr-4">Estado</th>
                                        {tab === 'mercadolibre' && <th className="py-2 pr-4">Tipo envío</th>}
                                        {tab === 'mercadolibre' && <th className="py-2 pr-4">Estado entrega</th>}
                                        <th className="py-2 pr-4">Total</th>
                                        {tab === 'mercadolibre' && <th className="py-2 pr-4">Total recibido</th>}
                                        {tab === 'mercadolibre' && <th className="py-2 pr-4">Etiqueta</th>}
                                        <th className="py-2 pr-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.data.map((o) => (
                                        <tr key={o.id} className="border-b border-gray-200 dark:border-slate-800">
                                            <td className="py-2 pr-4">{o.platform_order_id}</td>
                                            <td className="py-2 pr-4">
                                                {o.ordered_at ? new Date(o.ordered_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="py-2 pr-4">{o.customer_name || '-'}</td>
                                            <td className="py-2 pr-4">{o.status || '-'}</td>
                                            {tab === 'mercadolibre' && (
                                                <td className="py-2 pr-4">
                                                    <Badge variant={o.delivery_logistic_type === 'self_service' ? 'success' : 'outline'}>
                                                        {toSpanishLogisticType(o.delivery_logistic_type)}
                                                    </Badge>
                                                </td>
                                            )}
                                            {tab === 'mercadolibre' && (
                                                <td className="py-2 pr-4">
                                                    <Badge variant={deliveryBadgeVariant(o.delivery_status)}>
                                                        {toSpanishDeliveryStatus(o.delivery_status)}
                                                    </Badge>
                                                </td>
                                            )}
                                            <td className="py-2 pr-4">{formatMoney(o.total)}</td>
                                            {tab === 'mercadolibre' && (
                                                <td className="py-2 pr-4 font-medium">
                                                    {formatMoney(o.total_received)}
                                                </td>
                                            )}
                                            {tab === 'mercadolibre' && (
                                                <td className="py-2 pr-4">
                                                    {o.pdf_download_url ? (
                                                        <a
                                                            href={o.pdf_download_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800"
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
                                            <td className="py-2 pr-4">
                                                <button
                                                    onClick={() => openOrder(o)}
                                                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                                                >
                                                    Ver detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex gap-2">
                            {orders.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-2 py-1 text-sm rounded ${
                                        link.active
                                            ? 'bg-gray-900 text-white dark:bg-indigo-500'
                                            : 'bg-gray-100 dark:bg-slate-800 dark:text-gray-200'
                                    } ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedOrder(null)} />
                    <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800">

                        {/* Header morado estilo PDF */}
                        <div className="bg-violet-700 px-6 py-4 rounded-t-xl">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {tab === 'woocommerce' ? '🛍️' : '🛒'} Orden #{selectedOrder.platform_order_id}
                                    </h3>
                                    <p className="text-violet-200 text-sm mt-0.5">
                                        {selectedOrder.ordered_at ? new Date(selectedOrder.ordered_at).toLocaleString() : '-'}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="text-violet-200 hover:text-white text-xl leading-none mt-1">✕</button>
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
                                                {updatingStatus ? (
                                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                    </svg>
                                                ) : '💾'}
                                                {updatingStatus ? 'Guardando...' : 'Guardar cambio'}
                                            </button>
                                        )}
                                        {statusSaved && (
                                            <span className="text-green-300 text-sm font-medium">✓ Estado actualizado</span>
                                        )}
                                    </>
                                ) : (
                                    <span className="bg-violet-900 px-3 py-1 rounded-lg text-white text-sm font-semibold uppercase">{selectedOrder.status}</span>
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
                                        {/* Facturación */}
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-sm">
                                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 pb-1 border-b border-gray-200 dark:border-slate-700">Facturación</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{raw.billing?.first_name} {raw.billing?.last_name}</p>
                                            {raw.billing?.company && <p className="text-gray-600 dark:text-gray-300">{raw.billing.company}</p>}
                                            <p className="text-gray-600 dark:text-gray-300">{raw.billing?.address_1}{raw.billing?.address_2 ? `, ${raw.billing.address_2}` : ''}</p>
                                            <p className="text-gray-600 dark:text-gray-300">{raw.billing?.city}, {raw.billing?.state} {raw.billing?.postcode}</p>
                                            {raw.billing?.phone && <p className="text-gray-600 dark:text-gray-300">📞 {raw.billing.phone}</p>}
                                            <p className="text-gray-600 dark:text-gray-300">✉️ {raw.billing?.email}</p>
                                        </div>

                                        {/* Envío o Retiro */}
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-sm">
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

                                        {/* Pago */}
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-sm">
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
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-sm">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Cliente</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.customer_name || '-'}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-sm">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Tipo envío</p>
                                        <Badge variant={selectedOrder.delivery_logistic_type === 'self_service' ? 'success' : 'outline'}>
                                            {toSpanishLogisticType(selectedOrder.delivery_logistic_type)}
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            {/* Tabla de productos */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Productos</p>
                                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-violet-700 text-white">
                                                <th className="py-2 px-4 text-left font-semibold text-xs">Producto</th>
                                                <th className="py-2 px-4 text-center font-semibold text-xs">Talla</th>
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
                                <div className="w-64 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 text-sm">
                                    {tab === 'woocommerce' && selectedOrder.raw && (float => {
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
                                    })(parseFloat)}
                                    <div className="flex justify-between px-4 py-2.5 bg-violet-700 text-white font-bold">
                                        <span>Total</span>
                                        <span>{formatMoney(selectedOrder.total)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Nota del cliente */}
                            {tab === 'woocommerce' && selectedOrder.raw?.customer_note && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
                                    <span className="font-semibold">Nota del cliente:</span> {selectedOrder.raw.customer_note}
                                </div>
                            )}
                        </div>

                        <div className="px-6 pb-5 flex justify-end">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm hover:bg-gray-200 dark:hover:bg-slate-700"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
