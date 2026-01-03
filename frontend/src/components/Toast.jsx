import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Toast context for global access
const ToastContext = createContext(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const variants = {
    success: {
        bg: 'bg-green-50 border-green-200',
        icon: '✅',
        iconBg: 'bg-green-100',
        text: 'text-green-800',
    },
    error: {
        bg: 'bg-red-50 border-red-200',
        icon: '❌',
        iconBg: 'bg-red-100',
        text: 'text-red-800',
    },
    warning: {
        bg: 'bg-amber-50 border-amber-200',
        icon: '⚠️',
        iconBg: 'bg-amber-100',
        text: 'text-amber-800',
    },
    info: {
        bg: 'bg-blue-50 border-blue-200',
        icon: 'ℹ️',
        iconBg: 'bg-blue-100',
        text: 'text-blue-800',
    },
};

function Toast({ id, message, variant = 'info', duration = 4000, onDismiss }) {
    const [isExiting, setIsExiting] = useState(false);
    const styles = variants[variant] || variants.info;

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => onDismiss(id), 300);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(id), 300);
    };

    return (
        <div
            className={`
                flex items-center gap-3 p-4 rounded-xl border shadow-lg
                ${styles.bg}
                ${isExiting ? 'toast-exit' : 'toast-enter'}
            `}
            role="alert"
        >
            <div className={`w-8 h-8 rounded-full ${styles.iconBg} flex items-center justify-center text-sm`}>
                {styles.icon}
            </div>
            <p className={`flex-1 text-sm font-medium ${styles.text}`}>{message}</p>
            <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, options = {}) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, ...options }]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback({
        success: (message, options) => addToast(message, { variant: 'success', ...options }),
        error: (message, options) => addToast(message, { variant: 'error', ...options }),
        warning: (message, options) => addToast(message, { variant: 'warning', ...options }),
        info: (message, options) => addToast(message, { variant: 'info', ...options }),
    }, [addToast]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* Toast container */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
                {toasts.map(t => (
                    <Toast
                        key={t.id}
                        id={t.id}
                        message={t.message}
                        variant={t.variant}
                        duration={t.duration}
                        onDismiss={removeToast}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export default Toast;
