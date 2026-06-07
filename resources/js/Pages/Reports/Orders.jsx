import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Orders({ auth, orders, tab, filters }) {
    const tabs = [
        { key: 'woocommerce', label: 'WooCommerce' },
        { key: 'mercadolibre', label: 'Mercado Libre' },
    ];

    const [from, setFrom] = useState(filters.from || '');
    const [to, setTo] = useState(filters.to || '');

    const apply = () => {
        router.get(route('reports.orders', { tab, from, to }));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Órdenes (filtros)" />
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg p-6 border border-transparent dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-semibold">Órdenes</h1>
                            <div className="flex gap-2">
                                {tabs.map((t) => (
                                    <Link
                                        key={t.key}
                                        href={route('reports.orders', { tab: t.key, from, to })}
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

                        <div className="flex items-end gap-4 mb-4">
                            <div>
                                <label className="text-sm text-gray-600 dark:text-gray-400">Desde</label>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 dark:text-gray-400">Hasta</label>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                            <button onClick={apply} className="px-3 py-1 rounded bg-gray-900 text-white text-sm dark:bg-indigo-500">
                                Aplicar
                            </button>
                            <Link
                                href={route('reports.orders.export', { tab, from, to })}
                                className="px-3 py-1 rounded bg-green-600 text-white text-sm dark:bg-emerald-500"
                            >
                                Exportar CSV
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                                        <th className="py-2 pr-4">ID</th>
                                        <th className="py-2 pr-4">Fecha</th>
                                        <th className="py-2 pr-4">Cliente</th>
                                        <th className="py-2 pr-4">Estado</th>
                                        <th className="py-2 pr-4">Total</th>
                                        <th className="py-2 pr-4">Moneda</th>
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
                                            <td className="py-2 pr-4">{o.total}</td>
                                            <td className="py-2 pr-4">{o.currency}</td>
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
        </AuthenticatedLayout>
    );
}
