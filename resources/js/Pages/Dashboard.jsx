import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard({ auth, stats }) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded shadow">
                            <div className="text-sm text-gray-500">Órdenes hoy</div>
                            <div className="text-2xl font-semibold">{stats.orders_today}</div>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <div className="text-sm text-gray-500">Órdenes semana</div>
                            <div className="text-2xl font-semibold">{stats.orders_week}</div>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <div className="text-sm text-gray-500">Bajo stock</div>
                            <div className="text-2xl font-semibold">{stats.low_stock}</div>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <div className="text-sm text-gray-500">Ventas hoy</div>
                            <div className="text-2xl font-semibold">{stats.sales_today}</div>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <div className="text-sm text-gray-500">Ventas semana</div>
                            <div className="text-2xl font-semibold">{stats.sales_week}</div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
