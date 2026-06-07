import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-brand-500 text-white hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600',
                outline: 'border border-gray-200 bg-white hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
                ghost: 'hover:bg-gray-100 dark:hover:bg-slate-800',
            },
            size: {
                default: 'h-9 px-4',
                sm: 'h-8 px-3 text-xs',
                lg: 'h-10 px-5',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export function Button({ className, variant, size, ...props }) {
    return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
