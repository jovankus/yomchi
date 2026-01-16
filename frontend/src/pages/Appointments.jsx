import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAppointments, deleteAppointment } from '../api/appointments';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { Input } from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';

export default function Appointments() {
    const navigate = useNavigate();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Debounce search input - 300ms delay
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAppointments(date, debouncedSearch);
            setAppointments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [date, debouncedSearch]);

    // Fetch appointments when date or debounced search changes
    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Prevent card click
        if (!window.confirm('Are you sure you want to delete this appointment?')) return;
        try {
            await deleteAppointment(id);
            setAppointments(appointments.filter(appt => appt.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleMarkPaid = async (appt, e) => {
        e.stopPropagation(); // Prevent card click
        setActionLoading(appt.id);
        setSuccessMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/${appt.id}/payment`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ payment_status: 'PAID' }),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                // Update local state
                setAppointments(appointments.map(a =>
                    a.id === appt.id ? { ...a, payment_status: 'PAID' } : a
                ));
                if (data.income_generated) {
                    setSuccessMsg(`✅ Marked PAID! Income: ${data.income_generated.toLocaleString()} IQD generated`);
                } else {
                    setSuccessMsg('✅ Marked as PAID');
                }
                setTimeout(() => setSuccessMsg(''), 4000);
            } else {
                alert(data.error || 'Failed to update payment status');
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        // Handle both ISO and "YYYY-MM-DD HH:MM:SS" formats
        const dateStr = isoString.includes('T') ? isoString : isoString.replace(' ', 'T');
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const calculateAge = (dob) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleCardClick = (apptId) => {
        navigate(`/appointments/${apptId}`);
    };

    // Calculate daily summary
    const paidCount = appointments.filter(a => a.payment_status === 'PAID').length;
    const unpaidCount = appointments.filter(a => a.payment_status === 'UNPAID').length;
    const freeReturnCount = appointments.filter(a => a.payment_status === 'FREE_RETURN').length;

    return (
        <div>
            <PageTitle
                title="Appointments"
                subtitle="Manage daily schedule"
                action={
                    <Link to="/appointments/new">
                        <Button>+ New Appointment</Button>
                    </Link>
                }
            />

            <Card className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <Input
                        type="date"
                        label="Select Date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full sm:max-w-xs"
                    />
                    <div className="flex-1 w-full sm:min-w-[200px]">
                        <Input
                            type="text"
                            label="Search Patient"
                            placeholder="Search by name or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {appointments.length > 0 && (
                        <div className="flex gap-3 text-sm">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                💰 {paidCount} Paid
                            </span>
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                                ❌ {unpaidCount} Unpaid
                            </span>
                            {freeReturnCount > 0 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                    🎁 {freeReturnCount} Free Return
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {successMsg && <Alert variant="success" className="mb-4">{successMsg}</Alert>}
            {loading && <div className="text-center py-8 text-slate-500">Loading...</div>}
            {error && <Alert variant="error">{error}</Alert>}

            {!loading && !error && appointments.length === 0 && (
                <Card>
                    <p className="text-center text-slate-500 py-8">
                        {search ? `No appointments found for "${search}"` : 'No appointments for this date.'}
                    </p>
                </Card>
            )}

            <div className="space-y-3">
                {appointments.map(appt => {
                    const age = calculateAge(appt.patient_dob);
                    return (
                        <Card
                            key={appt.id}
                            className="hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300 border-2 border-transparent"
                            onClick={() => handleCardClick(appt.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    {/* Patient Name - Primary */}
                                    <div className="text-lg font-bold text-slate-900 mb-1">
                                        {appt.patient_first_name} {appt.patient_last_name}
                                        {age !== null && (
                                            <span className="ml-2 text-sm font-normal text-slate-500">
                                                ({age} years old)
                                            </span>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    {appt.patient_phone && (
                                        <div className="text-sm text-slate-600 mb-2">
                                            📞 {appt.patient_phone}
                                        </div>
                                    )}

                                    {/* Time + Badges Row */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="text-md font-semibold text-blue-700">
                                            🕐 {formatTime(appt.start_at)} - {formatTime(appt.end_at)}
                                        </div>
                                        {/* Session Type Badge */}
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${appt.session_type === 'ONLINE'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {appt.session_type === 'ONLINE' ? '💻 ONLINE' : '🏥 IN-CLINIC'}
                                        </span>
                                        {/* Payment Status Badge */}
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${appt.payment_status === 'PAID'
                                            ? 'bg-green-100 text-green-800'
                                            : appt.payment_status === 'FREE_RETURN'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {appt.payment_status === 'PAID' ? '💰 PAID' :
                                                appt.payment_status === 'FREE_RETURN' ? '🎁 FREE RETURN' : '❌ UNPAID'}
                                        </span>
                                        {/* Status Badge */}
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${appt.status === 'scheduled' ? 'bg-slate-100 text-slate-700' :
                                            appt.status === 'completed' ? 'bg-green-50 text-green-700' :
                                                appt.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                                    'bg-slate-100 text-slate-700'
                                            }`}>
                                            {appt.status?.toUpperCase() || 'SCHEDULED'}
                                        </span>
                                    </div>

                                    {appt.doctor_cut_percent && (
                                        <div className="text-sm text-slate-500 mt-2">
                                            Doctor Cut: {appt.doctor_cut_percent}%
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-wrap justify-end ml-4">
                                    {/* Mark Paid button - only show if not already PAID */}
                                    {appt.payment_status !== 'PAID' && (
                                        <Button
                                            size="sm"
                                            onClick={(e) => handleMarkPaid(appt, e)}
                                            disabled={actionLoading === appt.id}
                                        >
                                            {actionLoading === appt.id ? '...' : '💰 Mark Paid'}
                                        </Button>
                                    )}
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/appointments/${appt.id}`);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={(e) => handleDelete(appt.id, e)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
