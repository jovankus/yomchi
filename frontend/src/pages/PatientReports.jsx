import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';
import Button from '../components/Button';

export default function PatientReports() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients`, { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setPatients(data.patients || data || []);
            } else {
                setError('Failed to load patients');
            }
        } catch (err) {
            setError('Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return '–';
        const today = new Date();
        const birth = new Date(dob);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const filteredPatients = patients.filter(p => {
        const name = `${p.first_name} ${p.last_name}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin text-4xl">⏳</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">📋 Patient Reports</h1>
                <p className="text-slate-500">View read-only patient reports and medical summaries.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search patients by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-md px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
            </div>

            {/* Patient Cards */}
            {filteredPatients.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-lg">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-slate-500 text-lg">No patients found</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPatients.map((patient) => (
                        <div
                            key={patient.id}
                            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-lg text-slate-800">
                                        {patient.first_name} {patient.last_name}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Age: {calculateAge(patient.date_of_birth)} years
                                    </p>
                                </div>
                                {patient.has_asd && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                        🧩 ASD
                                    </span>
                                )}
                            </div>

                            <div className="text-sm text-slate-600 mb-4">
                                {patient.phone && (
                                    <p>📞 {patient.phone}</p>
                                )}
                                {patient.place_of_living && (
                                    <p>📍 {patient.place_of_living}</p>
                                )}
                            </div>

                            <Link to={`/patient-reports/${patient.id}`}>
                                <Button variant="secondary" className="w-full">
                                    📄 View Report
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-slate-400">
                Showing {filteredPatients.length} of {patients.length} patients
            </div>
        </div>
    );
}
