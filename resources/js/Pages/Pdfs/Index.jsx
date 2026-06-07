import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/Components/ui/badge';

const STATUS_LABELS = {
    pending: 'Pendiente',
    ready_to_ship: 'Listo para enviar',
    handling: 'Preparando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    not_delivered: 'No entregado',
    cancelled: 'Cancelado',
};

const SUBSTATUS_LABELS = {
    printed: 'Etiqueta impresa',
    picked_up: 'Retirado',
    in_hub: 'En centro logístico',
    in_transit: 'En tránsito',
    delayed: 'Retrasado',
    returned: 'Devuelto',
    damaged: 'Dañado',
    null: 'Sin subestado',
};

function toSpanishStatus(status) {
    if (!status) return 'Sin estado';
    return STATUS_LABELS[status] || status.replaceAll('_', ' ');
}

function toSpanishSubstatus(substatus) {
    if (!substatus) return 'Sin subestado';
    return SUBSTATUS_LABELS[substatus] || substatus.replaceAll('_', ' ');
}

function toSpanishLogisticType(type) {
    if (!type) return 'Envío ML';
    if (type === 'self_service') return 'Flex';
    if (type === 'drop_off') return 'Drop Off';
    if (type === 'cross_docking') return 'Cross Docking';
    if (type === 'fulfillment') return 'Full';
    return type.replaceAll('_', ' ');
}

function badgeVariantByStatus(status) {
    if (status === 'delivered') return 'success';
    if (status === 'cancelled' || status === 'not_delivered') return 'destructive';
    if (status === 'shipped' || status === 'handling' || status === 'ready_to_ship') return 'warning';
    return 'outline';
}

function translatePaginationLabel(label) {
    if (label.includes('Previous')) return 'Anterior';
    if (label.includes('Next')) return 'Siguiente';
    return label;
}

export default function Index({ auth, pdfs, type = 'all', counts }) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Etiquetas ML" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm rounded-lg p-6 border border-[#eaedf1] dark:border-slate-800">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                            <div>
                                <h1 className="text-xl font-semibold text-[#313b5e] dark:text-gray-100">Historial de etiquetas Mercado Libre</h1>
                                <p className="text-sm text-gray-500">Se conservan los cambios de estado de cada etiqueta.</p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={route('mlpdfs.index', { type: 'all' })}
                                    className={`px-3 py-1.5 rounded-lg text-sm ${type === 'all' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200'}`}
                                >
                                    Todas ({counts?.all ?? 0})
                                </Link>
                                <Link
                                    href={route('mlpdfs.index', { type: 'flex' })}
                                    className={`px-3 py-1.5 rounded-lg text-sm ${type === 'flex' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200'}`}
                                >
                                    Flex ({counts?.flex ?? 0})
                                </Link>
                                <Link
                                    href={route('mlpdfs.index', { type: 'ml' })}
                                    className={`px-3 py-1.5 rounded-lg text-sm ${type === 'ml' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200'}`}
                                >
                                    Envío ML ({counts?.ml ?? 0})
                                </Link>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-slate-800/60">
                                        <th className="py-3 px-4">Shipment ID</th>
                                        <th className="py-3 px-4">Orden</th>
                                        <th className="py-3 px-4">Tipo de envío</th>
                                        <th className="py-3 px-4">Estado</th>
                                        <th className="py-3 px-4">Subestado</th>
                                        <th className="py-3 px-4">Fecha registro</th>
                                        <th className="py-3 px-4 text-right">PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pdfs.data.map((p) => (
                                        <tr key={p.id} className="border-b border-gray-200 dark:border-slate-800 hover:bg-gray-50/70 dark:hover:bg-slate-800/50">
                                            <td className="py-3 px-4 font-medium text-[#313b5e] dark:text-gray-100">{p.platform_shipment_id}</td>
                                            <td className="py-3 px-4">{p.order?.platform_order_id || '-'}</td>
                                            <td className="py-3 px-4">{toSpanishLogisticType(p.logistic_type)}</td>
                                            <td className="py-3 px-4">
                                                <Badge variant={badgeVariantByStatus(p.shipment_status)}>
                                                    {toSpanishStatus(p.shipment_status)}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">{toSpanishSubstatus(p.shipment_substatus)}</td>
                                            <td className="py-3 px-4">
                                                {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {p.pdf_path ? (
                                                    <a
                                                        href={route('mlpdfs.download', p.id)}
                                                        className="text-brand-600 hover:underline dark:text-brand-500"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Descargar PDF
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400">Sin PDF</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {pdfs.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-3 py-1.5 text-sm rounded-lg ${
                                        link.active ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'
                                    } ${!link.url ? 'opacity-50 pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: translatePaginationLabel(link.label) }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
