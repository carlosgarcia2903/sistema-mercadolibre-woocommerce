import { Link, usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';

const PLATFORMS = [
    { key: 'woocommerce', label: 'Sitio Web', dot: 'bg-violet-500' },
    { key: 'mercadolibre', label: 'Mercado Libre', dot: 'bg-amber-400' },
    { key: 'falabella', label: 'Falabella', dot: 'bg-green-500' },
    { key: 'paris', label: 'Paris', dot: 'bg-blue-500' },
];

export default function NotificationsBell() {
    const pending = usePage().props.pendingOrders ?? { total: 0, byPlatform: {} };

    return (
        <Dropdown>
            <Dropdown.Trigger>
                <button
                    type="button"
                    aria-label={`Órdenes por preparar: ${pending.total}`}
                    className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    {pending.total > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
                            {pending.total > 99 ? '99+' : pending.total}
                        </span>
                    )}
                </button>
            </Dropdown.Trigger>
            <Dropdown.Content width="60" contentClasses="py-2 bg-white dark:bg-slate-900">
                <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Por preparar</div>
                {pending.total === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Todo al día 🎉</div>
                ) : (
                    PLATFORMS.filter((p) => pending.byPlatform?.[p.key] > 0).map((p) => (
                        <Link
                            key={p.key}
                            href={route('orders.index', { tab: p.key, fulfillment: 'pending' })}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800"
                        >
                            <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                            {p.label}
                            <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{pending.byPlatform[p.key]}</span>
                        </Link>
                    ))
                )}
            </Dropdown.Content>
        </Dropdown>
    );
}
