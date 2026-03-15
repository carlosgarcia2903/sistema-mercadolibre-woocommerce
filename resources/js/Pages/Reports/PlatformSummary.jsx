import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function PlatformSummary({ auth, summary }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Resumen por plataforma" />
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <h1 className="text-xl font-semibold mb-4">Resumen por plataforma</h1>
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left border-b">
                                    <th className="py-2 pr-4">Plataforma</th>
                                    <th className="py-2 pr-4">Órdenes</th>
                                    <th className="py-2 pr-4">Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.map((s, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-2 pr-4">{s.platform}</td>
                                        <td className="py-2 pr-4">{s.orders_count}</td>
                                        <td className="py-2 pr-4">{s.total_sales}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
