import { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { API_BASE_URL } from '../config';

const InventoryBatches = () => {
    const { selectedPharmacyId } = usePharmacy();
    const [batches, setBatches] = useState([]);
    const [items, setItems] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [formData, setFormData] = useState({
        pharmacy_id: '',
        item_id: '',
        supplier_id: '',
        batch_no: '',
        expiry_date: '',
        qty_received_units: '',
        purchase_unit_price: '',
        sale_unit_price: '',
        notes: ''
    });

    useEffect(() => {
        if (selectedPharmacyId) {
            setFormData(prev => ({ ...prev, pharmacy_id: selectedPharmacyId }));
            fetchBatches(selectedPharmacyId);
        } else {
            setBatches([]);
        }
    }, [selectedPharmacyId]);

    useEffect(() => {
        fetchItems();
        fetchSuppliers();
    }, []);

    const fetchBatches = async (pharmacyId) => {
        if (!pharmacyId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/inventory/batches?pharmacy_id=${pharmacyId}`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setBatches(data);
            }
        } catch (err) {
            console.error('Failed to fetch batches', err);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/inventory/items`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (err) {
            console.error('Failed to fetch items', err);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/suppliers`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data);
            }
        } catch (err) {
            console.error('Failed to fetch suppliers', err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const resetForm = () => {
        setFormData({
            pharmacy_id: selectedPharmacyId || '',
            item_id: '',
            supplier_id: '',
            batch_no: '',
            expiry_date: '',
            qty_received_units: '',
            purchase_unit_price: '',
            sale_unit_price: '',
            notes: ''
        });
        setMessage('');
    };

    const handleOpenModal = () => {
        if (!selectedPharmacyId) {
            setMessage('Please select a pharmacy first');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        resetForm();
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const res = await fetch(`${API_BASE_URL}/inventory/batches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (res.ok) {
                setMessage('Stock received successfully');
                setTimeout(() => setMessage(''), 3000);
                setShowModal(false);
                resetForm();
                fetchBatches(selectedPharmacyId);
            } else {
                const data = await res.json();
                setMessage('Error: ' + (data.error || 'Failed to receive stock'));
                setTimeout(() => setMessage(''), 5000);
            }
        } catch (err) {
            setMessage('Error: ' + err.message);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const formatCurrency = (value) => {
        return value ? `$${parseFloat(value).toFixed(2)}` : '-';
    };

    const getItemDisplay = (batch) => {
        let display = batch.generic_name;
        if (batch.brand_name) display += ` (${batch.brand_name})`;
        if (batch.strength_mg && batch.strength_unit) {
            display += ` - ${batch.strength_mg}${batch.strength_unit}`;
        }
        if (batch.form) display += ` ${batch.form}`;
        return display;
    };

    // Calculate expiry status
    const getExpiryStatus = (expiryDate) => {
        if (!expiryDate) return { status: 'unknown', label: 'No Expiry', color: 'slate' };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) return { status: 'expired', label: 'Expired', color: 'red', days: daysUntil };
        if (daysUntil <= 30) return { status: 'critical', label: `${daysUntil}d`, color: 'red', days: daysUntil };
        if (daysUntil <= 90) return { status: 'warning', label: `${daysUntil}d`, color: 'amber', days: daysUntil };
        if (daysUntil <= 180) return { status: 'caution', label: `${daysUntil}d`, color: 'yellow', days: daysUntil };
        return { status: 'ok', label: `${daysUntil}d`, color: 'emerald', days: daysUntil };
    };

    // Calculate summary stats
    const totalOnHand = batches.reduce((sum, b) => sum + (b.qty_on_hand_units || 0), 0);
    const expiringSoonCount = batches.filter(b => {
        const status = getExpiryStatus(b.expiry_date);
        return status.status === 'critical' || status.status === 'warning';
    }).length;
    const lowStockCount = batches.filter(b => b.qty_on_hand_units > 0 && b.qty_on_hand_units <= 10).length;
    const outOfStockCount = batches.filter(b => b.qty_on_hand_units === 0).length;

    // Expiry Badge Component
    const ExpiryBadge = ({ expiryDate }) => {
        const { label, color, status } = getExpiryStatus(expiryDate);
        const colorClasses = {
            red: 'bg-red-100 text-red-700 border-red-200',
            amber: 'bg-amber-100 text-amber-700 border-amber-200',
            yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            slate: 'bg-slate-100 text-slate-500 border-slate-200'
        };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClasses[color]}`}>
                {status === 'expired' ? '⚠️ ' : ''}{label}
            </span>
        );
    };

    // Batch Card Component
    const BatchCard = ({ batch }) => {
        const expiryStatus = getExpiryStatus(batch.expiry_date);
        const isLowStock = batch.qty_on_hand_units > 0 && batch.qty_on_hand_units <= 10;
        const isOutOfStock = batch.qty_on_hand_units === 0;

        return (
            <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 ${expiryStatus.status === 'expired' ? 'border-red-300 bg-red-50/30' :
                    expiryStatus.status === 'critical' ? 'border-red-200' :
                        expiryStatus.status === 'warning' ? 'border-amber-200' :
                            'border-slate-200'
                }`}>
                {/* Header: Item Name + Expiry Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-semibold text-slate-800 text-sm leading-snug flex-1">
                        {getItemDisplay(batch)}
                    </h3>
                    <ExpiryBadge expiryDate={batch.expiry_date} />
                </div>

                {/* Batch Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Batch No */}
                    <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Batch No</div>
                        <div className="font-mono font-semibold text-slate-700">{batch.batch_no}</div>
                    </div>

                    {/* Expiry Date */}
                    <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Expiry</div>
                        <div className={`font-medium ${expiryStatus.color === 'red' ? 'text-red-600' : 'text-slate-700'}`}>
                            {formatDate(batch.expiry_date)}
                        </div>
                    </div>

                    {/* On Hand */}
                    <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">On Hand</div>
                        <div className={`font-bold text-lg ${isOutOfStock ? 'text-red-500' :
                                isLowStock ? 'text-amber-600' :
                                    'text-slate-800'
                            }`}>
                            {batch.qty_on_hand_units}
                            {isOutOfStock && <span className="text-xs font-normal ml-1 text-red-400">Out</span>}
                            {isLowStock && !isOutOfStock && <span className="text-xs font-normal ml-1 text-amber-500">Low</span>}
                        </div>
                    </div>

                    {/* Supplier */}
                    <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Supplier</div>
                        <div className="text-slate-600 truncate" title={batch.supplier_name}>{batch.supplier_name}</div>
                    </div>
                </div>

                {/* Footer: Prices */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <div className="text-xs">
                        <span className="text-slate-400">Buy:</span>
                        <span className="font-mono font-medium text-slate-600 ml-1">{formatCurrency(batch.purchase_unit_price)}</span>
                    </div>
                    <div className="text-xs">
                        <span className="text-slate-400">Sell:</span>
                        <span className="font-mono font-semibold text-emerald-600 ml-1">{formatCurrency(batch.sale_unit_price)}</span>
                    </div>
                </div>

                {/* Notes (if any) */}
                {batch.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-400 truncate" title={batch.notes}>
                            📝 {batch.notes}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Stock & Batches
                    </h1>
                    <p className="text-slate-500 mt-1">Manage inventory batches and stock levels</p>
                </div>
                <button
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                    onClick={handleOpenModal}
                >
                    + Receive Stock
                </button>
            </div>

            {!selectedPharmacyId ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="text-5xl mb-4">🏪</div>
                    <p className="text-lg text-slate-600">Please select a pharmacy from the header dropdown to view batches.</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center hover:shadow-md transition-shadow">
                            <div className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {totalOnHand.toLocaleString()}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-1">Total On Hand</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center hover:shadow-md transition-shadow">
                            <div className="text-3xl font-extrabold text-slate-700">
                                {batches.length}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-1">Total Batches</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-amber-500 border border-slate-200 p-5 text-center hover:shadow-md transition-shadow">
                            <div className="text-3xl font-extrabold text-amber-600">
                                {expiringSoonCount}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-1">Expiring Soon</div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-red-500 border border-slate-200 p-5 text-center hover:shadow-md transition-shadow">
                            <div className="text-3xl font-extrabold text-red-600">
                                {outOfStockCount}
                            </div>
                            <div className="text-sm font-medium text-slate-500 mt-1">Out of Stock</div>
                        </div>
                    </div>

                    {/* View Toggle + Batch Count */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{batches.length}</span> batches
                        </div>
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-800'
                                    }`}
                            >
                                ▦ Grid
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-800'
                                    }`}
                            >
                                ☰ Table
                            </button>
                        </div>
                    </div>

                    {batches.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                            <div className="text-5xl mb-4">📦</div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">No batches found</h3>
                            <p className="text-slate-500">Click "Receive Stock" to add inventory to this pharmacy.</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* Grid View */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {batches.map(batch => (
                                <BatchCard key={batch.id} batch={batch} />
                            ))}
                        </div>
                    ) : (
                        /* Table View */
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Item</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Batch No</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Supplier</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Expiry</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">On Hand</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Buy Price</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Sell Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {batches.map((batch, idx) => {
                                            const expiryStatus = getExpiryStatus(batch.expiry_date);
                                            const isLowStock = batch.qty_on_hand_units > 0 && batch.qty_on_hand_units <= 10;
                                            const isOutOfStock = batch.qty_on_hand_units === 0;
                                            return (
                                                <tr key={batch.id} className={`hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-25' : ''}`}>
                                                    <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[250px]">
                                                        {getItemDisplay(batch)}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-600">
                                                        {batch.batch_no}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-600">
                                                        {batch.supplier_name}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={expiryStatus.color === 'red' ? 'text-red-600' : 'text-slate-600'}>
                                                                {formatDate(batch.expiry_date)}
                                                            </span>
                                                            <ExpiryBadge expiryDate={batch.expiry_date} />
                                                        </div>
                                                    </td>
                                                    <td className={`px-4 py-3.5 text-right font-bold ${isOutOfStock ? 'text-red-500' :
                                                            isLowStock ? 'text-amber-600' :
                                                                'text-slate-800'
                                                        }`}>
                                                        {batch.qty_on_hand_units}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                                                        {formatCurrency(batch.purchase_unit_price)}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-600">
                                                        {formatCurrency(batch.sale_unit_price)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Receive Stock Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-800">Receive Stock</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Inventory Item *
                                    </label>
                                    <select
                                        name="item_id"
                                        value={formData.item_id}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select an item...</option>
                                        {items.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.generic_name}
                                                {item.brand_name && ` (${item.brand_name})`}
                                                {item.strength_mg && ` - ${item.strength_mg}${item.strength_unit}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Supplier *
                                    </label>
                                    <select
                                        name="supplier_id"
                                        value={formData.supplier_id}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select supplier...</option>
                                        {suppliers.map(supplier => (
                                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Batch Number *
                                    </label>
                                    <input
                                        name="batch_no"
                                        value={formData.batch_no}
                                        onChange={handleChange}
                                        placeholder="e.g., BATCH001"
                                        required
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={formData.expiry_date}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Quantity Received (Units) *
                                    </label>
                                    <input
                                        type="number"
                                        name="qty_received_units"
                                        value={formData.qty_received_units}
                                        onChange={handleChange}
                                        min="1"
                                        required
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Purchase Price (per unit) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="purchase_unit_price"
                                        value={formData.purchase_unit_price}
                                        onChange={handleChange}
                                        min="0"
                                        required
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Sale Price (per unit) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="sale_unit_price"
                                        value={formData.sale_unit_price}
                                        onChange={handleChange}
                                        min="0"
                                        required
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Notes
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Optional notes about this batch..."
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Receive Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Message */}
            {message && (
                <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg text-white font-medium animate-fade-in ${message.includes('Error') ? 'bg-red-500' : 'bg-slate-800'
                    }`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default InventoryBatches;
