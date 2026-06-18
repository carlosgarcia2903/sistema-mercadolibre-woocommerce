import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

const fmt = (n) =>
    n === null || n === undefined
        ? '—'
        : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function Index({ auth, tab, month, rows, summary }) {
    const isMl = tab === 'mercadolibre';
    const tabs = [
        { key: 'woocommerce', label: 'WooCommerce' },
        { key: 'mercadolibre', label: 'Mercado Libre' },
    ];

    const changeMonth = (e) => {
        router.get(route('rentabilidad.index', { tab, month: e.target.value }));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Rentabilidad" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">
                    {/* Encabezado */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-xl font-semibold">Rentabilidad</h1>
                        <div className="flex items-center gap-2">
                            <input
                                type="month"
                                value={month}
                                onChange={changeMonth}
                                className="rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 text-sm"
                            />
                            <div className="flex gap-2">
                                {tabs.map((t) => (
                                    <Link
                                        key={t.key}
                                        href={route('rentabilidad.index', { tab: t.key, month })}
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
                    </div>

                    {/* Tarjetas resumen */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg p-4 shadow-sm bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800">
                            <div className="text-xs uppercase tracking-wide text-gray-500">Unidades vendidas</div>
                            <div className="text-2xl font-semibold mt-1">{summary.units_total}</div>
                        </div>
                        <div className="rounded-lg p-4 shadow-sm bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800">
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                                {isMl ? 'Total neto recibido' : 'Total ventas'}
                            </div>
                            <div className="text-2xl font-semibold mt-1">{fmt(summary.total_sales)}</div>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg border border-transparent dark:border-slate-800">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                                        <th className="py-3 px-4">Fecha</th>
                                        <th className="py-3 px-4">Orden</th>
                                        <th className="py-3 px-4">Cliente</th>
                                        <th className="py-3 px-4">Producto</th>
                                        <th className="py-3 px-4">Talla</th>
                                        <th className="py-3 px-4 text-right">Precio venta</th>
                                        {isMl && <th className="py-3 px-4 text-right">Neto recibido</th>}
                                        <th className="py-3 px-4 text-right">Cant.</th>
                                        <th className="py-3 px-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={isMl ? 9 : 8} className="py-8 text-center text-gray-400">
                                                No hay ventas en este período.
                                            </td>
                                        </tr>
                                    )}
                                    {rows.map((r, i) => (
                                        <tr key={i} className="border-b border-gray-100 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                            <td className="py-2 px-4 text-gray-500 whitespace-nowrap">{fmtDate(r.ordered_at)}</td>
                                            <td className="py-2 px-4 text-gray-400 text-xs">#{r.platform_order_id}</td>
                                            <td className="py-2 px-4">{r.customer_name || '—'}</td>
                                            <td className="py-2 px-4">{r.product_name}</td>
                                            <td className="py-2 px-4 text-gray-500">{r.size || '—'}</td>
                                            <td className="py-2 px-4 text-right">{fmt(r.unit_price)}</td>
                                            {isMl && <td className="py-2 px-4 text-right">{fmt(r.net_unit)}</td>}
                                            <td className="py-2 px-4 text-right">{r.quantity}</td>
                                            <td className="py-2 px-4 text-right font-medium">{fmt(r.net_total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {rows.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-200 dark:border-slate-700 font-semibold">
                                            <td colSpan={isMl ? 7 : 6} className="py-2 px-4 text-gray-500">Total</td>
                                            <td className="py-2 px-4 text-right">{summary.units_total}</td>
                                            <td className="py-2 px-4 text-right">{fmt(summary.total_sales)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
