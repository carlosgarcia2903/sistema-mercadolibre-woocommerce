import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ auth, products, tab }) {
    const tabs = [
        { key: 'woocommerce', label: 'WooCommerce' },
        { key: 'mercadolibre', label: 'Mercado Libre' },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Productos" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-semibold">Productos</h1>
                            <div className="flex gap-2">
                                {tabs.map((t) => (
                                    <Link
                                        key={t.key}
                                        href={route('products.index', { tab: t.key })}
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
                                        <th className="py-2 pr-4">SKU</th>
                                        <th className="py-2 pr-4">Nombre</th>
                                        <th className="py-2 pr-4">Precio</th>
                                        <th className="py-2 pr-4">Stock</th>
                                        <th className="py-2 pr-4">Fuente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.data.map((p) => (
                                        <tr key={p.id} className="border-b">
                                            <td className="py-2 pr-4">{p.sku || '-'}</td>
                                            <td className="py-2 pr-4">{p.name}</td>
                                            <td className="py-2 pr-4">{p.price}</td>
                                            <td className="py-2 pr-4">{p.stock ?? '-'}</td>
                                            <td className="py-2 pr-4">{p.source}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex gap-2">
                            {products.links.map((link, i) => (
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
