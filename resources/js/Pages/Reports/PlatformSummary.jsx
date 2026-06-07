import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

function formatMoney(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
    }).format(Number(value));
}

function formatPeriod(period) {
    if (!period) return '-';
    const date = new Date(`${period}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return period;
    return new Intl.DateTimeFormat('es-CL', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}

export default function PlatformSummary({ auth, summary, tab = 'woocommerce' }) {
    const tabs = [
        { key: 'woocommerce', label: 'WooCommerce' },
        { key: 'mercadolibre', label: 'Mercado Libre' },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Resumen por plataforma" />
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg p-6 border border-transparent dark:border-slate-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h1 className="text-xl font-semibold">Resumen por plataforma</h1>
                            <div className="flex gap-2">
                                {tabs.map((t) => (
                                    <Link
                                        key={t.key}
                                        href={route('reports.platforms', { tab: t.key })}
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
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                                    <th className="py-2 pr-4">Mes</th>
                                    <th className="py-2 pr-4">Plataforma</th>
                                    <th className="py-2 pr-4">Órdenes</th>
                                    <th className="py-2 pr-4">Ventas</th>
                                    <th className="py-2 pr-4">Pago recibido</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.map((s, i) => (
                                    <tr key={i} className="border-b border-gray-200 dark:border-slate-800">
                                        <td className="py-2 pr-4 capitalize">{formatPeriod(s.period)}</td>
                                        <td className="py-2 pr-4">{s.platform}</td>
                                        <td className="py-2 pr-4">{s.orders_count}</td>
                                        <td className="py-2 pr-4">{formatMoney(s.total_sales)}</td>
                                        <td className="py-2 pr-4 font-medium">{formatMoney(s.received_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
