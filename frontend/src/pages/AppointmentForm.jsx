import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { createAppointment, updateAppointment } from '../api/appointments';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
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

    // Patient fields
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const suggestionsRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        fetchPatients();
    }, []);

    // Close suggestions on outside click
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

    // Load appointment data in edit mode
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
                    if (data.patient_id) {
                        const p = patients.find(pt => pt.id === data.patient_id);
                        if (p) {
                            setSelectedPatient(p);
                            setPatientName(`${p.first_name} ${p.last_name}`);
                            setPatientPhone(p.phone || '');
                            setPatientAge(calculateAge(p.date_of_birth));
                        }
                    }
                })
                .catch(err => setError(err.message));
        }
    }, [id, patients]);

    // Pre-fill from URL params
    useEffect(() => {
        const preselectedId = searchParams.get('patient_id');
        if (preselectedId && patients.length > 0) {
            const p = patients.find(pt => pt.id === parseInt(preselectedId));
            if (p) {
                setSelectedPatient(p);
                setPatientName(`${p.first_name} ${p.last_name}`);
                setPatientPhone(p.phone || '');
                setPatientAge(calculateAge(p.date_of_birth));
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

    const calculateAge = (dob) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age}`;
    };

    // Convert age to approximate DOB for new patient creation
    const ageToDob = (age) => {
        const ageNum = parseInt(age);
        if (isNaN(ageNum)) return '';
        const today = new Date();
        const year = today.getFullYear() - ageNum;
        return `${year}-01-01`;
    };

    // Filter patients by name or phone
    const filteredPatients = patients.filter(p => {
        if (!patientName.trim()) return true;
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        const reverseName = `${p.last_name} ${p.first_name}`.toLowerCase();
        const search = patientName.toLowerCase().trim();
        return fullName.includes(search) || reverseName.includes(search) ||
            (p.phone && p.phone.includes(search));
    });

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setPatientName(`${patient.first_name} ${patient.last_name}`);
        setPatientPhone(patient.phone || '');
        setPatientAge(calculateAge(patient.date_of_birth));
        setFormData(prev => ({ ...prev, patient_id: patient.id }));
        setShowSuggestions(false);
    };

    const handleClearPatient = () => {
        setSelectedPatient(null);
        setPatientName('');
        setPatientPhone('');
        setPatientAge('');
        setFormData(prev => ({ ...prev, patient_id: '' }));
        inputRef.current?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!patientName.trim()) {
            setError('Please enter the patient name');
            setLoading(false);
            return;
        }

        try {
            let patientId = formData.patient_id;

            // If no existing patient selected, create a new one
            if (!patientId) {
                const nameParts = patientName.trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || firstName;

                const newPatient = {
                    first_name: firstName,
                    last_name: lastName === firstName ? '' : lastName,
                    date_of_birth: patientAge ? ageToDob(patientAge) : '2000-01-01',
                    phone: patientPhone || '',
                    email: '',
                    address: '',
                };

                const res = await fetch(`${API_BASE_URL}/patients`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify(newPatient)
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || errData.message || 'Failed to create patient');
                }

                const created = await res.json();
                patientId = created.id || created.patient?.id;

                if (!patientId) {
                    throw new Error('Failed to get new patient ID');
                }
            }

            // Now create/update the appointment
            const payload = {
                patient_id: parseInt(patientId),
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

    const isNewPatient = patientName.trim() && !selectedPatient;

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
                    {/* Patient Name */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                            Patient Name *
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={patientName}
                                onChange={(e) => {
                                    setPatientName(e.target.value);
                                    setShowSuggestions(true);
                                    if (selectedPatient) {
                                        const currentName = `${selectedPatient.first_name} ${selectedPatient.last_name}`;
                                        if (e.target.value !== currentName) {
                                            setSelectedPatient(null);
                                            setFormData(prev => ({ ...prev, patient_id: '' }));
                                            setPatientPhone('');
                                            setPatientAge('');
                                        }
                                    }
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="Type patient name..."
                                className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors ${selectedPatient
                                        ? 'border-green-400 bg-green-50/50'
                                        : 'border-[var(--border)] bg-[var(--panel)]'
                                    } text-[var(--text)]`}
                                autoComplete="off"
                            />
                            {selectedPatient && (
                                <button
                                    type="button"
                                    onClick={handleClearPatient}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] transition-colors"
                                    title="Clear"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Autocomplete Suggestions */}
                        {showSuggestions && !selectedPatient && patientName.trim() && filteredPatients.length > 0 && (
                            <div
                                ref={suggestionsRef}
                                className="absolute z-50 w-full mt-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg shadow-xl max-h-48 overflow-y-auto"
                            >
                                {filteredPatients.slice(0, 10).map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleSelectPatient(p)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--panel-hover)] transition-colors border-b border-[var(--border)] last:border-b-0 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-[var(--text)]">
                                                {p.first_name} {p.last_name}
                                            </div>
                                            <div className="text-xs text-[var(--muted)] flex gap-3 mt-0.5">
                                                <span>📞 {p.phone || '—'}</span>
                                                <span>Age: {calculateAge(p.date_of_birth) || '—'}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedPatient && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                ✓ Existing patient selected
                            </p>
                        )}
                        {isNewPatient && (
                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                ➕ New patient — will be created automatically
                            </p>
                        )}
                    </div>

                    {/* Phone Number & Age (always visible, editable) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={patientPhone}
                                onChange={(e) => setPatientPhone(e.target.value)}
                                placeholder="Enter phone number"
                                className="w-full px-3 py-2.5 border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                Age
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="150"
                                value={patientAge}
                                onChange={(e) => setPatientAge(e.target.value)}
                                placeholder="Enter age"
                                className="w-full px-3 py-2.5 border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                            />
                        </div>
                    </div>

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
