import PropTypes from 'prop-types';

const variants = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
};

const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
};

export default function Badge({
    children,
    variant = 'neutral',
    size = 'md',
    icon = null,
    className = ''
}) {
    const variantClasses = variants[variant] || variants.neutral;
    const sizeClasses = sizes[size] || sizes.md;

    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${variantClasses} ${sizeClasses} ${className}`}>
            {icon && <span>{icon}</span>}
            {children}
        </span>
    );
}

Badge.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf(['success', 'warning', 'error', 'info', 'neutral', 'purple']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    icon: PropTypes.string,
    className: PropTypes.string,
};

// Predefined badges for common statuses
export function PaidBadge() {
    return <Badge variant="success" icon="💰">Paid</Badge>;
}

export function UnpaidBadge() {
    return <Badge variant="warning" icon="❌">Unpaid</Badge>;
}

export function FreeReturnBadge() {
    return <Badge variant="purple" icon="🎁">Free Return</Badge>;
}

export function ArrivedBadge() {
    return <Badge variant="info" icon="✓">Arrived</Badge>;
}

export function ScheduledBadge() {
    return <Badge variant="neutral" icon="⏳">Scheduled</Badge>;
}

export function OnlineBadge() {
    return <Badge variant="info" size="sm" icon="💻">Online</Badge>;
}

export function InClinicBadge() {
    return <Badge variant="neutral" size="sm" icon="🏥">In Clinic</Badge>;
}
