import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

const fmt = (n) =>
    n === null || n === undefined
        ? '—'
        : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const pct = (n) => (n === null || n === undefined ? '—' : `${n}%`);

export default function Index({ auth, tab, month, rows, summary }) {
    const isMl  = tab === 'mercadolibre';
    const data  = rows;
    const tabs  = [
        { key: 'woocommerce', label: 'WooCommerce' },
        { key: 'mercadolibre', label: 'Mercado Libre' },
    ];

    const changeMonth = (e) => {
        router.get(route('rentabilidad.index', { tab, month: e.target.value }), {}, { preserveState: true });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Rentabilidad" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">
                    {/* Encabezado */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-xl font-semibold">Rentabilidad y costos</h1>
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
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card title="A pagar al proveedor" value={fmt(summary.to_pay)} accent="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" />
                        <Card title="Ventas netas" value={fmt(summary.total_sales)} />
                        <Card title="Ganancia" value={fmt(summary.total_profit)} accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" />
                        <Card title="Margen promedio" value={pct(summary.avg_margin)} />
                    </div>

                    {summary.missing_cost > 0 && (
                        <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-200">
                            ⚠️ {summary.missing_cost} producto(s) con ventas este mes aún no tienen costo cargado. El pago al proveedor y la ganancia no los incluyen.
                        </div>
                    )}

                    {/* Tabla */}
                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg p-4 border border-transparent dark:border-slate-800">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                                        <th className="py-2 pr-4">Producto</th>
                                        <th className="py-2 pr-4">Talla</th>
                                        <th className="py-2 pr-4 text-right">Precio venta</th>
                                        {isMl && <th className="py-2 pr-4 text-right">Neto recibido</th>}
                                        <th className="py-2 pr-4 text-right">Costo</th>
                                        <th className="py-2 pr-4 text-right">Margen u.</th>
                                        <th className="py-2 pr-4 text-right">Margen %</th>
                                        <th className="py-2 pr-4 text-right">Vendidos</th>
                                        <th className="py-2 pr-4 text-right">Ganancia mes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((r) => (
                                        <tr key={r.id} className="border-b border-gray-100 dark:border-slate-800/60">
                                            <td className="py-2 pr-4">{r.product_name}</td>
                                            <td className="py-2 pr-4">{r.size || '—'}</td>
                                            <td className="py-2 pr-4 text-right">{fmt(r.sale_price)}</td>
                                            {isMl && (
                                                <td className="py-2 pr-4 text-right">
                                                    {r.net_unit !== null ? fmt(r.net_unit) : '—'}
                                                </td>
                                            )}
                                            <td className="py-2 pr-4 text-right">
                                                {r.cost_price !== null
                                                    ? fmt(r.cost_price)
                                                    : <Link href={route('reports.inventory', { tab })} className="text-xs text-indigo-500 hover:underline">Agregar en Inventario</Link>
                                                }
                                            </td>
                                            <td className={`py-2 pr-4 text-right ${r.margin_unit < 0 ? 'text-rose-600' : ''}`}>
                                                {r.margin_unit !== null ? fmt(r.margin_unit) : '—'}
                                            </td>
                                            <td className="py-2 pr-4 text-right">{pct(r.margin_pct)}</td>
                                            <td className="py-2 pr-4 text-right">{r.units_sold}</td>
                                            <td className={`py-2 pr-4 text-right font-medium ${r.profit_total < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {r.profit_total !== null ? fmt(r.profit_total) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {data.length === 0 && (
                                        <tr>
                                            <td colSpan={isMl ? 9 : 8} className="py-6 text-center text-gray-400">
                                                No hay productos para esta plataforma.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Card({ title, value, accent }) {
    return (
        <div className={`rounded-lg p-4 shadow-sm border border-transparent dark:border-slate-800 ${accent || 'bg-white dark:bg-slate-900'}`}>
            <div className="text-xs uppercase tracking-wide opacity-70">{title}</div>
            <div className="text-lg font-semibold mt-1">{value}</div>
        </div>
    );
}
