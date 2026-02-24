import { useState, useEffect, useCallback } from 'react';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { Input } from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';

const ACTION_COLORS = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    LOGIN: 'bg-purple-100 text-purple-800',
    LOGOUT: 'bg-yellow-100 text-yellow-800',
};

const ACTION_ICONS = {
    CREATE: '➕',
    UPDATE: '✏️',
    DELETE: '🗑️',
    LOGIN: '🔑',
    LOGOUT: '🚪',
};

const ENTITY_TYPES = [
    '', 'APPOINTMENT', 'PATIENT', 'FINANCIAL_EVENT',
    'INVENTORY_ITEM', 'AUTH'
];

const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

const ROLES = ['', 'SENIOR_DOCTOR', 'PERMANENT_DOCTOR', 'DOCTOR', 'SECRETARY'];

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

    // Filters
    const [entityType, setEntityType] = useState('');
    const [action, setAction] = useState('');
    const [userRole, setUserRole] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page, limit: 30 });
            if (entityType) params.append('entity_type', entityType);
            if (action) params.append('action', action);
            if (userRole) params.append('user_role', userRole);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const res = await fetch(`${API_BASE_URL}/audit-logs?${params}`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error('Failed to fetch audit logs');

            const data = await res.json();
            setLogs(data.logs || []);
            setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [entityType, action, userRole, dateFrom, dateTo]);

    useEffect(() => {
        fetchLogs(1);
    }, [fetchLogs]);

    const formatDate = (isoString) => {
        if (!isoString) return '--';
        const d = new Date(isoString);
        return d.toLocaleString([], {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const parseDetails = (detailsStr) => {
        if (!detailsStr) return null;
        try {
            return JSON.parse(detailsStr);
        } catch {
            return detailsStr;
        }
    };

    const renderDetails = (details) => {
        if (!details) return null;
        if (typeof details === 'string') return <span className="text-[var(--muted)]">{details}</span>;

        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(details).map(([key, value]) => {
                    if (value === null || value === undefined) return null;
                    return (
                        <span key={key} className="text-xs px-2 py-0.5 bg-[var(--bg-2)] rounded border border-[var(--border)] text-[var(--muted)]">
                            <span className="font-medium text-[var(--text)]">{key.replace(/_/g, ' ')}:</span>{' '}
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div>
            <PageTitle
                title="Activity Log"
                subtitle="Track all system activity and changes"
            />

            {/* Filters */}
            <Card className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Entity Type</label>
                        <select
                            value={entityType}
                            onChange={(e) => setEntityType(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--panel)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        >
                            <option value="">All Types</option>
                            {ENTITY_TYPES.filter(Boolean).map(t => (
                                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Action</label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--panel)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        >
                            <option value="">All Actions</option>
                            {ACTIONS.filter(Boolean).map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--muted)] mb-1">Role</label>
                        <select
                            value={userRole}
                            onChange={(e) => setUserRole(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--panel)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        >
                            <option value="">All Roles</option>
                            {ROLES.filter(Boolean).map(r => (
                                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Input
                            type="date"
                            label="From"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div>
                        <Input
                            type="date"
                            label="To"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Stats */}
            {pagination.total > 0 && (
                <div className="text-sm text-[var(--muted)] mb-4">
                    Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total events)
                </div>
            )}

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            {loading && <div className="text-center py-8 text-[var(--muted)]">Loading activity log...</div>}

            {!loading && !error && logs.length === 0 && (
                <Card>
                    <p className="text-center text-[var(--muted)] py-8">
                        No activity found. Actions will appear here as they happen.
                    </p>
                </Card>
            )}

            {/* Log entries */}
            <div className="space-y-2">
                {logs.map(log => {
                    const details = parseDetails(log.details);
                    return (
                        <Card key={log.id} className="hover:shadow-sm transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                                {/* Action badge */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-800'}`}>
                                        {ACTION_ICONS[log.action] || '📋'} {log.action}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-2)] text-[var(--text)] border border-[var(--border)]">
                                        {log.entity_type?.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="font-medium text-[var(--text)]">
                                            {log.user_role?.replace(/_/g, ' ') || 'System'}
                                        </span>
                                        <span className="text-[var(--muted)]">•</span>
                                        <span className="text-[var(--muted)]">
                                            {log.entity_type?.replace(/_/g, ' ')} #{log.entity_id || '--'}
                                        </span>
                                    </div>
                                    {renderDetails(details)}
                                </div>

                                {/* Timestamp */}
                                <div className="text-xs text-[var(--muted)] shrink-0 sm:text-right">
                                    {formatDate(log.created_at)}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => fetchLogs(pagination.page - 1)}
                    >
                        ← Previous
                    </Button>
                    <span className="px-4 py-2 text-sm text-[var(--text)]">
                        Page {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchLogs(pagination.page + 1)}
                    >
                        Next →
                    </Button>
                </div>
            )}
        </div>
    );
}
