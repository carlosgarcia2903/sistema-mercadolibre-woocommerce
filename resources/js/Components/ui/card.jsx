import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
    return (
        <div
            className={cn('rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }) {
    return <div className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
    return <h3 className={cn('text-base font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
    return <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
    return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
    return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />;
}
