export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    onClick,
    disabled = false,
    className = '',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-primary text-[var(--primary-contrast)] hover:bg-primary-700 focus:ring-[var(--ring)] shadow-sm hover:shadow-md',
        secondary: 'bg-[var(--panel)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--panel-hover)] hover:border-primary/50 focus:ring-[var(--ring)] shadow-sm',
        danger: 'bg-danger text-white hover:bg-danger-600 focus:ring-danger shadow-sm hover:shadow-md',
        ghost: 'text-[var(--text)] hover:bg-[var(--panel-hover)] hover:text-primary focus:ring-[var(--ring)]',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
