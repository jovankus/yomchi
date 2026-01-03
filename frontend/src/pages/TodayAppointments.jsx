import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { safeArray } from '../api/apiUtils';
import { API_BASE_URL } from '../config';

export default function TodayAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchTodayAppointments();
    }, []);

    const fetchTodayAppointments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/appointments?date=${today}`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch appointments');
            const data = await res.json();
            setAppointments(safeArray(data));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return '—';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age}y`;
    };

    const formatTime = (datetime) => {
        if (!datetime) return '—';
        const time = datetime.split(' ')[1] || datetime.split('T')[1];
        return time ? time.slice(0, 5) : '—';
    };

    const handleMarkPaid = async (apptId) => {
        setActionLoading(apptId);
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/${apptId}/payment`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_status: 'PAID' })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to mark as paid');
            }
            await fetchTodayAppointments();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleMarkArrived = async (apptId) => {
        setActionLoading(apptId);
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/${apptId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'arrived' })
            });
            if (!res.ok) throw new Error('Failed to update status');
            await fetchTodayAppointments();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleFreeReturn = async (apptId) => {
        setActionLoading(apptId);
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/${apptId}/payment`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_status: 'FREE_RETURN',
                    free_return_reason: 'Quick action - same condition follow-up'
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to mark as free return');
            }
            await fetchTodayAppointments();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (appt) => {
        const { status, payment_status } = appt;

        if (payment_status === 'PAID') {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">💰 Paid</span>;
        }
        if (payment_status === 'FREE_RETURN') {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">🎁 Free Return</span>;
        }
        if (status === 'arrived') {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">✓ Arrived</span>;
        }
        if (status === 'cancelled') {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ Cancelled</span>;
        }
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">⏳ Scheduled</span>;
    };

    const getSessionTypeBadge = (sessionType) => {
        if (sessionType === 'ONLINE') {
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">💻 Online</span>;
        }
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">🏥 In Clinic</span>;
    };

    // Summary counts
    const totalCount = appointments.length;
    const paidCount = appointments.filter(a => a.payment_status === 'PAID').length;
    const arrivedCount = appointments.filter(a => a.status === 'arrived').length;
    const unpaidCount = appointments.filter(a => a.payment_status === 'UNPAID').length;

    return (
        <div>
            <PageTitle
                title="📅 Today's Appointments"
                action={
                    <Link to="/appointments/new">
                        <Button>+ New Appointment</Button>
                    </Link>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
                    <div className="text-sm text-slate-500">Total</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{paidCount}</div>
                    <div className="text-sm text-green-600">Paid</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{arrivedCount}</div>
                    <div className="text-sm text-blue-600">Arrived</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">{unpaidCount}</div>
                    <div className="text-sm text-amber-600">Unpaid</div>
                </div>
            </div>

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}

            <Card>
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-slate-500 mt-2">Loading...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-3">📭</div>
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No appointments today</h3>
                        <p className="text-slate-500">Schedule a new appointment to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {appointments.map(appt => (
                            <div key={appt.id} className="py-4 flex items-center justify-between hover:bg-slate-50 -mx-4 px-4 transition-colors">
                                {/* Left: Time & Patient Info */}
                                <div className="flex items-center gap-4">
                                    <div className="text-center min-w-[60px]">
                                        <div className="text-lg font-bold text-slate-900">{formatTime(appt.start_at)}</div>
                                        <div className="text-xs text-slate-400">{formatTime(appt.end_at)}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">
                                            {appt.patient_first_name} {appt.patient_last_name}
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            📞 {appt.patient_phone || '—'} · Age: {calculateAge(appt.patient_dob)}
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Badges */}
                                <div className="flex items-center gap-2">
                                    {getSessionTypeBadge(appt.session_type)}
                                    {getStatusBadge(appt)}
                                </div>

                                {/* Right: Quick Actions */}
                                <div className="flex items-center gap-2">
                                    {appt.status !== 'arrived' && appt.payment_status !== 'PAID' && (
                                        <button
                                            onClick={() => handleMarkArrived(appt.id)}
                                            disabled={actionLoading === appt.id}
                                            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            ✓ Arrived
                                        </button>
                                    )}
                                    {appt.payment_status === 'UNPAID' && (
                                        <>
                                            <button
                                                onClick={() => handleMarkPaid(appt.id)}
                                                disabled={actionLoading === appt.id}
                                                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                💰 Paid
                                            </button>
                                            <button
                                                onClick={() => handleFreeReturn(appt.id)}
                                                disabled={actionLoading === appt.id}
                                                className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                🎁 Free
                                            </button>
                                        </>
                                    )}
                                    <Link to={`/appointments/${appt.id}/edit`}>
                                        <button className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                            ✏️ Edit
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Quick Nav */}
            <div className="mt-6 flex gap-4">
                <Link to="/appointments" className="text-sm text-blue-600 hover:underline">
                    ← View all appointments
                </Link>
            </div>
        </div>
    );
}
