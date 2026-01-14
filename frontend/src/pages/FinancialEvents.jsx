import { useState, useEffect } from 'react';
import axios from '../api/axiosConfig';
import { API_BASE_URL } from '../config';

export default function FinancialEvents() {
    const [events, setEvents] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({
        event_date: new Date().toISOString().split('T')[0],
        category: 'HOSPITALITY',
        amount: '',
        description: ''
    });

    useEffect(() => {
        fetchEvents();
    }, [filter, startDate, endDate]);

    const fetchEvents = async () => {
        try {
            let url = `${API_BASE_URL}/financial-events?`;
            if (filter !== 'ALL') url += `event_type=${filter}&`;
            if (startDate) url += `start_date=${startDate}&`;
            if (endDate) url += `end_date=${endDate}`;

            const response = await axios.get(url, { withCredentials: true });
            setEvents(response.data.financial_events || []);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/financial-events`, {
                event_date: newExpense.event_date,
                event_type: 'EXPENSE',
                category: newExpense.category,
                amount: parseFloat(newExpense.amount),
                description: newExpense.description,
                reference_type: 'EXPENSE'
            }, { withCredentials: true });

            setShowAddExpense(false);
            setNewExpense({
                event_date: new Date().toISOString().split('T')[0],
                category: 'HOSPITALITY',
                amount: '',
                description: ''
            });
            fetchEvents();
        } catch (error) {
            console.error('Error adding expense:', error);
            alert('Failed to add expense');
        }
    };

    const totalIncome = events.filter(e => e.event_type === 'INCOME').reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = events.filter(e => e.event_type === 'EXPENSE').reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">💰 Financial Events</h1>
                <button
                    onClick={() => setShowAddExpense(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    + Add Expense
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                    <div className="text-sm text-green-700 font-medium">Total Income</div>
                    <div className="text-2xl font-bold text-green-900">{totalIncome.toLocaleString()} IQD</div>
                </div>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="text-sm text-red-700 font-medium">Total Expenses</div>
                    <div className="text-2xl font-bold text-red-900">{totalExpenses.toLocaleString()} IQD</div>
                </div>
                <div className={`${netProfit >= 0 ? 'bg-blue-50 border-blue-500' : 'bg-orange-50 border-orange-500'} border-l-4 p-4 rounded`}>
                    <div className="text-sm font-medium">Net Profit</div>
                    <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                        {netProfit.toLocaleString()} IQD
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-4 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    >
                        <option value="ALL">All Events</option>
                        <option value="INCOME">Income Only</option>
                        <option value="EXPENSE">Expenses Only</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                    />
                </div>
                <button
                    onClick={() => { setStartDate(''); setEndDate(''); setFilter('ALL'); }}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                    Clear
                </button>
            </div>

            {/* Events Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                    No financial events found
                                </td>
                            </tr>
                        ) : (
                            events.map(event => (
                                <tr key={event.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{event.event_date}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${event.event_type === 'INCOME'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {event.event_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{event.category.replace(/_/g, ' ')}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{event.description}</td>
                                    <td className={`px-4 py-3 text-sm text-right font-medium ${event.event_type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {event.event_type === 'INCOME' ? '+' : '-'}{event.amount.toLocaleString()} IQD
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Expense Modal */}
            {showAddExpense && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
                        <form onSubmit={handleAddExpense}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <input
                                    type="date"
                                    value={newExpense.event_date}
                                    onChange={(e) => setNewExpense({ ...newExpense, event_date: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <select
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="HOSPITALITY">Hospitality</option>
                                    <option value="PRINTER_SUPPLIES">Printer Supplies</option>
                                    <option value="PHONE_BILLS">Phone Bills</option>
                                    <option value="UTILITIES">Utilities</option>
                                    <option value="OFFICE_SUPPLIES">Office Supplies</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="EQUIPMENT">Equipment</option>
                                    <option value="TRANSPORTATION">Transportation</option>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Amount (IQD)</label>
                                <input
                                    type="number"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                    min="0"
                                    step="1"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    rows="3"
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    Add Expense
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddExpense(false)}
                                    className="flex-1 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
