export default function Table({ children, className = '' }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
            <table className={`min-w-full divide-y divide-slate-200 ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function TableHead({ children }) {
    return (
        <thead className="bg-slate-50">
            {children}
        </thead>
    );
}

export function TableBody({ children }) {
    return (
        <tbody className="divide-y divide-slate-100 bg-white">
            {children}
        </tbody>
    );
}

export function TableRow({ children, className = '', ...props }) {
    return (
        <tr className={`hover:bg-slate-50 transition-colors ${className}`} {...props}>
            {children}
        </tr>
    );
}

export function TableHeader({ children, className = '' }) {
    return (
        <th className={`px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${className}`}>
            {children}
        </th>
    );
}

export function TableCell({ children, className = '' }) {
    return (
        <td className={`px-6 py-4 text-sm text-slate-900 ${className}`}>
            {children}
        </td>
    );
}
