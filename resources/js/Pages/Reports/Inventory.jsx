import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Inventory({ auth, products }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Inventario" />
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm sm:rounded-lg p-6 border border-transparent dark:border-slate-800">
                        <h1 className="text-xl font-semibold mb-4">Inventario (stock)</h1>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400">
                                    <th className="py-2 pr-4">SKU</th>
                                    <th className="py-2 pr-4">Nombre</th>
                                    <th className="py-2 pr-4">Stock</th>
                                    <th className="py-2 pr-4">Fuente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.data.map((p) => (
                                    <tr key={p.id} className="border-b border-gray-200 dark:border-slate-800">
                                        <td className="py-2 pr-4">{p.sku || '-'}</td>
                                        <td className="py-2 pr-4">{p.name}</td>
                                        <td className="py-2 pr-4">{p.stock ?? '-'}</td>
                                        <td className="py-2 pr-4">{p.source}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 flex gap-2">
                            {products.links.map((link, i) => (
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
