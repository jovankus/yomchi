import { useState, useEffect } from 'react';
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

    useEffect(() => {
        fetchPatients();
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
                })
                .catch(err => setError(err.message));
        }
    }, [id]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            // Format datetime for backend
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
                    {/* Patient Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Patient *
                        </label>
                        <select
                            value={formData.patient_id}
                            onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select a patient</option>
                            {patients.map(p => {
                                // Calculate age from date_of_birth
                                let ageDisplay = '—';
                                if (p.date_of_birth) {
                                    const birthDate = new Date(p.date_of_birth);
                                    const today = new Date();
                                    let age = today.getFullYear() - birthDate.getFullYear();
                                    const monthDiff = today.getMonth() - birthDate.getMonth();
                                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                        age--;
                                    }
                                    ageDisplay = `${age}y`;
                                }
                                const phoneDisplay = p.phone || '—';
                                return (
                                    <option key={p.id} value={p.id}>
                                        {p.last_name}, {p.first_name} — {phoneDisplay} — Age: {ageDisplay}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Date/Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Start Time *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.start_at}
                                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                End Time *
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.end_at}
                                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Session Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                                <span className="text-sm">🏥 In Clinic</span>
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
                                <span className="text-sm">💻 Online</span>
                            </label>
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Payment Status *
                        </label>
                        <select
                            value={formData.payment_status}
                            onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                            💡 In-clinic sessions: 15,000 IQD income. Available on Sat, Sun, Tue, Wed.
                        </div>
                    )}

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
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
