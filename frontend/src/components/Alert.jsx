export default function Alert({
    children,
    variant = 'info',
    className = '',
    onClose
}) {
    const variants = {
        info: 'bg-blue-50 text-blue-800 border-blue-200',
        success: 'bg-green-50 text-green-800 border-green-200',
        warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        error: 'bg-red-50 text-red-800 border-red-200',
    };

    const iconVariants = {
        info: '💡',
        success: '✅',
        warning: '⚠️',
        error: '❌',
    };

    return (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${variants[variant]} ${className}`}>
            <span className="text-lg">{iconVariants[variant]}</span>
            <div className="flex-1 text-sm">
                {children}
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-current opacity-50 hover:opacity-100 transition-opacity"
                >
                    ✕
                </button>
            )}
        </div>
    );
}
