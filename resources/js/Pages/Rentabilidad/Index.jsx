import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
    n === null || n === undefined
        ? '—'
        : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const fmtShort = (n) => {
    if (n === null || n === undefined) return '—';
    if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
    return '$' + n;
};

const pct = (n) => (n === null || n === undefined ? '—' : n.toFixed(1) + '%');

const COLORS = [
    '#7c3aed', '#6d28d9', '#8b5cf6', '#a78bfa',
    '#4f46e5', '#818cf8', '#c4b5fd', '#ddd6fe',
];

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, format = fmt, duration = 800 }) {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (value === null || value === undefined) return;
        const target = Number(value);
        const start = Date.now();

        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(target * ease));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [value, duration]);

    if (value === null || value === undefined) return <span>—</span>;
    return <span>{format(display)}</span>;
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function Card({ title, value, format, subtitle, color = 'indigo', icon }) {
    const colors = {
        indigo: 'from-indigo-500 to-violet-600',
        green:  'from-emerald-500 to-teal-600',
        amber:  'from-amber-400 to-orange-500',
        red:    'from-red-500 to-rose-600',
        blue:   'from-blue-500 to-cyan-600',
    };

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors[color]} p-5 text-white shadow-lg transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl`}>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/5" />
            <div className="relative">
                <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                    {icon && <span className="text-base">{icon}</span>}
                    {title}
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight">
                    <AnimatedNumber value={value} format={format} />
                </div>
                {subtitle && <div className="mt-1 text-xs text-white/70">{subtitle}</div>}
            </div>
        </div>
    );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
                    {p.name}: {typeof p.value === 'number' && p.value > 999 ? fmt(p.value) : p.value}
                </p>
            ))}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Index({ auth, tab, month, products, daily, summary }) {
    const isMl = tab === 'mercadolibre' || tab === 'falabella' || tab === 'paris' || tab === 'presencial';
    const tabs = [
        { key: 'mercadolibre', label: '🛒 Mercado Libre' },
        { key: 'falabella',    label: '🟢 Falabella' },
        { key: 'paris',        label: '🔴 Paris' },
        { key: 'presencial',   label: '🏬 Venta en Tienda' },
        { key: 'woocommerce',  label: '🛍️ WooCommerce' },
    ];

    const changeMonth = (e) => router.get(route('rentabilidad.index', { tab, month: e.target.value }));
    const changeTab   = (key) => router.get(route('rentabilidad.index', { tab: key, month }));

    const topByQty  = [...products].sort((a, b) => b.total_qty - a.total_qty).slice(0, 8);
    const topByAmt  = [...products].sort((a, b) => (isMl ? b.total_received - a.total_received : b.total_gross - a.total_gross)).slice(0, 8);

    const shortName = (name) => name.length > 22 ? name.slice(0, 20) + '…' : name;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Rentabilidad" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">

                    {/* ── Header ── */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de Rentabilidad</h1>
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Análisis de ventas, ingresos y márgenes</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="month"
                                value={month}
                                onChange={changeMonth}
                                className="rounded-xl border-gray-300 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800"
                            />
                            <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
                                {tabs.map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => changeTab(t.key)}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                                            tab === t.key
                                                ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Summary Cards ── */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        <Card
                            title="Unidades vendidas"
                            value={summary.total_units}
                            format={(n) => n.toLocaleString('es-CL')}
                            icon="📦"
                            color="indigo"
                        />
                        <Card
                            title={isMl ? 'Total recibido' : 'Total ventas'}
                            value={isMl ? summary.total_received : summary.total_gross}
                            format={fmt}
                            subtitle={isMl ? 'Neto tras comisiones y envío' : 'Bruto'}
                            icon="💰"
                            color="blue"
                        />
                        <Card
                            title="Costo total"
                            value={summary.total_cost}
                            format={fmt}
                            subtitle={summary.total_cost === null ? 'Ingresa costos en Inventario' : undefined}
                            icon="🏷️"
                            color="amber"
                        />
                        <Card
                            title="Ganancia estimada"
                            value={summary.total_profit}
                            format={fmt}
                            subtitle={summary.total_profit === null ? 'Requiere costos cargados' : undefined}
                            icon={summary.total_profit >= 0 ? '📈' : '📉'}
                            color={summary.total_profit === null ? 'amber' : summary.total_profit >= 0 ? 'green' : 'red'}
                        />
                        <Card
                            title="Productos distintos"
                            value={products.length}
                            format={(n) => n.toLocaleString('es-CL')}
                            icon="🗂️"
                            color="indigo"
                        />
                    </div>

                    {/* ── Charts Row ── */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                        {/* Bar: Top productos por cantidad */}
                        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Top productos por unidades vendidas
                            </h3>
                            {topByQty.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-400">Sin datos en este período</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={topByQty} layout="vertical" margin={{ left: 8, right: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis
                                            type="category"
                                            dataKey="product_name"
                                            width={130}
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={shortName}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="total_qty" name="Unidades" radius={[0, 6, 6, 0]} animationDuration={900}>
                                            {topByQty.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Bar: Top productos por monto */}
                        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Top productos por {isMl ? 'monto recibido' : 'ventas'}
                            </h3>
                            {topByAmt.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-400">Sin datos en este período</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={topByAmt} layout="vertical" margin={{ left: 8, right: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                        <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                                        <YAxis
                                            type="category"
                                            dataKey="product_name"
                                            width={130}
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={shortName}
                                        />
                                        <Tooltip content={<CustomTooltip />} formatter={(v) => fmt(v)} />
                                        <Bar
                                            dataKey={isMl ? 'total_received' : 'total_gross'}
                                            name={isMl ? 'Recibido' : 'Ventas'}
                                            radius={[0, 6, 6, 0]}
                                            animationDuration={900}
                                        >
                                            {topByAmt.map((_, i) => (
                                                <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Line: Ventas diarias */}
                        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 border border-gray-100 dark:border-slate-800 lg:col-span-2">
                            <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Ventas diarias — {month}
                            </h3>
                            {daily.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-400">Sin datos en este período</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={180}>
                                    <LineChart data={daily} margin={{ left: 8, right: 16 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={(d) => d?.slice(5)}
                                        />
                                        <YAxis yAxisId="left" tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            content={<CustomTooltip />}
                                            formatter={(v, name) => name === 'Monto' ? fmt(v) : v}
                                        />
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="gross"
                                            name="Monto"
                                            stroke="#7c3aed"
                                            strokeWidth={2.5}
                                            dot={{ r: 3, fill: '#7c3aed' }}
                                            activeDot={{ r: 5 }}
                                            animationDuration={1000}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="qty"
                                            name="Unidades"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            strokeDasharray="5 4"
                                            dot={{ r: 2, fill: '#10b981' }}
                                            animationDuration={1200}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* ── Tabla detalle por producto ── */}
                    <div className="rounded-2xl bg-white shadow-sm dark:bg-slate-900 border border-gray-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Detalle por producto</h3>
                            <span className="text-xs text-gray-400">{products.length} producto{products.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-slate-800">
                                        <th className="px-5 py-3">Producto</th>
                                        <th className="px-4 py-3 text-right">Unidades</th>
                                        <th className="px-4 py-3 text-right">Bruto</th>
                                        {isMl && <th className="px-4 py-3 text-right">Recibido</th>}
                                        <th className="px-4 py-3 text-right">Costo</th>
                                        <th className="px-4 py-3 text-right">Ganancia</th>
                                        <th className="px-4 py-3 text-right">Margen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length === 0 && (
                                        <tr>
                                            <td colSpan={isMl ? 7 : 6} className="py-12 text-center text-gray-400">
                                                No hay ventas en este período.
                                            </td>
                                        </tr>
                                    )}
                                    {products.map((p, i) => {
                                        const profitColor = p.profit === null
                                            ? 'text-gray-400'
                                            : p.profit >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-600 dark:text-red-400';
                                        const marginColor = p.margin_pct === null
                                            ? 'text-gray-400'
                                            : p.margin_pct >= 30
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : p.margin_pct >= 10
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-red-600 dark:text-red-400';

                                        return (
                                            <tr
                                                key={p.product_id}
                                                className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors duration-100"
                                            >
                                                <td className="px-5 py-3 font-medium text-gray-900 dark:text-white max-w-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                                        />
                                                        {p.product_name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold">{p.total_qty}</td>
                                                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(p.total_gross)}</td>
                                                {isMl && <td className="px-4 py-3 text-right font-semibold text-violet-700 dark:text-violet-400">{fmt(p.total_received)}</td>}
                                                <td className="px-4 py-3 text-right text-gray-500">
                                                    {p.total_cost !== null ? fmt(p.total_cost) : (
                                                        <Link
                                                            href={route('reports.inventory')}
                                                            className="text-xs text-indigo-500 hover:underline"
                                                        >
                                                            + Cargar costo
                                                        </Link>
                                                    )}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-semibold ${profitColor}`}>
                                                    {p.profit !== null ? fmt(p.profit) : '—'}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${marginColor}`}>
                                                    {p.margin_pct !== null ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            {pct(p.margin_pct)}
                                                            {p.margin_pct >= 30 ? ' 🟢' : p.margin_pct >= 10 ? ' 🟡' : ' 🔴'}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {products.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 font-semibold text-sm">
                                            <td className="px-5 py-3 text-gray-700 dark:text-gray-300">Total</td>
                                            <td className="px-4 py-3 text-right">{summary.total_units}</td>
                                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(summary.total_gross)}</td>
                                            {isMl && <td className="px-4 py-3 text-right text-violet-700 dark:text-violet-400">{fmt(summary.total_received)}</td>}
                                            <td className="px-4 py-3 text-right text-gray-500">{summary.total_cost !== null ? fmt(summary.total_cost) : '—'}</td>
                                            <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{summary.total_profit !== null ? fmt(summary.total_profit) : '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                {summary.total_profit !== null && (isMl ? summary.total_received : summary.total_gross)
                                                    ? pct(Math.round(summary.total_profit / (isMl ? summary.total_received : summary.total_gross) * 1000) / 10)
                                                    : '—'}
                                            </td>
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
