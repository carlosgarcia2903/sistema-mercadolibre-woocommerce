import { cn } from '@/lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
    const variants = {
        default: 'bg-gray-900 text-white',
        outline: 'border border-gray-200 text-gray-700 dark:border-slate-700 dark:text-gray-300',
        success: 'bg-emerald-500 text-white',
        warning: 'bg-amber-500 text-white',
        destructive: 'bg-rose-500 text-white',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                variants[variant] || variants.default,
                className,
            )}
            {...props}
        />
    );
}
