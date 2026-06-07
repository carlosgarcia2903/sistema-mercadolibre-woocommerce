import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'light';
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
    };

    return (
        <div className="min-h-screen bg-[#f4f7fb] dark:bg-slate-950 text-[#36404a] dark:text-gray-100">
            <div className="flex min-h-screen">
                <aside className="hidden lg:flex w-[260px] flex-col border-r border-[#eaedf1] dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="h-[70px] flex items-center px-6 border-b border-[#eaedf1] dark:border-slate-800">
                        <Link href="/" className="flex items-center gap-3">
                            <ApplicationLogo className="block h-8 w-auto fill-current text-gray-800 dark:text-white" />
                            <span className="font-semibold text-lg text-[#313b5e] dark:text-white">IDENSTORE</span>
                        </Link>
                    </div>
                    <div className="px-4 py-4">
                        <p className="text-xs uppercase tracking-wide text-[#a0a6b4] mb-3">Menu</p>
                        <div className="space-y-1">
                            <NavLink href={route('dashboard')} active={route().current('dashboard')}>
                                Dashboard
                            </NavLink>
                            <NavLink href={route('products.index')} active={route().current('products.index')}>
                                Productos
                            </NavLink>
                            <NavLink href={route('orders.index')} active={route().current('orders.index')}>
                                Órdenes
                            </NavLink>
                            <NavLink href={route('mlpdfs.index')} active={route().current('mlpdfs.index')}>
                                PDFs ML
                            </NavLink>
                            <NavLink href={route('reports.inventory')} active={route().current('reports.inventory')}>
                                Inventario
                            </NavLink>
                            <NavLink href={route('reports.orders')} active={route().current('reports.orders')}>
                                Reportes
                            </NavLink>
                            <NavLink href={route('reports.platforms')} active={route().current('reports.platforms')}>
                                Plataformas
                            </NavLink>
                        </div>
                    </div>
                    <div className="mt-auto p-4 border-t border-gray-200 dark:border-slate-800">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Sesión</div>
                        <div className="mt-2 text-sm font-medium">{user.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                        <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" onClick={toggleTheme}>
                                {theme === 'dark' ? 'Claro' : 'Oscuro'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => (window.location.href = route('profile.edit'))}>
                                Perfil
                            </Button>
                        </div>
                    </div>
                </aside>

                <div className="flex-1 flex flex-col">
                    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowingNavigationDropdown((prev) => !prev)}
                                className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-slate-800 dark:hover:text-gray-200"
                            >
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path
                                        className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                            <span className="font-semibold text-lg">Dashboard</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={toggleTheme}>
                                {theme === 'dark' ? '🌙' : '☀️'}
                            </Button>
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button
                                            type="button"
                                            className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none dark:bg-slate-900 dark:text-gray-300"
                                        >
                                            {user.name}
                                            <svg
                                                className="-me-0.5 ms-2 h-4 w-4"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </header>

                    {showingNavigationDropdown && (
                        <div className="lg:hidden border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="space-y-1 py-2">
                                <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                                    Dashboard
                                </ResponsiveNavLink>
                                <ResponsiveNavLink href={route('products.index')} active={route().current('products.index')}>
                                    Productos
                                </ResponsiveNavLink>
                                <ResponsiveNavLink href={route('orders.index')} active={route().current('orders.index')}>
                                    Órdenes
                                </ResponsiveNavLink>
                                <ResponsiveNavLink href={route('mlpdfs.index')} active={route().current('mlpdfs.index')}>
                                    PDFs ML
                                </ResponsiveNavLink>
                                <ResponsiveNavLink href={route('reports.inventory')} active={route().current('reports.inventory')}>
                                    Inventario
                                </ResponsiveNavLink>
                                <ResponsiveNavLink href={route('reports.orders')} active={route().current('reports.orders')}>
                                    Reportes
                                </ResponsiveNavLink>
                                <ResponsiveNavLink href={route('reports.platforms')} active={route().current('reports.platforms')}>
                                    Plataformas
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    )}

                    {header && (
                        <div className="px-4 sm:px-6 py-6">
                            {header}
                        </div>
                    )}

                    <main className="flex-1 px-4 sm:px-6 pb-8">{children}</main>
                </div>
            </div>
        </div>
    );
}
