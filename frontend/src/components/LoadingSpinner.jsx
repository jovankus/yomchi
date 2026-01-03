import PropTypes from 'prop-types';

const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-2',
    xl: 'h-12 w-12 border-4',
};

const colors = {
    primary: 'border-blue-600',
    white: 'border-white',
    slate: 'border-slate-600',
};

export default function LoadingSpinner({
    size = 'md',
    color = 'primary',
    label = 'Loading...',
    showLabel = false,
    className = ''
}) {
    const sizeClass = sizes[size] || sizes.md;
    const colorClass = colors[color] || colors.primary;

    return (
        <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
            <div
                className={`animate-spin rounded-full border-t-transparent ${sizeClass} ${colorClass}`}
                role="status"
                aria-label={label}
            />
            {showLabel && (
                <span className="text-sm text-slate-500">{label}</span>
            )}
            <span className="sr-only">{label}</span>
        </div>
    );
}

LoadingSpinner.propTypes = {
    size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
    color: PropTypes.oneOf(['primary', 'white', 'slate']),
    label: PropTypes.string,
    showLabel: PropTypes.bool,
    className: PropTypes.string,
};

// Page-level loading state
export function PageLoader({ message = 'Loading...' }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <LoadingSpinner size="xl" />
            <p className="text-slate-500 text-sm">{message}</p>
        </div>
    );
}

// Inline loading for buttons
export function ButtonLoader({ className = '' }) {
    return (
        <LoadingSpinner size="sm" color="white" className={className} />
    );
}

// Skeleton loader for content placeholders
export function Skeleton({ className = '', variant = 'text' }) {
    const baseClasses = 'animate-pulse bg-slate-200 rounded';

    const variants = {
        text: 'h-4 w-full',
        title: 'h-6 w-3/4',
        avatar: 'h-10 w-10 rounded-full',
        button: 'h-10 w-24',
        card: 'h-32 w-full',
    };

    return (
        <div className={`${baseClasses} ${variants[variant] || variants.text} ${className}`} />
    );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} variant="title" className="flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton key={colIndex} variant="text" className="flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}
