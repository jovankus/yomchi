import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageTitle from '../components/PageTitle';
import { Input } from '../components/Input';
import Button from '../components/Button';
import Table, { TableHead, TableBody, TableRow, TableHeader, TableCell } from '../components/Table';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';

export default function Patients() {
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPatients();
    }, [search]);

    const fetchPatients = async () => {
        try {
            const query = search ? `?search=${encodeURIComponent(search)}` : '';
            const res = await fetch(`${API_BASE_URL}/patients${query}`, { credentials: 'include', headers: getAuthHeaders() });
            const data = await res.json();
            if (res.ok) {
                setPatients(data.patients);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const deletePatient = async (id) => {
        if (!window.confirm('Are you sure you want to delete this patient?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                fetchPatients();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Format phone for WhatsApp (remove non-digits)
    const formatPhoneForWhatsApp = (phone) => {
        if (!phone) return null;
        return phone.replace(/\D/g, '');
    };

    return (
        <div>
            <PageTitle
                title="Patients"
                subtitle="Manage patient records"
                action={
                    <Link to="/patients/new">
                        <Button>+ Add Patient</Button>
                    </Link>
                }
            />

            <div className="mb-6">
                <Input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader>Name</TableHeader>
                            <TableHeader>Date of Birth</TableHeader>
                            <TableHeader>Phone</TableHeader>
                            <TableHeader>Actions</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {patients.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.last_name}, {p.first_name}</TableCell>
                                <TableCell>{p.date_of_birth}</TableCell>
                                <TableCell>{p.phone}</TableCell>
                                <TableCell>
                                    <div className="flex gap-2 flex-wrap">
                                        <Link to={`/appointments/new?patient_id=${p.id}`}>
                                            <Button variant="ghost" size="sm">📅 Schedule</Button>
                                        </Link>
                                        {p.phone && (
                                            <a
                                                href={`https://wa.me/${formatPhoneForWhatsApp(p.phone)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Message on WhatsApp"
                                            >
                                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                                    💬 WA
                                                </Button>
                                            </a>
                                        )}
                                        <Link to={`/patients/${p.id}`}>
                                            <Button variant="ghost" size="sm">Edit</Button>
                                        </Link>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => deletePatient(p.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {patients.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                                    No patients found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
