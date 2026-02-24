import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { createAppointment, updateAppointment } from '../api/appointments';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { Input } from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';

export default function AppointmentForm() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [patients, setPatients] = useState([]);
    const [formData, setFormData] = useState({
        patient_id: searchParams.get('patient_id') || '',
        start_at: '',
        end_at: '',
        session_type: 'IN_CLINIC',
        payment_status: 'UNPAID',
        free_return_reason: '',
        doctor_cut_percent: '',
        doctor_involved: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Autocomplete state
    const [patientSearch, setPatientSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const suggestionsRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        fetchPatients();
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isEditMode) {
            fetch(`${API_BASE_URL}/appointments/${id}`, { credentials: 'include', headers: getAuthHeaders() })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch appointment');
                    return res.json();
                })
                .then(data => {
                    setFormData({
                        patient_id: data.patient_id || '',
                        start_at: data.start_at ? data.start_at.replace(' ', 'T').slice(0, 16) : '',
                        end_at: data.end_at ? data.end_at.replace(' ', 'T').slice(0, 16) : '',
                        session_type: data.session_type || 'IN_CLINIC',
                        payment_status: data.payment_status || 'UNPAID',
                        free_return_reason: data.free_return_reason || '',
                        doctor_cut_percent: data.doctor_cut_percent || '',
                        doctor_involved: data.doctor_involved !== 0
                    });
                    // Set patient info for edit mode
                    if (data.patient_id) {
                        const p = patients.find(pt => pt.id === data.patient_id);
                        if (p) {
                            setSelectedPatient(p);
                            setPatientSearch(`${p.first_name} ${p.last_name}`);
                        }
                    }
                })
                .catch(err => setError(err.message));
        }
    }, [id, patients]);

    // If patient_id comes from URL params, pre-fill
    useEffect(() => {
        const preselectedId = searchParams.get('patient_id');
        if (preselectedId && patients.length > 0) {
            const p = patients.find(pt => pt.id === parseInt(preselectedId));
            if (p) {
                setSelectedPatient(p);
                setPatientSearch(`${p.first_name} ${p.last_name}`);
                setFormData(prev => ({ ...prev, patient_id: p.id }));
            }
        }
    }, [patients, searchParams]);

    const fetchPatients = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients`, { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setPatients(data.patients || []);
            }
        } catch (err) {
            console.error('Error fetching patients:', err);
        }
    };

    // Calculate age from DOB
    const calculateAge = (dob) => {
        if (!dob) return '—';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age}`;
    };

    // Filter patients based on search input
    const filteredPatients = patients.filter(p => {
        if (!patientSearch.trim()) return true;
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        const reverseName = `${p.last_name} ${p.first_name}`.toLowerCase();
        const search = patientSearch.toLowerCase().trim();
        return fullName.includes(search) || reverseName.includes(search) ||
            (p.phone && p.phone.includes(search));
    });

    // Handle patient selection from suggestions
    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setPatientSearch(`${patient.first_name} ${patient.last_name}`);
        setFormData(prev => ({ ...prev, patient_id: patient.id }));
        setShowSuggestions(false);
    };

    // Handle clearing the selected patient
    const handleClearPatient = () => {
        setSelectedPatient(null);
        setPatientSearch('');
        setFormData(prev => ({ ...prev, patient_id: '' }));
        inputRef.current?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!formData.patient_id) {
            setError('Please select a patient from the suggestions');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                patient_id: parseInt(formData.patient_id),
                start_at: formData.start_at.replace('T', ' ') + ':00',
                end_at: formData.end_at.replace('T', ' ') + ':00',
                session_type: formData.session_type,
                payment_status: formData.payment_status,
                free_return_reason: formData.payment_status === 'FREE_RETURN' ? formData.free_return_reason : null,
                doctor_cut_percent: formData.doctor_cut_percent ? parseFloat(formData.doctor_cut_percent) : null,
                doctor_involved: formData.doctor_involved
            };

            if (isEditMode) {
                await updateAppointment(id, payload);
                setSuccess('Appointment updated successfully!');
            } else {
                const result = await createAppointment(payload);
                if (result.income_generated) {
                    setSuccess(`Appointment created! Income: ${result.income_generated} IQD`);
                } else {
                    setSuccess('Appointment created successfully!');
                }
            }
            setTimeout(() => navigate('/appointments'), 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl">
            <PageTitle
                title={isEditMode ? 'Edit Appointment' : 'New Appointment'}
                action={
                    <Link to="/appointments">
                        <Button variant="secondary">← Back to Appointments</Button>
                    </Link>
                }
            />

            <Card>
                {error && <Alert variant="error" className="mb-4">{error}</Alert>}
                {success && <Alert variant="success" className="mb-4">{success}</Alert>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Patient Name Autocomplete */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                            Patient Name *
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={patientSearch}
                                onChange={(e) => {
                                    setPatientSearch(e.target.value);
                                    setShowSuggestions(true);
                                    if (selectedPatient) {
                                        const currentName = `${selectedPatient.first_name} ${selectedPatient.last_name}`;
                                        if (e.target.value !== currentName) {
                                            setSelectedPatient(null);
                                            setFormData(prev => ({ ...prev, patient_id: '' }));
                                        }
                                    }
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="Type patient name to search..."
                                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors ${selectedPatient
                                        ? 'border-green-400 bg-green-50/50 text-[var(--text)]'
                                        : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text)]'
                                    }`}
                                autoComplete="off"
                            />
                            {selectedPatient && (
                                <button
                                    type="button"
                                    onClick={handleClearPatient}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors"
                                    title="Clear selection"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                            {!selectedPatient && patientSearch && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && !selectedPatient && (
                            <div
                                ref={suggestionsRef}
                                className="absolute z-50 w-full mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg shadow-xl max-h-60 overflow-y-auto"
                            >
                                {filteredPatients.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-[var(--muted)] text-center">
                                        No patients found matching "{patientSearch}"
                                    </div>
                                ) : (
                                    filteredPatients.slice(0, 15).map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleSelectPatient(p)}
                                            className="w-full text-left px-4 py-2.5 hover:bg-[var(--panel-hover)] transition-colors border-b border-[var(--border)] last:border-b-0 flex items-center justify-between gap-3"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-[var(--text)] truncate">
                                                    {p.first_name} {p.last_name}
                                                </div>
                                                <div className="text-xs text-[var(--muted)] flex gap-3 mt-0.5">
                                                    <span>📞 {p.phone || '—'}</span>
                                                    <span>🎂 {calculateAge(p.date_of_birth)}y</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-xs text-[var(--muted)] bg-[var(--bg-2)] px-2 py-0.5 rounded-full">
                                                ID: {p.id}
                                            </div>
                                        </button>
                                    ))
                                )}
                                {filteredPatients.length > 15 && (
                                    <div className="px-4 py-2 text-xs text-center text-[var(--muted)] bg-[var(--bg-2)]">
                                        Showing 15 of {filteredPatients.length} results. Type more to narrow down.
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedPatient && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Patient selected
                            </p>
                        )}
                    </div>

                    {/* Patient Info Display (Phone & Age) */}
                    {selectedPatient && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg">
                            <div>
                                <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Phone</span>
                                <p className="text-sm font-medium text-[var(--text)] mt-0.5">
                                    📞 {selectedPatient.phone || 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Age</span>
                                <p className="text-sm font-medium text-[var(--text)] mt-0.5">
                                    🎂 {calculateAge(selectedPatient.date_of_birth)} years old
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Date/Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                Start Time *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.start_at}
                                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                                className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                End Time *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.end_at}
                                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                                className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                                required
                            />
                        </div>
                    </div>

                    {/* Session Type */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                            Session Type *
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="session_type"
                                    value="IN_CLINIC"
                                    checked={formData.session_type === 'IN_CLINIC'}
                                    onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-[var(--text)]">🏥 In Clinic</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="session_type"
                                    value="ONLINE"
                                    checked={formData.session_type === 'ONLINE'}
                                    onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-[var(--text)]">💻 Online</span>
                            </label>
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                            Payment Status *
                        </label>
                        <select
                            value={formData.payment_status}
                            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                            className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        >
                            <option value="UNPAID">❌ Unpaid</option>
                            <option value="PAID">💰 Paid</option>
                            <option value="FREE_RETURN">🎁 Free Return</option>
                        </select>
                    </div>

                    {/* FREE_RETURN Reason */}
                    {formData.payment_status === 'FREE_RETURN' && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Free Return Reason
                            </label>
                            <textarea
                                value={formData.free_return_reason}
                                onChange={(e) => setFormData({ ...formData, free_return_reason: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={2}
                                placeholder="Reason for free return visit..."
                            />
                            <p className="text-xs text-amber-700 mt-2">
                                ⚠️ Free return is only valid within 10 days of last paid visit
                            </p>
                        </div>
                    )}

                    {/* Doctor Cut Settings (ONLINE only) */}
                    {formData.session_type === 'ONLINE' && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="text-sm font-medium text-slate-900 mb-3">Online Session Settings</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Doctor Cut %
                                    </label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="20"
                                        value={formData.doctor_cut_percent}
                                        onChange={(e) => setFormData({ ...formData, doctor_cut_percent: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="10-20"
                                    />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.doctor_involved}
                                            onChange={(e) => setFormData({ ...formData, doctor_involved: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                                        />
                                        <span className="text-sm font-medium text-slate-900">Doctor Involved</span>
                                    </label>
                                </div>
                            </div>
                            <p className="text-xs text-blue-700 mt-2">
                                💡 Online sessions: 20,000 IQD income. Doctor cut applies if specified.
                            </p>
                        </div>
                    )}

                    {/* Info Note */}
                    {formData.session_type === 'IN_CLINIC' && (
                        <div className="text-sm text-[var(--muted)] p-3 bg-[var(--bg-2)] rounded-lg">
                            💡 In-clinic sessions: 15,000 IQD income. Available on Sat, Sun, Tue, Wed.
                        </div>
                    )}

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : (isEditMode ? 'Update Appointment' : 'Create Appointment')}
                        </Button>
                        <Link to="/appointments">
                            <Button type="button" variant="secondary">Cancel</Button>
                        </Link>
                    </div>
                </form>
            </Card>
        </div>
    );
}
