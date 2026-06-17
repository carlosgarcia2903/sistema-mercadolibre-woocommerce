import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';

const fmt = (n) =>
    n === null || n === undefined
        ? '—'
        : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

function StockBadge({ stock }) {
    if (stock === null || stock === undefined) return <span className="text-gray-400">—</span>;
    if (stock === 0) return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Sin stock</span>;
    if (stock <= 5) return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Bajo ({stock})</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{stock}</span>;
}

function CostInput({ variant }) {
    const [value, setValue] = useState(variant.cost_price ?? '');
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
    const tabs = [
        { key: 'woocommerce', label: 'WooCommerce' },
        { key: 'mercadolibre', label: 'Mercado Libre' },
    ];

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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-xl font-semibold">Inventario</h1>
                        <div className="flex gap-2">
                            {tabs.map((t) => (
                                <Link
                                    key={t.key}
                                    href={route('reports.inventory', { tab: t.key })}
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

                    {/* Buscador */}
                    <form onSubmit={doSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar por nombre o SKU..."
                            className="flex-1 rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 text-sm"
                        />
                        <button type="submit" className="px-4 py-2 text-sm rounded-md bg-gray-900 text-white dark:bg-indigo-500">
                            Buscar
                        </button>
                        {search && (
                            <Link
                                href={route('reports.inventory', { tab })}
                                className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-slate-800 dark:text-gray-200"
                            >
                                Limpiar
                            </Link>
                        )}
                    </form>

                    {/* Tabla */}
                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg border border-transparent dark:border-slate-800">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                                        <th className="py-3 px-4">Producto / Talla</th>
                                        <th className="py-3 px-4">SKU</th>
                                        <th className="py-3 px-4 text-right">Precio venta</th>
                                        <th className="py-3 px-4 text-center">Stock</th>
                                        <th className="py-3 px-4 text-right">Precio costo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-400">
                                                No se encontraron productos.
                                            </td>
                                        </tr>
                                    )}
                                    {products.data.map((p) => {
                                        const variants = p.variants ?? [];
                                        return (
                                            <>
                                                {/* Fila producto padre */}
                                                <tr key={`p-${p.id}`} className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                                                    <td className="py-2 px-4 font-medium" colSpan={2}>{p.name}</td>
                                                    <td className="py-2 px-4 text-right">{fmt(p.price)}</td>
                                                    <td className="py-2 px-4 text-center"><StockBadge stock={p.stock} /></td>
                                                    <td />
                                                </tr>

                                                {/* Filas de tallas/variantes */}
                                                {variants.length > 0 ? (
                                                    variants.map((v) => (
                                                        <tr key={`v-${v.id}`} className="border-b border-gray-100 dark:border-slate-800/60 hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                                            <td className="py-2 pl-8 pr-4 text-gray-500">
                                                                ↳ {v.size || 'Sin talla'}
                                                            </td>
                                                            <td className="py-2 px-4 text-gray-400 text-xs">{v.sku || '—'}</td>
                                                            <td className="py-2 px-4 text-right">{fmt(v.sale_price)}</td>
                                                            <td />
                                                            <td className="py-2 px-4">
                                                                <CostInput variant={v} />
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr className="border-b border-gray-100 dark:border-slate-800/60">
                                                        <td className="py-2 pl-8 pr-4 text-gray-400 text-xs" colSpan={4}>
                                                            Sin variantes sincronizadas aún
                                                        </td>
                                                        <td />
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {products.last_page > 1 && (
                            <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between">
                                <span className="text-xs text-gray-400">
                                    {products.total} productos · página {products.current_page} de {products.last_page}
                                </span>
                                <div className="flex gap-1">
                                    {products.links.map((link, i) => (
                                        <Link
                                            key={i}
                                            href={link.url || '#'}
                                            className={`px-2 py-1 text-xs rounded ${
                                                link.active
                                                    ? 'bg-gray-900 text-white dark:bg-indigo-500'
                                                    : 'bg-gray-100 dark:bg-slate-800 dark:text-gray-200'
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
