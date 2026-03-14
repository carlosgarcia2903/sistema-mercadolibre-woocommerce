import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ auth, orders, tab }) {
    const tabs = [
        { key: 'woocommerce', label: 'WooCommerce' },
        { key: 'mercadolibre', label: 'Mercado Libre' },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Órdenes" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-semibold">Órdenes</h1>
                            <div className="flex gap-2">
                                {tabs.map((t) => (
                                    <Link
                                        key={t.key}
                                        href={route('orders.index', { tab: t.key })}
                                        className={`px-3 py-1 rounded-full text-sm ${
                                            tab === t.key
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                        {t.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b">
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
                                        <tr key={o.id} className="border-b">
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
                                        link.active ? 'bg-gray-900 text-white' : 'bg-gray-100'
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
