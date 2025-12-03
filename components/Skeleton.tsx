import * as React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rectangular' | 'circular';
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height
}) => {
    const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700';

    const variantClasses = {
        text: 'h-4 rounded',
        rectangular: 'rounded',
        circular: 'rounded-full'
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
};

// Predefined skeleton components
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 1,
    className = ''
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} variant="text" className="w-full" />
        ))}
    </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`p-6 bg-white rounded-2xl border border-slate-200 ${className}`}>
        <Skeleton variant="circular" width={48} height={48} className="mb-4" />
        <SkeletonText lines={2} className="mb-4" />
        <Skeleton variant="rectangular" height={32} className="w-24" />
    </div>
);

export const SkeletonGrid: React.FC<{ count?: number; className?: string }> = ({
    count = 3,
    className = ''
}) => (
    <div className={`grid md:grid-cols-2 gap-6 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
        ))}
    </div>
);