export default function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-[var(--panel)] rounded-lg shadow-lg border border-[var(--border)] p-6 transition-all hover:shadow-xl ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }) {
    return (
        <div className={`border-b border-[var(--border)] pb-4 mb-4 ${className}`}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = '' }) {
    return (
        <h3 className={`text-lg font-semibold text-[var(--text)] ${className}`}>
            {children}
        </h3>
    );
}

export function CardContent({ children, className = '' }) {
    return (
        <div className={className}>
            {children}
        </div>
    );
}
