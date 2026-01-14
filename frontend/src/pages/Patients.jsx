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
            } else {
                const data = await res.json();
                if (res.status === 403) {
                    alert('You do not have permission to delete patients. Only admins can delete.');
                } else {
                    alert(data.message || data.error || 'Failed to delete patient');
                }
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting patient: ' + err.message);
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
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                                WA
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
