export function Input({
    label,
    error,
    type = 'text',
    className = '',
    ...props
}) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    {label}
                </label>
            )}
            <input
                type={type}
                className={`w-full px-3 py-2 bg-[var(--panel)] text-[var(--text)] border rounded-lg shadow-sm transition-all
          ${error
                        ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
                        : 'border-[var(--border)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20'
                    } 
          focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--muted)] ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-danger">{error}</p>
            )}
        </div>
    );
}

export function Select({
    label,
    error,
    children,
    className = '',
    ...props
}) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    {label}
                </label>
            )}
            <select
                className={`w-full px-3 py-2 bg-[var(--panel)] text-[var(--text)] border rounded-lg shadow-sm transition-all
          ${error
                        ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
                        : 'border-[var(--border)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20'
                    } 
          focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                {...props}
            >
                {children}
            </select>
            {error && (
                <p className="mt-1 text-sm text-danger">{error}</p>
            )}
        </div>
    );
}

export function TextArea({
    label,
    error,
    className = '',
    rows = 4,
    ...props
}) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                    {label}
                </label>
            )}
            <textarea
                rows={rows}
                className={`w-full px-3 py-2 bg-[var(--panel)] text-[var(--text)] border rounded-lg shadow-sm transition-all resize-none
          ${error
                        ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
                        : 'border-[var(--border)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20'
                    } 
          focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--muted)] ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-danger">{error}</p>
            )}
        </div>
    );
}
