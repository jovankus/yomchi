import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function MonthlyReport() {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [salaryLoading, setSalaryLoading] = useState(false);
    const [salaryMessage, setSalaryMessage] = useState('');

    // Doctor Cuts state
    const [doctorCuts, setDoctorCuts] = useState(null);
    const [doctorCutsLoading, setDoctorCutsLoading] = useState(false);
    const [showDoctorCutsDetails, setShowDoctorCutsDetails] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/financial-events/monthly-report?year=${selectedYear}&month=${selectedMonth}`,
                { withCredentials: true }
            );
            setReport(response.data);
        } catch (error) {
            console.error('Error fetching report:', error);
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedMonth]);

    // Auto-load on mount and when period changes
    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleGenerateSalaries = async () => {
        setSalaryLoading(true);
        setSalaryMessage('');
        try {
            const response = await axios.post(
                `${API_BASE_URL}/financial-events/monthly-salaries`,
                { year: selectedYear, month: selectedMonth },
                { withCredentials: true }
            );
            setSalaryMessage(`✅ ${response.data.message}`);
            // Refresh report
            fetchReport();
            setTimeout(() => setSalaryMessage(''), 5000);
        } catch (error) {
            console.error('Error generating salaries:', error);
            setSalaryMessage(`❌ ${error.response?.data?.error || 'Failed to generate salaries'}`);
        } finally {
            setSalaryLoading(false);
        }
    };

    const handleCalculateDoctorCuts = async () => {
        setDoctorCutsLoading(true);
        setDoctorCuts(null);
        try {
            const monthStr = String(selectedMonth).padStart(2, '0');
            const response = await axios.get(
                `${API_BASE_URL}/financial-events/doctor-cuts?month=${selectedYear}-${monthStr}`,
                { withCredentials: true }
            );
            setDoctorCuts(response.data);
        } catch (error) {
            console.error('Error calculating doctor cuts:', error);
            setDoctorCuts({ error: error.response?.data?.error || 'Failed to calculate' });
        } finally {
            setDoctorCutsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">📈 Monthly Accounting Report</h1>

            {/* Period Selector */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm font-medium mb-1">Month</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="w-full border rounded px-3 py-2"
                    >
                        {months.map((month, idx) => (
                            <option key={idx} value={idx + 1}>{month}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-[100px]">
                    <label className="block text-sm font-medium mb-1">Year</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full border rounded px-3 py-2"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                    {loading ? (
                        <><span className="animate-spin">⟳</span> Loading...</>
                    ) : (
                        <>🔄 Refresh</>
                    )}
                </button>
                <button
                    onClick={handleGenerateSalaries}
                    disabled={salaryLoading}
                    className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                    {salaryLoading ? (
                        <><span className="animate-spin">⟳</span> Processing...</>
                    ) : (
                        <>💼 Generate Salaries</>
                    )}
                </button>
                <button
                    onClick={handleCalculateDoctorCuts}
                    disabled={doctorCutsLoading}
                    className="bg-teal-600 text-white px-6 py-2 rounded hover:bg-teal-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                    {doctorCutsLoading ? (
                        <><span className="animate-spin">⟳</span> Calculating...</>
                    ) : (
                        <>💰 Calculate Doctor Cuts</>
                    )}
                </button>
            </div>

            {/* Salary Message */}
            {salaryMessage && (
                <div className={`p-4 rounded-lg mb-6 ${salaryMessage.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {salaryMessage}
                </div>
            )}

            {/* Doctor Cuts Result */}
            {doctorCuts && !doctorCuts.error && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-teal-800">👨‍⚕️ Doctor Cuts Owed — {doctorCuts.period}</h3>
                        <button
                            onClick={() => setShowDoctorCutsDetails(!showDoctorCutsDetails)}
                            className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                        >
                            {showDoctorCutsDetails ? '▲ Hide Details' : '▼ Show Details'}
                        </button>
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-teal-500">
                            <div className="text-sm text-slate-600">Total Owed</div>
                            <div className="text-2xl font-bold text-teal-700">{doctorCuts.total_owed.toLocaleString()} IQD</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-sm text-slate-600">Sessions</div>
                            <div className="text-xl font-bold text-slate-800">{doctorCuts.session_count}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-sm text-slate-600 flex items-center gap-1">🏥 In-Clinic</div>
                            <div className="text-lg font-semibold text-slate-800">{doctorCuts.breakdown.in_clinic.total.toLocaleString()} IQD</div>
                            <div className="text-xs text-slate-500">{doctorCuts.breakdown.in_clinic.count} session{doctorCuts.breakdown.in_clinic.count !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-sm text-slate-600 flex items-center gap-1">💻 Online</div>
                            <div className="text-lg font-semibold text-slate-800">{doctorCuts.breakdown.online.total.toLocaleString()} IQD</div>
                            <div className="text-xs text-slate-500">{doctorCuts.breakdown.online.count} session{doctorCuts.breakdown.online.count !== 1 ? 's' : ''}</div>
                        </div>
                    </div>

                    {/* Session Details Table */}
                    {showDoctorCutsDetails && doctorCuts.sessions.length > 0 && (
                        <div className="bg-white rounded-lg overflow-hidden border">
                            <table className="w-full text-sm">
                                <thead className="bg-teal-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-teal-800">Date</th>
                                        <th className="px-4 py-2 text-left font-semibold text-teal-800">Patient</th>
                                        <th className="px-4 py-2 text-left font-semibold text-teal-800">Type</th>
                                        <th className="px-4 py-2 text-center font-semibold text-teal-800">Cut %</th>
                                        <th className="px-4 py-2 text-right font-semibold text-teal-800">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {doctorCuts.sessions.map(session => (
                                        <tr key={session.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2">{session.date}</td>
                                            <td className="px-4 py-2">{session.patient_name}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${session.session_type === 'IN_CLINIC'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {session.session_type === 'IN_CLINIC' ? '🏥 In-Clinic' : '💻 Online'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-center">{session.cut_percent || '—'}%</td>
                                            <td className="px-4 py-2 text-right font-semibold">{session.amount.toLocaleString()} IQD</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showDoctorCutsDetails && doctorCuts.sessions.length === 0 && (
                        <div className="bg-white rounded-lg p-4 text-center text-slate-500">
                            No doctor cut sessions found for this month.
                        </div>
                    )}

                    <div className="mt-4 text-xs text-teal-600">
                        ⓘ This is a report only — cuts have not been marked as paid out.
                    </div>
                </div>
            )}

            {doctorCuts?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
                    ❌ {doctorCuts.error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <p className="text-gray-500 text-lg">Loading monthly report...</p>
                </div>
            )}

            {/* Report Display */}
            {report && !loading && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-8 rounded-lg shadow-lg">
                        <h2 className="text-3xl font-bold mb-2">{report.period}</h2>
                        <p className="text-purple-100">Complete Financial Report</p>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded shadow">
                            <div className="text-sm text-green-700 font-medium">Total Income</div>
                            <div className="text-3xl font-bold text-green-900">{report.income.total.toLocaleString()} IQD</div>
                            <div className="text-sm text-green-600 mt-1">{report.income.count} transaction(s)</div>
                        </div>
                        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded shadow">
                            <div className="text-sm text-red-700 font-medium">Total Expenses</div>
                            <div className="text-3xl font-bold text-red-900">{report.expenses.total.toLocaleString()} IQD</div>
                            <div className="text-sm text-red-600 mt-1">{report.expenses.count} transaction(s)</div>
                        </div>
                        <div className={`${report.net_profit >= 0 ? 'bg-blue-50 border-blue-500' : 'bg-orange-50 border-orange-500'} border-l-4 p-6 rounded shadow`}>
                            <div className="text-sm font-medium">Net Profit</div>
                            <div className={`text-3xl font-bold ${report.net_profit >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                                {report.net_profit.toLocaleString()} IQD
                            </div>
                            <div className="text-sm mt-1">Margin: {report.profit_margin}%</div>
                        </div>
                    </div>

                    {/* Detailed Breakdown Table */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-gray-800 text-white px-6 py-4">
                            <h3 className="font-bold text-xl">📋 Detailed Breakdown</h3>
                        </div>
                        <div className="p-0">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {/* INCOME SECTION */}
                                    <tr className="bg-green-50">
                                        <td colSpan="2" className="px-6 py-3 font-bold text-green-800">💰 INCOME</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-3 pl-10">In-Clinic Sessions</td>
                                        <td className="px-6 py-3 text-right font-semibold text-green-600">+{report.income.in_clinic.toLocaleString()} IQD</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-3 pl-10">Online Sessions</td>
                                        <td className="px-6 py-3 text-right font-semibold text-green-600">+{report.income.online.toLocaleString()} IQD</td>
                                    </tr>
                                    <tr className="bg-green-100">
                                        <td className="px-6 py-3 font-bold">TOTAL INCOME</td>
                                        <td className="px-6 py-3 text-right font-bold text-green-700">+{report.income.total.toLocaleString()} IQD</td>
                                    </tr>

                                    {/* EXPENSES SECTION */}
                                    <tr className="bg-red-50">
                                        <td colSpan="2" className="px-6 py-3 font-bold text-red-800">💸 EXPENSES</td>
                                    </tr>

                                    {/* Doctor Cuts */}
                                    <tr>
                                        <td className="px-6 py-3 pl-10">👨‍⚕️ Doctor Cuts</td>
                                        <td className="px-6 py-3 text-right font-semibold text-red-600">-{report.expenses.doctor_cuts.toLocaleString()} IQD</td>
                                    </tr>

                                    {/* Secretary Costs */}
                                    <tr className="bg-indigo-50">
                                        <td className="px-6 py-3 pl-10 font-medium">👩‍💼 Secretary Costs (subtotal)</td>
                                        <td className="px-6 py-3 text-right font-semibold text-indigo-700">-{report.expenses.secretary_costs.total.toLocaleString()} IQD</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-3 pl-16 text-sm text-gray-600">• In-Clinic Secretary Salary</td>
                                        <td className="px-6 py-3 text-right text-sm text-gray-600">-{report.expenses.secretary_costs.breakdown.in_clinic_salary.toLocaleString()} IQD</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-3 pl-16 text-sm text-gray-600">• Online Secretary Base Salary</td>
                                        <td className="px-6 py-3 text-right text-sm text-gray-600">-{report.expenses.secretary_costs.breakdown.online_base_salary.toLocaleString()} IQD</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-3 pl-16 text-sm text-gray-600">• Online Session Cuts (10%)</td>
                                        <td className="px-6 py-3 text-right text-sm text-gray-600">-{report.expenses.secretary_costs.breakdown.online_session_cuts.toLocaleString()} IQD</td>
                                    </tr>

                                    {/* Dynamic Expenses */}
                                    {report.expenses.dynamic_expenses.total > 0 && (
                                        <>
                                            <tr className="bg-orange-50">
                                                <td className="px-6 py-3 pl-10 font-medium">📝 Other Expenses (subtotal)</td>
                                                <td className="px-6 py-3 text-right font-semibold text-orange-700">-{report.expenses.dynamic_expenses.total.toLocaleString()} IQD</td>
                                            </tr>
                                            {Object.entries(report.expenses.dynamic_expenses.breakdown).map(([category, amount]) => (
                                                <tr key={category}>
                                                    <td className="px-6 py-3 pl-16 text-sm text-gray-600">• {category.replace(/_/g, ' ')}</td>
                                                    <td className="px-6 py-3 text-right text-sm text-gray-600">-{amount.toLocaleString()} IQD</td>
                                                </tr>
                                            ))}
                                        </>
                                    )}

                                    <tr className="bg-red-100">
                                        <td className="px-6 py-3 font-bold">TOTAL EXPENSES</td>
                                        <td className="px-6 py-3 text-right font-bold text-red-700">-{report.expenses.total.toLocaleString()} IQD</td>
                                    </tr>

                                    {/* NET PROFIT */}
                                    <tr className={`${report.net_profit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                                        <td className="px-6 py-4 font-bold text-lg">📊 NET PROFIT</td>
                                        <td className={`px-6 py-4 text-right font-bold text-xl ${report.net_profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                                            {report.net_profit >= 0 ? '+' : ''}{report.net_profit.toLocaleString()} IQD
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="font-bold text-lg mb-4">📊 Summary Statistics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-gray-800">{report.summary.total_days_with_activity}</div>
                                <div className="text-sm text-gray-600">Days with Activity</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-gray-800">{report.summary.total_events}</div>
                                <div className="text-sm text-gray-600">Total Events</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-green-700">{report.income.count}</div>
                                <div className="text-sm text-gray-600">Income Events</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-red-700">{report.expenses.count}</div>
                                <div className="text-sm text-gray-600">Expense Events</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!report && !loading && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <p className="text-gray-500 text-lg">No data available for this period</p>
                </div>
            )}
        </div>
    );
}
