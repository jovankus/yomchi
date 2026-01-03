import { useState, useEffect } from 'react';
import PageTitle from '../components/PageTitle';
import Card, { CardHeader, CardTitle, CardContent } from '../components/Card';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { API_BASE_URL } from '../config';

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', phone: '', address: '', notes: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/suppliers`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data);
            }
        } catch (err) {
            console.error('Failed to fetch suppliers', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const resetForm = () => {
        setFormData({ name: '', phone: '', address: '', notes: '' });
        setEditingId(null);
    };

    const handleOpenModal = (supplier = null) => {
        setMessage({ type: '', text: '' });
        if (supplier) {
            setFormData({
                name: supplier.name,
                phone: supplier.phone || '',
                address: supplier.address || '',
                notes: supplier.notes || ''
            });
            setEditingId(supplier.id);
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        const url = editingId
            ? `${API_BASE_URL}/suppliers/${editingId}`
            : `${API_BASE_URL}/suppliers`;
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (res.ok) {
                const successMsg = editingId ? 'Supplier updated successfully!' : 'Supplier created successfully!';
                setMessage({ type: 'success', text: successMsg });
                setShowModal(false);
                resetForm();
                fetchSuppliers();
                setTimeout(() => setMessage({ type: '', text: '' }), 4000);
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Error saving supplier' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            await fetch(`${API_BASE_URL}/suppliers/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            setMessage({ type: 'success', text: 'Supplier deleted successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            fetchSuppliers();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete supplier' });
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <PageTitle
                title="Suppliers"
                subtitle="Manage your medication and inventory suppliers"
                action={
                    <Button onClick={() => handleOpenModal()}>
                        <span className="flex items-center gap-2">
                            <span>➕</span>
                            Add Supplier
                        </span>
                    </Button>
                }
            />

            {/* Success/Error Banner */}
            {message.text && (
                <div className="mb-6">
                    <Alert
                        variant={message.type === 'success' ? 'success' : 'error'}
                        onClose={() => setMessage({ type: '', text: '' })}
                    >
                        {message.text}
                    </Alert>
                </div>
            )}

            {/* Suppliers Table Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-xl">🏭</span>
                            Supplier Directory
                        </CardTitle>
                        <span className="text-sm text-slate-500">
                            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-pulse text-4xl mb-4">⏳</div>
                            <p className="text-slate-500">Loading suppliers...</p>
                        </div>
                    ) : suppliers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-5xl mb-4 opacity-50">🏭</div>
                            <h3 className="text-lg font-semibold text-slate-600 mb-2">
                                No Suppliers Yet
                            </h3>
                            <p className="text-slate-500 mb-4">
                                Add your first supplier to get started.
                            </p>
                            <Button onClick={() => handleOpenModal()}>
                                <span className="flex items-center gap-2">
                                    <span>➕</span>
                                    Add First Supplier
                                </span>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Supplier Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Address
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Notes
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {suppliers.map(supplier => (
                                        <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                                        <span className="text-blue-600 font-bold text-sm">
                                                            {supplier.name.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="font-semibold text-slate-800">
                                                        {supplier.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {supplier.phone ? (
                                                    <span className="flex items-center gap-1.5 text-slate-600">
                                                        <span className="text-sm">📞</span>
                                                        {supplier.phone}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {supplier.address ? (
                                                    <span className="text-slate-600 text-sm">
                                                        📍 {supplier.address}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {supplier.notes ? (
                                                    <span className="text-slate-500 text-sm line-clamp-1" title={supplier.notes}>
                                                        {supplier.notes}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(supplier)}
                                                        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(supplier.id, supplier.name)}
                                                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <span>{editingId ? '✏️' : '➕'}</span>
                                    {editingId ? 'Edit Supplier' : 'New Supplier'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Supplier Name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Supplier Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. MedPharm Supplies"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Phone & Address Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        📞 Phone
                                    </label>
                                    <input
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+964 XXX XXX XXXX"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        📍 Address
                                    </label>
                                    <input
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="City, District"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    📝 Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Additional notes about this supplier..."
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleCloseModal}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving || !formData.name.trim()}
                                    className="flex-1"
                                >
                                    {saving ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin">⏳</span>
                                            Saving...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <span>✓</span>
                                            {editingId ? 'Save Changes' : 'Create Supplier'}
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
