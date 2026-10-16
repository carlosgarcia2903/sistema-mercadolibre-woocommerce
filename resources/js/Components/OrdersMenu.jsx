import { Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const MARKETPLACES = [
    { key: 'woocommerce', label: 'WooCommerce', dot: 'bg-violet-500' },
    { key: 'mercadolibre', label: 'Mercado Libre', dot: 'bg-amber-400' },
    { key: 'falabella', label: 'Falabella', dot: 'bg-green-500' },
    { key: 'paris', label: 'Paris', dot: 'bg-red-500' },
];

// Menú "Órdenes" con un submenú por marketplace. Apunta a /orders?tab=<plataforma>,
// los mismos tabs que ya existen dentro de la página de Órdenes.
export default function OrdersMenu({ onNavigate, mobile = false }) {
    const { url } = usePage();
    const onOrders = route().current('orders.index');
    const currentTab = onOrders
        ? new URLSearchParams(url.split('?')[1] || '').get('tab') || 'woocommerce'
        : null;

    const [open, setOpen] = useState(onOrders);

    useEffect(() => {
        if (onOrders) setOpen(true);
    }, [onOrders]);

    const parentClass = mobile
        ? `flex flex-1 items-start border-l-4 py-2 pe-4 ps-3 text-base font-medium transition ${
              onOrders
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-white'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800'
          }`
        : `flex flex-1 items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              onOrders
                  ? 'bg-[#f3f1fa] text-[#3d4756] dark:bg-slate-800 dark:text-white'
                  : 'text-[#8486a7] hover:bg-[#f3f1fa] hover:text-[#3d4756] dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`;

    return (
        <div>
            <div className="flex items-center">
                <Link
                    href={route('orders.index', { tab: currentTab || 'woocommerce' })}
                    onClick={onNavigate}
                    className={parentClass}
                >
                    Órdenes
                </Link>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={open ? 'Ocultar submenú de órdenes' : 'Mostrar submenú de órdenes'}
                    aria-expanded={open}
                    className="ml-1 rounded-lg p-2 text-[#8486a7] hover:bg-[#f3f1fa] hover:text-[#3d4756] dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                    <motion.svg
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </motion.svg>
                </button>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-200 pl-2 dark:border-slate-700">
                            {MARKETPLACES.map((m) => {
                                const active = currentTab === m.key;
                                return (
                                    <Link
                                        key={m.key}
                                        href={route('orders.index', { tab: m.key })}
                                        onClick={onNavigate}
                                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                                            active
                                                ? 'bg-[#f3f1fa] font-medium text-[#3d4756] dark:bg-slate-800 dark:text-white'
                                                : 'text-[#8486a7] hover:bg-[#f3f1fa] hover:text-[#3d4756] dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                                        {m.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
