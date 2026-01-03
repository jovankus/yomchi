import { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { Input } from '../components/Input';
import Button from '../components/Button';
import Table, { TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/Table';
import Alert from '../components/Alert';
import { API_BASE_URL } from '../config';

export default function Pharmacies() {
    const { pharmacies, refreshPharmacies } = usePharmacy();
    const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
    const [editingId, setEditingId] = useState(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        const url = editingId
            ? `${API_BASE_URL}/pharmacies/${editingId}`
            : `${API_BASE_URL}/pharmacies`;
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (res.ok) {
                setMessage(editingId ? 'Pharmacy updated successfully' : 'Pharmacy created successfully');
                setMessageType('success');
                setFormData({ name: '', address: '', phone: '' });
                setEditingId(null);
                refreshPharmacies();
            } else {
                setMessage('Error saving pharmacy');
                setMessageType('error');
            }
        } catch (err) {
            setMessage('Error: ' + err.message);
            setMessageType('error');
        }
    };

    const handleEdit = (p) => {
        setFormData({ name: p.name, address: p.address, phone: p.phone });
        setEditingId(p.id);
        setMessage('');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this pharmacy?')) return;
        try {
            await fetch(`${API_BASE_URL}/pharmacies/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            refreshPharmacies();
            setMessage('Pharmacy deleted successfully');
            setMessageType('success');
        } catch (err) {
            console.error(err);
            setMessage('Error deleting pharmacy');
            setMessageType('error');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ name: '', address: '', phone: '' });
        setMessage('');
    };

    return (
        <div>
            <PageTitle
                title="Pharmacy Management"
                subtitle="Manage pharmacy locations"
            />

            <Card className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {editingId ? 'Edit Pharmacy' : 'Add New Pharmacy'}
                </h3>

                {message && <Alert variant={messageType} className="mb-4">{message}</Alert>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        name="name"
                        label="Name *"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        name="address"
                        label="Address"
                        value={formData.address}
                        onChange={handleChange}
                    />
                    <Input
                        name="phone"
                        label="Phone"
                        value={formData.phone}
                        onChange={handleChange}
                    />

                    <div className="flex gap-3 pt-2">
                        <Button type="submit">
                            {editingId ? 'Update Pharmacy' : 'Create Pharmacy'}
                        </Button>
                        {editingId && (
                            <Button type="button" variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                        )}
                    </div>
                </form>
            </Card>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeader>Name</TableHeader>
                        <TableHeader>Address</TableHeader>
                        <TableHeader>Phone</TableHeader>
                        <TableHeader>Actions</TableHeader>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {pharmacies.map(p => (
                        <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{p.address}</TableCell>
                            <TableCell>{p.phone}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
                                        Edit
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>
                                        Delete
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {pharmacies.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                                No pharmacies found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
