export default function Table({ children, className = '' }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] shadow-lg bg-[var(--panel)]">
            <table className={`min-w-full divide-y divide-[var(--border)] ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function TableHead({ children }) {
    return (
        <thead className="bg-[var(--bg-2)]">
            {children}
        </thead>
    );
}

export function TableBody({ children }) {
    return (
        <tbody className="divide-y divide-[var(--border)] bg-[var(--panel)]">
            {children}
        </tbody>
    );
}

export function TableRow({ children, className = '', ...props }) {
    return (
        <tr className={`hover:bg-[var(--panel-hover)] transition-colors even:bg-[var(--bg-2)]/30 ${className}`} {...props}>
            {children}
        </tr>
    );
}

export function TableHeader({ children, className = '' }) {
    return (
        <th className={`px-6 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider ${className}`}>
            {children}
        </th>
    );
}

export function TableCell({ children, className = '' }) {
    return (
        <td className={`px-6 py-4 text-sm text-[var(--text)] ${className}`}>
            {children}
        </td>
    );
}
