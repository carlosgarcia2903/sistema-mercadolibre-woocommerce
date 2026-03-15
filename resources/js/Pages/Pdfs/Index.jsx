import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ auth, pdfs }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Etiquetas ML" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-semibold">Etiquetas Mercado Libre</h1>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b">
                                        <th className="py-2 pr-4">Shipment ID</th>
                                        <th className="py-2 pr-4">Orden</th>
                                        <th className="py-2 pr-4">Fecha</th>
                                        <th className="py-2 pr-4">PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pdfs.data.map((p) => (
                                        <tr key={p.id} className="border-b">
                                            <td className="py-2 pr-4">{p.platform_shipment_id}</td>
                                            <td className="py-2 pr-4">{p.order?.platform_order_id || '-'}</td>
                                            <td className="py-2 pr-4">
                                                {p.downloaded_at ? new Date(p.downloaded_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="py-2 pr-4">
                                                <Link
                                                    href={route('mlpdfs.download', p.id)}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    Descargar
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex gap-2">
                            {pdfs.links.map((link, i) => (
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
