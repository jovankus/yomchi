import { useState, useEffect } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import PageTitle from '../components/PageTitle';
import Card, { CardHeader, CardTitle, CardContent } from '../components/Card';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { Input } from '../components/Input';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';

const DispenseStock = () => {
    const { selectedPharmacyId, pharmacies } = usePharmacy();
    const [patients, setPatients] = useState([]);
    const [patientsLoading, setPatientsLoading] = useState(true);
    const [patientsError, setPatientsError] = useState('');
    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(true);

    const [formData, setFormData] = useState({
        pharmacy_id: '',
        patient_id: '',
        item_id: '',
        quantity: '',
        notes: ''
    });

    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Get selected pharmacy name
    const selectedPharmacy = pharmacies.find(p => p.id === parseInt(selectedPharmacyId));

    useEffect(() => {
        if (selectedPharmacyId) {
            setFormData(prev => ({ ...prev, pharmacy_id: selectedPharmacyId }));
        }
    }, [selectedPharmacyId]);

    useEffect(() => {
        fetchPatients();
        fetchItems();
    }, []);

    const fetchPatients = async () => {
        setPatientsLoading(true);
        setPatientsError('');
        try {
            const res = await fetch(`${API_BASE_URL}/patients`, { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                const patientsArray = Array.isArray(data) ? data : (data.patients || []);
                setPatients(Array.isArray(patientsArray) ? patientsArray : []);
            } else {
                setPatientsError('Failed to load patients');
            }
        } catch (err) {
            console.error('Failed to fetch patients', err);
            setPatientsError('Network error loading patients');
        } finally {
            setPatientsLoading(false);
        }
    };

    const fetchItems = async () => {
        setItemsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/inventory/items`, { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (err) {
            console.error('Failed to fetch items', err);
        } finally {
            setItemsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
        setResult(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setLoading(true);

        try {
            const payload = {
                pharmacy_id: parseInt(formData.pharmacy_id),
                item_id: parseInt(formData.item_id),
                quantity: parseInt(formData.quantity),
                notes: formData.notes
            };

            if (formData.patient_id) {
                payload.patient_id = parseInt(formData.patient_id);
            }

            const res = await fetch(`${API_BASE_URL}/inventory/dispense`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setResult(data);
                setFormData({
                    pharmacy_id: selectedPharmacyId || '',
                    patient_id: '',
                    item_id: '',
                    quantity: '',
                    notes: ''
                });
            } else {
                setError(data.error || 'Dispense failed');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getItemDisplay = (item) => {
        let display = item.generic_name;
        if (item.brand_name) display += ` (${item.brand_name})`;
        if (item.strength_mg && item.strength_unit) {
            display += ` - ${item.strength_mg}${item.strength_unit}`;
        }
        if (item.form) display += ` ${item.form}`;
        return display;
    };

    const getSelectedItem = () => {
        return items.find(item => item.id === parseInt(formData.item_id));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    // No pharmacy selected state
    if (!selectedPharmacyId) {
        return (
            <div className="max-w-4xl mx-auto">
                <PageTitle
                    title="Dispense / Sale"
                    subtitle="Dispense stock to patients or record over-the-counter sales"
                />
                <Card className="text-center py-12">
                    <div className="text-6xl mb-4">🏪</div>
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">
                        No Pharmacy Selected
                    </h3>
                    <p className="text-slate-500">
                        Please select a pharmacy from the header dropdown to dispense stock.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <PageTitle
                title="Dispense / Sale"
                subtitle="Dispense stock to patients or record over-the-counter sales"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dispense Form Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-2xl">💊</span>
                            {formData.patient_id ? 'Dispense to Patient' : 'Record Sale'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Section 1: Pharmacy (Read-only) */}
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Pharmacy
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🏪</span>
                                    <span className="text-lg font-semibold text-slate-800">
                                        {selectedPharmacy?.name || 'Loading...'}
                                    </span>
                                </div>
                            </div>

                            {/* Section 2: Patient */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                                    Patient (Optional)
                                </label>
                                {patientsError && (
                                    <Alert variant="warning" className="mb-3 py-2">
                                        {patientsError}
                                    </Alert>
                                )}
                                <select
                                    name="patient_id"
                                    value={formData.patient_id}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                                    disabled={patientsLoading}
                                >
                                    <option value="">
                                        {patientsLoading
                                            ? '⏳ Loading patients...'
                                            : '👤 No patient (Over-the-counter sale)'}
                                    </option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>
                                            👤 {p.first_name} {p.last_name}
                                        </option>
                                    ))}
                                </select>
                                {!patientsLoading && patients.length === 0 && !patientsError && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        No patients registered in the system.
                                    </p>
                                )}
                            </div>

                            {/* Section 3: Item Selection */}
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <label className="block text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">
                                    Medication / Item *
                                </label>
                                {itemsLoading ? (
                                    <div className="text-center py-4 text-slate-500">
                                        <span className="animate-pulse">⏳ Loading items...</span>
                                    </div>
                                ) : items.length === 0 ? (
                                    <Alert variant="warning" className="py-2">
                                        No items available in inventory.
                                    </Alert>
                                ) : (
                                    <select
                                        name="item_id"
                                        value={formData.item_id}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2.5 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-800"
                                    >
                                        <option value="">💊 Select medication...</option>
                                        {items.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {getItemDisplay(item)}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {getSelectedItem() && (
                                    <div className="mt-2 text-xs text-purple-700">
                                        Unit: {getSelectedItem().unit || 'units'}
                                    </div>
                                )}
                            </div>

                            {/* Section 4: Quantity */}
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <label className="block text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
                                    Quantity *
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        required
                                        min="1"
                                        className="flex-1 px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xl font-bold text-center bg-white"
                                        placeholder="0"
                                    />
                                    <span className="text-slate-600 font-medium">
                                        {getSelectedItem()?.unit || 'units'}
                                    </span>
                                </div>
                            </div>

                            {/* Notes (collapsed) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Notes (optional)
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    rows="2"
                                    placeholder="Additional notes..."
                                />
                            </div>

                            {/* Error Banner */}
                            {error && (
                                <Alert variant="error" onClose={() => setError('')}>
                                    <strong>Dispense Failed:</strong> {error}
                                </Alert>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={loading || !formData.item_id || !formData.quantity}
                                className="w-full py-3 text-base"
                                size="lg"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin">⏳</span>
                                        Processing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span>✅</span>
                                        {formData.patient_id ? 'Dispense Stock' : 'Record Sale'}
                                    </span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Result Card - Shows after successful dispense */}
                <div className={`transition-all duration-300 ${result ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {result ? (
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                            <CardHeader className="border-green-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl shadow-lg">
                                        ✓
                                    </div>
                                    <div>
                                        <CardTitle className="text-green-800">
                                            {result.message}
                                        </CardTitle>
                                        <p className="text-green-600 text-sm mt-1">
                                            Total dispensed: <strong>{result.total_quantity} units</strong>
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Batch Allocation Table */}
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span>📦</span>
                                        Batch Selection (FIFO)
                                    </h4>
                                    <div className="bg-white rounded-lg overflow-hidden border border-green-200 shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-green-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold text-green-800">Batch No</th>
                                                    <th className="px-4 py-3 text-right font-semibold text-green-800">Qty</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-green-800">Expiry</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-green-800">Supplier</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.allocations?.map((alloc, idx) => (
                                                    <tr key={idx} className="border-t border-green-100 hover:bg-green-50">
                                                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                                                            {alloc.batch_no}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="inline-flex items-center justify-center bg-green-100 text-green-800 font-bold px-2 py-1 rounded-full min-w-[2rem]">
                                                                {alloc.qty_allocated}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {formatDate(alloc.expiry_date)}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 text-xs">
                                                            {alloc.supplier_name || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Movement IDs */}
                                <div className="p-3 bg-green-100 rounded-lg text-xs text-green-700 flex items-center gap-2">
                                    <span>📝</span>
                                    <span>
                                        <strong>Movement IDs:</strong>{' '}
                                        {result.movements?.map(m => m.id).join(', ')}
                                    </span>
                                </div>

                                {/* New Dispense Button */}
                                <Button
                                    variant="secondary"
                                    className="w-full mt-4"
                                    onClick={() => setResult(null)}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>➕</span>
                                        New Dispense
                                    </span>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        /* Empty State - What to expect */
                        <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
                            <div className="text-center py-12">
                                <div className="text-5xl mb-4 opacity-50">📋</div>
                                <h3 className="text-lg font-semibold text-slate-500 mb-2">
                                    Batch Allocation Outcome
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    After dispensing, you'll see which batches were<br />
                                    selected using FIFO (First In, First Out).
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DispenseStock;
