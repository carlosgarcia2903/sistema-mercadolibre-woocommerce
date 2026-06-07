import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

export default function Dashboard({ auth, stats, mlPdfs, chart }) {
    const [pdfTab, setPdfTab] = useState('flex');

    const filteredPdfs = useMemo(() => {
        const items = mlPdfs?.items || [];
        if (pdfTab === 'flex') {
            return items.filter((p) => p.logistic_type === 'self_service');
        }
        return items.filter((p) => p.logistic_type !== 'self_service');
    }, [mlPdfs, pdfTab]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
                    <p className="text-sm text-gray-500">Resumen general y últimas etiquetas.</p>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {[
                            { label: 'Órdenes hoy', value: stats.orders_today },
                            { label: 'Órdenes semana', value: stats.orders_week },
                            { label: 'Ventas hoy', value: stats.sales_today, prefix: '$' },
                            { label: 'Ventas semana', value: stats.sales_week, prefix: '$' },
                        ].map((card) => (
                            <Card key={card.label} className="border border-gray-100 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-gray-500">{card.label}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-semibold text-gray-900">
                                        {card.prefix || ''}{card.value}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Card className="border border-gray-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-gray-500">Bajo stock</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-semibold text-gray-900">{stats.low_stock}</div>
                                <Badge className="mt-2" variant="warning">Revisar</Badge>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.05 }}
                    >
                        <Card className="lg:col-span-2">
                            <CardHeader className="flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Ventas últimos 7 días</CardTitle>
                                    <p className="text-sm text-gray-500">Órdenes y ventas agrupadas</p>
                                </div>
                                <Badge variant="outline">Últimos 7 días</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chart || []}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                                                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="sales" stroke="#6366F1" fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Acciones rápidas</CardTitle>
                                <p className="text-sm text-gray-500">Accesos directos</p>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button onClick={() => (window.location.href = route('products.index'))}>
                                    Ver productos
                                </Button>
                                <Button variant="outline" onClick={() => (window.location.href = route('orders.index'))}>
                                    Ver órdenes
                                </Button>
                                <Button variant="outline" onClick={() => (window.location.href = route('mlpdfs.index'))}>
                                    Etiquetas ML
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Etiquetas ML (PDFs)</h3>
                                <p className="text-sm text-gray-500">Últimas etiquetas sincronizadas</p>
                            </div>
                            <a
                                href={route('mlpdfs.index', { type: pdfTab })}
                                className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Ver todas ({mlPdfs?.total ?? 0})
                            </a>
                        </div>

                        <div className="mb-4 flex gap-2">
                            <Button
                                size="sm"
                                variant={pdfTab === 'flex' ? 'default' : 'outline'}
                                onClick={() => setPdfTab('flex')}
                            >
                                Flex ({mlPdfs?.counts?.flex ?? 0})
                            </Button>
                            <Button
                                size="sm"
                                variant={pdfTab === 'ml' ? 'default' : 'outline'}
                                onClick={() => setPdfTab('ml')}
                            >
                                Envío ML ({mlPdfs?.counts?.ml ?? 0})
                            </Button>
                        </div>

                        {filteredPdfs.length ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
                                            <th className="py-2">Orden</th>
                                            <th className="py-2">Shipment</th>
                                            <th className="py-2">Fecha</th>
                                            <th className="py-2">Estado</th>
                                            <th className="py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPdfs.map((pdf) => (
                                            <tr key={pdf.id} className="border-b border-gray-200 dark:border-slate-800">
                                                <td className="py-2">
                                                    {pdf.order ? `${pdf.order.platform} #${pdf.order.platform_order_id}` : '-'}
                                                </td>
                                                <td className="py-2">{pdf.platform_shipment_id || '-'}</td>
                                                <td className="py-2">{pdf.downloaded_at || '-'}</td>
                                                <td className="py-2">
                                                    {pdf.shipment_status || '-'}{pdf.shipment_substatus ? ` / ${pdf.shipment_substatus}` : ''}
                                                </td>
                                                <td className="py-2 text-right">
                                                    <a
                                                        href={route('mlpdfs.download', pdf.id)}
                                                        className="text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        Descargar PDF
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">No hay PDFs aún.</div>
                        )}
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
