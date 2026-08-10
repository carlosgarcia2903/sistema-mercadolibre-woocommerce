import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Fragment, useState } from 'react';
import { motion } from 'framer-motion';

const fmt = (n) =>
    n === null || n === undefined
        ? '—'
        : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const TABS = [
    { key: 'woocommerce', label: 'WooCommerce', emoji: '🛍️', active: 'bg-violet-600 text-white shadow-sm shadow-violet-600/30' },
    { key: 'mercadolibre', label: 'Mercado Libre', emoji: '🛒', active: 'bg-amber-500 text-white shadow-sm shadow-amber-500/30' },
    { key: 'falabella', label: 'Falabella', emoji: '🟢', active: 'bg-green-600 text-white shadow-sm shadow-green-600/30' },
    { key: 'paris', label: 'Paris', emoji: '🔴', active: 'bg-red-600 text-white shadow-sm shadow-red-600/30' },
];

function StockBadge({ stock }) {
    if (stock === null || stock === undefined) return <span className="text-gray-400">—</span>;
    if (stock === 0) return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Sin stock</span>;
    if (stock <= 5) return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Bajo ({stock})</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{stock}</span>;
}

function CostInput({ variant }) {
    const [value, setValue] = useState(variant.cost_price !== null && variant.cost_price !== undefined ? Math.round(variant.cost_price) : '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const save = () => {
        setSaving(true);
        axios
            .patch(route('variants.updateCost', variant.id), {
                cost_price: value === '' ? null : value,
            })
            .then(() => {
                setSaving(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
            })
            .catch(() => setSaving(false));
    };

    return (
        <div className="flex items-center justify-end gap-1">
            <span className="text-gray-400 text-xs">$</span>
            <input
                type="number"
                min="0"
                step="1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={save}
                placeholder="—"
                className="w-24 text-right rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 text-sm py-1"
            />
            {saving && <span className="text-xs text-gray-400">…</span>}
            {saved  && <span className="text-xs text-emerald-500">✓</span>}
        </div>
    );
}

export default function Inventory({ auth, tab, search, products }) {
    const [query, setQuery] = useState(search || '');

    const doSearch = (e) => {
        e.preventDefault();
        router.get(route('reports.inventory', { tab, search: query }), {}, { preserveState: true });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Inventario" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">

                    {/* Encabezado */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario</h1>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Costos y stock por plataforma</p>
                    </div>

                    {/* Tab bar de plataformas — indicador animado */}
                    <div className="relative flex gap-1 rounded-2xl bg-gray-100 dark:bg-slate-800/60 p-1.5 w-full sm:w-fit overflow-x-auto">
                        {TABS.map((t) => {
                            const active = tab === t.key;
                            return (
                                <Link
                                    key={t.key}
                                    href={route('reports.inventory', { tab: t.key })}
                                    className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                                        active ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="inventory-tab-indicator"
                                            className={`absolute inset-0 rounded-xl ${t.active}`}
                                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                        />
                                    )}
                                    <span className="relative">{t.emoji}</span>
                                    <span className="relative">{t.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Card principal */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">

                        {/* Buscador */}
                        <form onSubmit={doSearch} className="flex gap-2 px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="relative flex-1">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="7" />
                                    <path strokeLinecap="round" d="m20 20-3-3" />
                                </svg>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Buscar por nombre o SKU..."
                                    className="w-full pl-9 rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                />
                            </div>
                            <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
                                Buscar
                            </button>
                            {search && (
                                <Link
                                    href={route('reports.inventory', { tab })}
                                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-slate-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Limpiar
                                </Link>
                            )}
                        </form>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 bg-gray-50/80 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800">
                                        <th className="py-3 px-5">Producto / Talla</th>
                                        <th className="py-3 px-4">SKU</th>
                                        <th className="py-3 px-4 text-right">Precio venta</th>
                                        <th className="py-3 px-4 text-center">Stock</th>
                                        <th className="py-3 px-4 text-right">Precio costo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-3xl">📦</span>
                                                    <span>No se encontraron productos.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {products.data.map((p, idx) => {
                                        const variants = p.variants ?? [];
                                        return (
                                            <Fragment key={`group-${p.id}`}>
                                                {/* Fila producto padre */}
                                                <motion.tr
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                                                    className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/60"
                                                >
                                                    <td className="py-2.5 px-5 font-semibold text-gray-800 dark:text-gray-100" colSpan={2}>{p.name}</td>
                                                    <td className="py-2.5 px-4 text-right text-gray-600 dark:text-gray-300">{fmt(p.price)}</td>
                                                    <td className="py-2.5 px-4 text-center"><StockBadge stock={p.stock} /></td>
                                                    <td />
                                                </motion.tr>

                                                {/* Filas de tallas/variantes */}
                                                {variants.length > 0 ? (
                                                    variants.map((v) => (
                                                        <tr key={`v-${v.id}`} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors duration-100">
                                                            <td className="py-2 pl-9 pr-4 text-gray-500 dark:text-gray-400">
                                                                ↳ {v.size || 'Sin talla'}
                                                            </td>
                                                            <td className="py-2 px-4 text-gray-400 text-xs">{v.sku || '—'}</td>
                                                            <td className="py-2 px-4 text-right text-gray-600 dark:text-gray-300">{fmt(v.sale_price)}</td>
                                                            <td />
                                                            <td className="py-2 px-4">
                                                                <CostInput variant={v} />
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr className="border-b border-gray-50 dark:border-slate-800/60">
                                                        <td className="py-2 pl-9 pr-4 text-gray-400 text-xs" colSpan={4}>
                                                            Sin variantes sincronizadas aún
                                                        </td>
                                                        <td />
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {products.last_page > 1 && (
                            <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between">
                                <span className="text-xs text-gray-400">
                                    {products.total} productos · página {products.current_page} de {products.last_page}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {products.links.map((link, i) => (
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
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-400">
                        {products.total} productos · El costo se guarda automáticamente al salir del campo.
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
