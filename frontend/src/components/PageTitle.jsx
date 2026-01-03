export default function PageTitle({ title, subtitle, action, children }) {
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                    )}
                </div>
                {action && (
                    <div>{action}</div>
                )}
            </div>
            {children}
        </div>
    );
}
