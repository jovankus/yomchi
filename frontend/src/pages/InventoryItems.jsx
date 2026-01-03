import { useState, useEffect } from 'react';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { Input, Select } from '../components/Input';
import Button from '../components/Button';
import Table, { TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/Table';
import { API_BASE_URL } from '../config';

const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

const InventoryItems = () => {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        generic_name: '', brand_name: '', manufacturer: '', form: '',
        strength_mg: '', strength_unit: 'mg', pack_size: '', barcode: ''
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async (term = '') => {
        try {
            const res = await fetch(`${API_BASE_URL}/inventory/items?search=${term}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (err) {
            console.error('Failed to fetch items', err);
        }
    };

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
        fetchItems(val);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const resetForm = () => {
        setFormData({
            generic_name: '', brand_name: '', manufacturer: '', form: '',
            strength_mg: '', strength_unit: 'mg', pack_size: '', barcode: ''
        });
        setEditingId(null);
        setMessage('');
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setFormData({
                generic_name: item.generic_name,
                brand_name: item.brand_name || '',
                manufacturer: item.manufacturer || '',
                form: item.form || '',
                strength_mg: item.strength_mg || '',
                strength_unit: item.strength_unit || 'mg',
                pack_size: item.pack_size || '',
                barcode: item.barcode || ''
            });
            setEditingId(item.id);
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        const url = editingId
            ? `${API_BASE_URL}/inventory/items/${editingId}`
            : `${API_BASE_URL}/inventory/items`;
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (res.ok) {
                const msg = editingId ? 'Item updated successfully' : 'Item created successfully';
                setMessage(msg);
                setTimeout(() => setMessage(''), 3000);
                setShowModal(false);
                resetForm();
                fetchItems(search);
            } else {
                setMessage('Error saving item');
            }
        } catch (err) {
            setMessage('Error: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await fetch(`${API_BASE_URL}/inventory/items/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            fetchItems(search);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <PageTitle
                title="Inventory Catalog"
                subtitle="Manage medication items"
                action={
                    <Button onClick={() => handleOpenModal()}>+ Add New Item</Button>
                }
            />

            <Card className="mb-6">
                <Input
                    type="text"
                    placeholder="Search by Generic, Brand, or Barcode..."
                    value={search}
                    onChange={handleSearch}
                />
            </Card>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeader>Generic Name</TableHeader>
                        <TableHeader>Brand</TableHeader>
                        <TableHeader>Strength</TableHeader>
                        <TableHeader>Form</TableHeader>
                        <TableHeader>Pack</TableHeader>
                        <TableHeader>Barcode</TableHeader>
                        <TableHeader className="text-center">Actions</TableHeader>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length > 0 ? (
                        items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.generic_name}</TableCell>
                                <TableCell>{item.brand_name || '-'}</TableCell>
                                <TableCell>{item.strength_mg ? `${item.strength_mg} ${item.strength_unit}` : '-'}</TableCell>
                                <TableCell>{item.form}</TableCell>
                                <TableCell>{item.pack_size}</TableCell>
                                <TableCell className="font-mono text-slate-600">{item.barcode || '-'}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)}>
                                            Edit
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                                            Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                                No items found. Add one to get started.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-slate-900">
                            {editingId ? 'Edit Item' : 'New Inventory Item'}
                        </h2>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            name="generic_name"
                            label="Generic Name *"
                            value={formData.generic_name}
                            onChange={handleChange}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                name="brand_name"
                                label="Brand Name"
                                value={formData.brand_name}
                                onChange={handleChange}
                            />
                            <Input
                                name="manufacturer"
                                label="Manufacturer"
                                value={formData.manufacturer}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                name="form"
                                label="Form (e.g. Tablet)"
                                value={formData.form}
                                onChange={handleChange}
                            />
                            <Input
                                name="barcode"
                                label="Barcode"
                                value={formData.barcode}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="number"
                                step="0.01"
                                name="strength_mg"
                                label="Strength Value"
                                value={formData.strength_mg}
                                onChange={handleChange}
                            />
                            <Select
                                name="strength_unit"
                                label="Unit"
                                value={formData.strength_unit}
                                onChange={handleChange}
                            >
                                <option value="mg">mg</option>
                                <option value="ml">ml</option>
                                <option value="g">g</option>
                                <option value="mcg">mcg</option>
                                <option value="%">%</option>
                            </Select>
                        </div>

                        <Input
                            type="number"
                            name="pack_size"
                            label="Pack Size"
                            value={formData.pack_size}
                            onChange={handleChange}
                        />

                        <div className="flex gap-3 justify-end pt-4">
                            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingId ? 'Save Changes' : 'Create Item'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {message && (
                <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
                    {message}
                </div>
            )}
        </div>
    );
};

export default InventoryItems;
