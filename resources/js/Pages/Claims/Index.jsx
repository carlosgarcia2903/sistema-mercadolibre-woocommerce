import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { motion } from 'framer-motion';

const money = (n) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);

const dateFmt = (iso) =>
    iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

function Kpi({ label, value, tone = 'text-gray-900 dark:text-white', sub }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
            <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
            {sub && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
        </div>
    );
}

function StatusPill({ claim }) {
    if (claim.status === 'opened') {
        return claim.needs_action ? (
            <span className="inline-flex px-2.5 py-1 rounded-lg border text-xs font-semibold bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">Te toca actuar</span>
        ) : (
            <span className="inline-flex px-2.5 py-1 rounded-lg border text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">Abierto</span>
        );
    }
    return <span className="inline-flex px-2.5 py-1 rounded-lg border text-xs font-semibold bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-700">Cerrado</span>;
}

export default function Index({ auth, claims, estado, q, kpis }) {
    const [search, setSearch] = useState(q || '');
    const go = (params) => router.get(route('claims.index'), { estado, q, ...params }, { preserveState: true, replace: true });

    const tabs = [
        { key: 'abiertos', label: 'Abiertos' },
        { key: 'cerrados', label: 'Cerrados' },
        { key: 'todos', label: 'Todos' },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Reclamos" />
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reclamos y devoluciones</h1>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                            Reclamos de compradores de Mercado Libre, cada uno con la venta a la que pertenece. Se actualizan solos cada 30 minutos.
                        </p>
                    </div>

                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                        <Kpi label="Reclamos abiertos" value={kpis.open} />
                        <Kpi label="Te toca actuar" value={kpis.needs_action} tone={kpis.needs_action > 0 ? 'text-red-600 dark:text-red-400' : undefined} sub="Tienen una acción pendiente tuya" />
                        <Kpi label="Devoluciones en curso" value={kpis.returns_in_progress} sub="El producto está volviendo" />
                        <Kpi label="Reembolsado este mes" value={money(kpis.refunded_month)} tone="text-red-600 dark:text-red-400" sub="Ya descontado de Rentabilidad" />
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-slate-800/60 p-1">
                                {tabs.map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => go({ estado: t.key })}
                                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${estado === t.key ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); go({ q: search }); }} className="flex gap-2 flex-1 min-w-[14rem]">
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por N° de reclamo, N° de venta o cliente"
                                    className="flex-1 rounded-lg border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 text-sm"
                                />
                                <button type="submit" className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm dark:text-gray-200">Buscar</button>
                            </form>
                        </div>

                        {claims.data.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <div className="text-3xl mb-2">🎉</div>
                                {estado === 'abiertos' ? 'No tienes reclamos abiertos.' : 'No hay reclamos para mostrar.'}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-slate-800">
                                {claims.data.map((c, i) => (
                                    <motion.div
                                        key={c.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                                        className="p-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]"
                                    >
                                        {/* Qué pasó */}
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <StatusPill claim={c} />
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{c.type_label}</span>
                                                {c.stage_label && <span className="text-xs text-gray-400">· {c.stage_label}</span>}
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-200">{c.summary}</p>
                                            <p className="text-xs text-gray-400">
                                                Reclamo #{c.claim_id} · abierto el {dateFmt(c.opened_at)}
                                                {c.closed_at ? ` · cerrado el ${dateFmt(c.closed_at)}` : ''}
                                            </p>
                                        </div>

                                        {/* A qué venta pertenece */}
                                        <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 p-3 text-sm">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Venta asociada</div>
                                            {c.order ? (
                                                <>
                                                    <div className="font-semibold text-gray-900 dark:text-white">
                                                        Venta #{c.order.number}
                                                        <span className="ml-2 font-normal text-gray-500">{c.order.customer || 'Cliente'} · {dateFmt(c.order.ordered_at)}</span>
                                                    </div>
                                                    <ul className="mt-1 text-gray-600 dark:text-gray-300 list-disc pl-5">
                                                        {c.order.products.map((p, idx) => <li key={idx}>{p}</li>)}
                                                    </ul>
                                                    <div className="mt-1.5 text-gray-700 dark:text-gray-200">
                                                        Total {money(c.order.total)}
                                                        {c.order.refunded > 0 && <span className="ml-2 font-semibold text-red-600 dark:text-red-400">− {money(c.order.refunded)} devuelto</span>}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-gray-500">
                                                    No encontramos la venta en el sistema (referencia {c.resource_id || 'sin dato'}). Puede ser anterior al inicio del sistema.
                                                </p>
                                            )}
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex lg:flex-col gap-2 lg:items-stretch">
                                            {c.order && (
                                                <>
                                                    <Link
                                                        href={route('orders.index', { tab: 'mercadolibre', order_id: c.order.platform_order_id })}
                                                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 whitespace-nowrap"
                                                    >
                                                        Ver la venta
                                                    </Link>
                                                    <a
                                                        href={c.order.ml_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`px-3 py-2 rounded-lg text-sm text-center font-medium whitespace-nowrap ${c.status === 'opened' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                                    >
                                                        {c.status === 'opened' ? 'Responder en Mercado Libre' : 'Ver en Mercado Libre'}
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {claims.last_page > 1 && (
                            <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-between">
                                <span className="text-xs text-gray-400">{claims.total} reclamos · página {claims.current_page} de {claims.last_page}</span>
                                <div className="flex gap-1.5">
                                    {claims.links.map((l, idx) => (
                                        <button
                                            key={idx}
                                            disabled={!l.url}
                                            onClick={() => l.url && router.get(l.url, {}, { preserveState: true })}
                                            className={`px-3 py-1.5 text-sm rounded-lg ${l.active ? 'bg-gray-900 text-white dark:bg-indigo-500' : 'bg-gray-50 dark:bg-slate-800 dark:text-gray-200'} ${!l.url ? 'opacity-40' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: l.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
