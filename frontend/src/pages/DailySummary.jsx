import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axiosConfig';
import { API_BASE_URL } from '../api/apiUtils';

export default function DailySummary() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Add Expense form state
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        event_date: new Date().toISOString().split('T')[0],
        category: '',
        amount: '',
        description: ''
    });
    const [expenseLoading, setExpenseLoading] = useState(false);
    const [expenseSuccess, setExpenseSuccess] = useState('');
    const [expenseError, setExpenseError] = useState('');

    const expenseCategories = [
        'RENT',
        'UTILITIES',
        'SUPPLIES',
        'EQUIPMENT',
        'MAINTENANCE',
        'MARKETING',
        'INSURANCE',
        'LICENSES',
        'TRANSPORT',
        'FOOD',
        'OTHER'
    ];

    const fetchSummary = useCallback(async (date) => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/financial-events/daily-summary?date=${date}`,
                { withCredentials: true }
            );
            setSummary(response.data);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Error fetching summary:', error);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch on page load and when date changes
    useEffect(() => {
        fetchSummary(selectedDate);
    }, [selectedDate, fetchSummary]);

    const handleRefresh = () => {
        fetchSummary(selectedDate);
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        setExpenseLoading(true);
        setExpenseError('');
        setExpenseSuccess('');

        try {
            const response = await axios.post(
                `${API_BASE_URL}/financial-events`,
                {
                    event_date: expenseForm.event_date,
                    event_type: 'EXPENSE',
                    category: expenseForm.category,
                    amount: parseFloat(expenseForm.amount),
                    description: expenseForm.description || null,
                    reference_type: 'EXPENSE',
                    reference_id: null
                },
                { withCredentials: true }
            );

            if (response.data.financial_event) {
                setExpenseSuccess(`✅ Expense added: ${parseFloat(expenseForm.amount).toLocaleString()} IQD`);

                // Reset form
                setExpenseForm({
                    event_date: new Date().toISOString().split('T')[0],
                    category: '',
                    amount: '',
                    description: ''
                });

                // Refresh the summary if viewing the same date
                if (selectedDate === expenseForm.event_date) {
                    fetchSummary(selectedDate);
                }

                // Hide success after 3 seconds
                setTimeout(() => {
                    setExpenseSuccess('');
                    setShowExpenseForm(false);
                }, 2000);
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            setExpenseError(error.response?.data?.message || 'Failed to add expense');
        } finally {
            setExpenseLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">📊 Daily Accounting Ledger</h1>

            {/* Date Selector & Controls */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium mb-1">Select Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin">⟳</span> Loading...
                        </>
                    ) : (
                        <>🔄 Refresh</>
                    )}
                </button>
                <button
                    onClick={() => setShowExpenseForm(!showExpenseForm)}
                    className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 flex items-center gap-2"
                >
                    {showExpenseForm ? '✕ Cancel' : '➕ Add Expense'}
                </button>
                {lastUpdated && (
                    <span className="text-sm text-gray-500">
                        Last updated: {lastUpdated}
                    </span>
                )}
            </div>

            {/* Add Expense Form */}
            {showExpenseForm && (
                <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border-2 border-red-200">
                    <h3 className="text-lg font-bold mb-4 text-red-700 flex items-center gap-2">
                        💸 Add One-Time Expense
                    </h3>

                    {expenseSuccess && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                            {expenseSuccess}
                        </div>
                    )}
                    {expenseError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {expenseError}
                        </div>
                    )}

                    <form onSubmit={handleExpenseSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={expenseForm.event_date}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, event_date: e.target.value })}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category *
                                </label>
                                <select
                                    value={expenseForm.category}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    required
                                >
                                    <option value="">-- Select Category --</option>
                                    {expenseCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount (IQD) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    placeholder="e.g., 50000"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    placeholder="e.g., Office supplies from store"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={expenseLoading}
                                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
                            >
                                {expenseLoading ? (
                                    <>
                                        <span className="animate-spin">⟳</span> Adding...
                                    </>
                                ) : (
                                    <>💸 Add Expense</>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowExpenseForm(false)}
                                className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Loading State */}
            {loading && !summary && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <p className="text-gray-500 text-lg">Loading daily ledger...</p>
                </div>
            )}

            {/* Summary Display */}
            {summary && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold">Daily Ledger - {summary.date}</h2>
                        <p className="text-blue-100 mt-1">Real-time financial events for this day</p>
                    </div>

                    {/* Summary Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Income Card */}
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden border-l-4 border-green-500">
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Income</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {summary.income.total.toLocaleString()} IQD
                                        </p>
                                    </div>
                                    <div className="text-3xl">💰</div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{summary.income.count} event(s)</p>
                            </div>
                        </div>

                        {/* Expenses Card */}
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden border-l-4 border-red-500">
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {summary.expenses.total.toLocaleString()} IQD
                                        </p>
                                    </div>
                                    <div className="text-3xl">💸</div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{summary.expenses.count} event(s)</p>
                            </div>
                        </div>

                        {/* Net Profit Card */}
                        <div className={`bg-white rounded-lg shadow-lg overflow-hidden border-l-4 ${summary.net_profit >= 0 ? 'border-blue-500' : 'border-orange-500'
                            }`}>
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Net Profit</p>
                                        <p className={`text-2xl font-bold ${summary.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'
                                            }`}>
                                            {summary.net_profit.toLocaleString()} IQD
                                        </p>
                                    </div>
                                    <div className="text-3xl">{summary.net_profit >= 0 ? '📈' : '📉'}</div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    {summary.net_profit >= 0 ? '✅ Profitable' : '⚠️ Loss'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Income Breakdown */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-green-600 text-white px-6 py-3 flex justify-between items-center">
                            <h3 className="font-bold text-lg">💰 Income Breakdown</h3>
                            <span className="text-xl font-bold">{summary.income.total.toLocaleString()} IQD</span>
                        </div>
                        <div className="p-6">
                            {Object.keys(summary.income.breakdown).length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No income for this day</p>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(summary.income.breakdown).map(([category, amount]) => (
                                        <div key={category} className="flex justify-between items-center py-2 border-b">
                                            <span className="font-medium">{category.replace(/_/g, ' ')}</span>
                                            <span className="text-green-600 font-bold">{amount.toLocaleString()} IQD</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expense Breakdown */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-red-600 text-white px-6 py-3 flex justify-between items-center">
                            <h3 className="font-bold text-lg">💸 Expense Breakdown</h3>
                            <span className="text-xl font-bold">{summary.expenses.total.toLocaleString()} IQD</span>
                        </div>
                        <div className="p-6">
                            {Object.keys(summary.expenses.breakdown).length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No expenses for this day</p>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(summary.expenses.breakdown).map(([category, amount]) => (
                                        <div key={category} className="flex justify-between items-center py-2 border-b">
                                            <span className="font-medium">{category.replace(/_/g, ' ')}</span>
                                            <span className="text-red-600 font-bold">{amount.toLocaleString()} IQD</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Events Table */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="bg-gray-800 text-white px-6 py-3">
                            <h3 className="font-bold text-lg">📋 All Financial Events (Sorted by Time)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            {(summary.events.income_events.length === 0 && summary.events.expense_events.length === 0) ? (
                                <p className="text-gray-500 text-center py-8">No financial events for this day</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {[...summary.events.income_events, ...summary.events.expense_events]
                                            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                                            .map((event) => (
                                                <tr key={event.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {event.created_at ? new Date(event.created_at).toLocaleTimeString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${event.event_type === 'INCOME'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {event.event_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {event.category?.replace(/_/g, ' ')}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                        {event.description || '-'}
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${event.event_type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {event.event_type === 'INCOME' ? '+' : '-'}{event.amount?.toLocaleString()} IQD
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* No Data State */}
            {!summary && !loading && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <p className="text-gray-500 text-lg">No data available for this date</p>
                </div>
            )}
        </div>
    );
}
