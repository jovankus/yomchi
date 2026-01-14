import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';

function StatCard({ title, value, icon, color, link }) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-900',
        green: 'bg-green-50 border-green-200 text-green-900',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        red: 'bg-red-50 border-red-200 text-red-900',
        purple: 'bg-purple-50 border-purple-200 text-purple-900'
    };

    const content = (
        <div className={`p-6 rounded-xl border ${colorClasses[color]} transition-all hover:shadow-md`}>
            <div className="text-3xl mb-2">{icon}</div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm opacity-75 mt-1">{title}</div>
        </div>
    );

    return link ? <Link to={link}>{content}</Link> : content;
}

export default function Dashboard() {
    const [stats, setStats] = useState({
        todayAppointments: 0,
        todayPaid: 0,
        todayUnpaid: 0,
        todayIncome: 0,
        alertsCount: 0,
        patientsCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const today = new Date().toISOString().split('T')[0];

        try {
            // Fetch today's appointments
            const apptRes = await fetch(`${API_BASE_URL}/appointments?date=${today}`, { credentials: 'include', headers: getAuthHeaders() });
            if (apptRes.ok) {
                const appointments = await apptRes.json();
                const paid = appointments.filter(a => a.payment_status === 'PAID').length;
                const unpaid = appointments.filter(a => a.payment_status === 'UNPAID').length;

                setStats(prev => ({
                    ...prev,
                    todayAppointments: appointments.length,
                    todayPaid: paid,
                    todayUnpaid: unpaid
                }));
            }

            // Fetch today's income
            const dailyRes = await fetch(`${API_BASE_URL}/financial-events/daily-summary?date=${today}`, { credentials: 'include', headers: getAuthHeaders() });
            if (dailyRes.ok) {
                const summary = await dailyRes.json();
                setStats(prev => ({
                    ...prev,
                    todayIncome: summary.income?.total || 0
                }));
            }

            // Fetch inventory alerts
            const alertsRes = await fetch(`${API_BASE_URL}/inventory/alerts?threshold=30`, { credentials: 'include', headers: getAuthHeaders() });
            if (alertsRes.ok) {
                const alerts = await alertsRes.json();
                setStats(prev => ({
                    ...prev,
                    alertsCount: (alerts.alerts || []).length
                }));
            }

            // Fetch patients count
            const patientsRes = await fetch(`${API_BASE_URL}/patients`, { credentials: 'include', headers: getAuthHeaders() });
            if (patientsRes.ok) {
                const data = await patientsRes.json();
                setStats(prev => ({
                    ...prev,
                    patientsCount: (data.patients || []).length
                }));
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="text-slate-500">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-2">Welcome to Yomchi Healthcare. Here's your overview for today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Today's Appointments"
                    value={stats.todayAppointments}
                    icon="📅"
                    color="blue"
                    link="/appointments"
                />
                <StatCard
                    title="Paid Today"
                    value={stats.todayPaid}
                    icon="💰"
                    color="green"
                    link="/appointments"
                />
                <StatCard
                    title="Unpaid Today"
                    value={stats.todayUnpaid}
                    icon="⏳"
                    color={stats.todayUnpaid > 0 ? 'yellow' : 'green'}
                    link="/appointments"
                />
                <StatCard
                    title="Total Patients"
                    value={stats.patientsCount}
                    icon="👥"
                    color="purple"
                    link="/patients"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Today's Income</h3>
                    <div className="text-4xl font-bold text-green-600">
                        {stats.todayIncome.toLocaleString()} <span className="text-lg font-normal">IQD</span>
                    </div>
                    <Link to="/daily-summary" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                        View detailed summary →
                    </Link>
                </div>

                <div className={`rounded-xl border p-6 ${stats.alertsCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Inventory Alerts</h3>
                    {stats.alertsCount > 0 ? (
                        <>
                            <div className="text-4xl font-bold text-red-600">{stats.alertsCount}</div>
                            <Link to="/inventory-alerts" className="text-sm text-red-600 hover:underline mt-2 inline-block">
                                ⚠️ View alerts →
                            </Link>
                        </>
                    ) : (
                        <div className="text-green-700 font-medium">✓ No alerts</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/appointments/new" className="block p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-center">
                    <div className="text-2xl mb-2">📅</div>
                    <div className="font-semibold">New Appointment</div>
                </Link>
                <Link to="/patients/new" className="block p-6 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-center">
                    <div className="text-2xl mb-2">👤</div>
                    <div className="font-semibold">Add Patient</div>
                </Link>
                <Link to="/inventory-dispense" className="block p-6 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-center">
                    <div className="text-2xl mb-2">💊</div>
                    <div className="font-semibold">Dispense Stock</div>
                </Link>
            </div>
        </div>
    );
}
