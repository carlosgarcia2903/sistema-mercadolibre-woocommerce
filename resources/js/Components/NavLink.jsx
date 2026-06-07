import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ' +
                (active
                    ? 'bg-[#f3f1fa] text-[#3d4756] dark:bg-slate-800 dark:text-white'
                    : 'text-[#8486a7] hover:bg-[#f3f1fa] hover:text-[#3d4756] dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-white') +
                className
            }
        >
            {children}
        </Link>
    );
}
