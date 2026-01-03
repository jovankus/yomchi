import { useState, useEffect, useMemo } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { API_BASE_URL } from '../config';

const StockMovements = () => {
    const { selectedPharmacyId } = usePharmacy();
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        type: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(true);

    useEffect(() => {
        if (selectedPharmacyId) {
            fetchMovements(selectedPharmacyId);
        } else {
            setMovements([]);
        }
    }, [selectedPharmacyId]);

    const fetchMovements = async (pharmacyId) => {
        if (!pharmacyId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/inventory/movements?pharmacy_id=${pharmacyId}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setMovements(data);
            }
        } catch (err) {
            console.error('Failed to fetch movements', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter movements
    const filteredMovements = useMemo(() => {
        return movements.filter(m => {
            // Date range filter
            if (filters.dateFrom) {
                const movementDate = new Date(m.created_at).toISOString().split('T')[0];
                if (movementDate < filters.dateFrom) return false;
            }
            if (filters.dateTo) {
                const movementDate = new Date(m.created_at).toISOString().split('T')[0];
                if (movementDate > filters.dateTo) return false;
            }

            // Type filter
            if (filters.type && m.type !== filters.type) return false;

            // Search filter (item name, batch no, reference)
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const itemName = (m.generic_name || '').toLowerCase();
                const brandName = (m.brand_name || '').toLowerCase();
                const batchNo = (m.batch_no || '').toLowerCase();
                const reference = (m.reference || '').toLowerCase();

                if (!itemName.includes(searchLower) &&
                    !brandName.includes(searchLower) &&
                    !batchNo.includes(searchLower) &&
                    !reference.includes(searchLower)) {
                    return false;
                }
            }

            return true;
        });
    }, [movements, filters]);

    // Get unique types for filter dropdown
    const uniqueTypes = useMemo(() => {
        const types = [...new Set(movements.map(m => m.type))];
        return types.sort();
    }, [movements]);

    // Summary stats
    const stats = useMemo(() => {
        const receives = filteredMovements.filter(m => m.type === 'RECEIVE').length;
        const dispenses = filteredMovements.filter(m => m.type === 'DISPENSE' || m.type === 'SALE').length;
        const adjusts = filteredMovements.filter(m => m.type === 'ADJUST' || m.type === 'WASTE').length;
        const totalQtyChange = filteredMovements.reduce((sum, m) => sum + (m.qty_units || 0), 0);
        return { receives, dispenses, adjusts, totalQtyChange };
    }, [filteredMovements]);

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    };

    const formatCurrency = (value) => {
        return value ? `$${parseFloat(value).toFixed(2)}` : '-';
    };

    const getItemDisplay = (movement) => {
        let display = movement.generic_name;
        if (movement.brand_name) display += ` (${movement.brand_name})`;
        if (movement.strength_mg && movement.strength_unit) {
            display += ` - ${movement.strength_mg}${movement.strength_unit}`;
        }
        if (movement.form) display += ` ${movement.form}`;
        return display;
    };

    // Type Badge Component
    const TypeBadge = ({ type }) => {
        const styles = {
            RECEIVE: 'bg-emerald-500',
            ADJUST: 'bg-blue-500',
            WASTE: 'bg-red-500',
            DISPENSE: 'bg-purple-500',
            SALE: 'bg-amber-500'
        };
        const bgClass = styles[type] || 'bg-slate-500';

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide text-white ${bgClass}`}>
                {type}
            </span>
        );
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({ dateFrom: '', dateTo: '', type: '', search: '' });
    };

    const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.type || filters.search;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Stock Movements Ledger
                </h1>
                <p className="text-slate-500 mt-1">Complete audit trail of all inventory changes</p>
            </div>

            {!selectedPharmacyId ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-lg text-slate-600">Please select a pharmacy from the header dropdown to view movements.</p>
                </div>
            ) : loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-slate-600">Loading movements...</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-bold text-slate-700">{filteredMovements.length}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1">Total Records</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-emerald-500 border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-600">{stats.receives}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1">Receives</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-purple-500 border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.dispenses}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1">Dispenses/Sales</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.adjusts}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1">Adjustments</div>
                        </div>
                    </div>

                    {/* Filters Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
                        <div
                            className="flex justify-between items-center px-5 py-3 border-b border-slate-100 cursor-pointer"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🔍</span>
                                <span className="font-semibold text-slate-700">Filters</span>
                                {hasActiveFilters && (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                        Active
                                    </span>
                                )}
                            </div>
                            <button className="text-slate-400 hover:text-slate-600">
                                {showFilters ? '▲' : '▼'}
                            </button>
                        </div>

                        {showFilters && (
                            <div className="p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Date From */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                                            From Date
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.dateFrom}
                                            onChange={e => handleFilterChange('dateFrom', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    {/* Date To */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                                            To Date
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.dateTo}
                                            onChange={e => handleFilterChange('dateTo', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    {/* Type Filter */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Type
                                        </label>
                                        <select
                                            value={filters.type}
                                            onChange={e => handleFilterChange('type', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">All Types</option>
                                            {uniqueTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Search */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                                            Search
                                        </label>
                                        <input
                                            type="text"
                                            value={filters.search}
                                            onChange={e => handleFilterChange('search', e.target.value)}
                                            placeholder="Item, batch, reference..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                {hasActiveFilters && (
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={clearFilters}
                                            className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                                        >
                                            ✕ Clear Filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Movements Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">📊</span>
                                <h2 className="font-semibold text-slate-700">Movement History</h2>
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">
                                    {filteredMovements.length} records
                                </span>
                            </div>
                            <button
                                onClick={() => fetchMovements(selectedPharmacyId)}
                                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                ↻ Refresh
                            </button>
                        </div>

                        {filteredMovements.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-5xl mb-4">📭</div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">No movements found</h3>
                                <p className="text-slate-500">
                                    {hasActiveFilters
                                        ? 'Try adjusting your filters to see more results.'
                                        : 'Stock movements will appear here when batches are received or adjusted.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date/Time</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[220px]">Item</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Batch</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[180px]">Reference</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredMovements.map((movement, idx) => {
                                            const dt = formatDateTime(movement.created_at);
                                            const isPositive = movement.qty_units >= 0;
                                            return (
                                                <tr
                                                    key={movement.id}
                                                    className={`hover:bg-slate-50 transition-colors ${idx % 2 === 1 ? 'bg-slate-25' : ''}`}
                                                >
                                                    {/* Date/Time */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="text-sm font-medium text-slate-800">{dt.date}</div>
                                                        <div className="text-xs text-slate-400">{dt.time}</div>
                                                    </td>

                                                    {/* Type Badge */}
                                                    <td className="px-4 py-3.5">
                                                        <TypeBadge type={movement.type} />
                                                    </td>

                                                    {/* Item */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="font-medium text-slate-800">{getItemDisplay(movement)}</div>
                                                    </td>

                                                    {/* Batch */}
                                                    <td className="px-4 py-3.5">
                                                        <span className="font-mono text-sm font-semibold text-slate-600">
                                                            {movement.batch_no || '-'}
                                                        </span>
                                                    </td>

                                                    {/* Quantity */}
                                                    <td className="px-4 py-3.5 text-right">
                                                        <span className={`font-bold text-lg ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {isPositive ? '+' : ''}{movement.qty_units}
                                                        </span>
                                                    </td>

                                                    {/* Reference */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="text-sm text-slate-600 truncate max-w-[180px]" title={movement.reference}>
                                                            {movement.reference || '-'}
                                                        </div>
                                                        {movement.created_by && (
                                                            <div className="text-xs text-slate-400 mt-0.5">
                                                                by {movement.created_by}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Legend */}
                        {filteredMovements.length > 0 && (
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                                <span><span className="font-semibold text-emerald-600">+Positive</span> = Stock Increase</span>
                                <span><span className="font-semibold text-red-500">-Negative</span> = Stock Decrease</span>
                                <span className="ml-auto flex gap-2">
                                    <TypeBadge type="RECEIVE" />
                                    <TypeBadge type="DISPENSE" />
                                    <TypeBadge type="ADJUST" />
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default StockMovements;
