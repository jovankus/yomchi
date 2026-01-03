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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {label}
                </label>
            )}
            <input
                type={type}
                className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors
          ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring focus:ring-red-200'
                        : 'border-slate-300 focus:border-primary-500 focus:ring focus:ring-primary-200'
                    } 
          focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {label}
                </label>
            )}
            <select
                className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors
          ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring focus:ring-red-200'
                        : 'border-slate-300 focus:border-primary-500 focus:ring focus:ring-primary-200'
                    } 
          focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed ${className}`}
                {...props}
            >
                {children}
            </select>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {label}
                </label>
            )}
            <textarea
                rows={rows}
                className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors resize-none
          ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring focus:ring-red-200'
                        : 'border-slate-300 focus:border-primary-500 focus:ring focus:ring-primary-200'
                    } 
          focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
