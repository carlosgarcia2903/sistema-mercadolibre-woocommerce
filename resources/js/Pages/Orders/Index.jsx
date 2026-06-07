import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
    const [syncing, setSyncing] = useState(null); // 'woocommerce' | 'mercadolibre' | null

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
                            <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm">
                                {flash.success}
                            </div>
                        )}
                        {flash.error && (
                            <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm">
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
                                            <td className="py-2 pr-4">
                                                <button
                                                    onClick={() => setSelectedOrder(o)}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setSelectedOrder(null)}
                    ></div>
                    <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-800">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Detalle de orden #{selectedOrder.platform_order_id}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedOrder.customer_name || '-'}</p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                                        <th className="py-2 pr-4">Producto</th>
                                        <th className="py-2 pr-4">Talla</th>
                                        <th className="py-2 pr-4">Cantidad</th>
                                        <th className="py-2 pr-4">Precio</th>
                                        <th className="py-2 pr-4">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedOrder.items || []).map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-200 dark:border-slate-800">
                                            <td className="py-2 pr-4">{item.name}</td>
                                            <td className="py-2 pr-4">{item.size || '-'}</td>
                                            <td className="py-2 pr-4">{item.quantity}</td>
                                            <td className="py-2 pr-4">{item.unit_price}</td>
                                            <td className="py-2 pr-4">{item.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-4 py-2 rounded bg-gray-100 dark:bg-slate-800"
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
