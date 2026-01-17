import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createNote, getPatientNotes } from '../api/notes';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { Input, TextArea } from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';

export default function PatientForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        phone: '',
        email: '',
        address: '',
        place_of_living: '',
        education_level: '',
        marital_status: '',
        occupation: '',
        living_with: '',
        has_asd: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Notes state
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [noteLoading, setNoteLoading] = useState(false);

    // Psychiatric History state
    const [psychiatricHistory, setPsychiatricHistory] = useState('');
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySaveSuccess, setHistorySaveSuccess] = useState(false);

    // Symptoms state
    const [symptoms, setSymptoms] = useState({
        depression: false,
        anxiety: false,
        panic: false,
        ptsd: false,
        ocd: false,
        psychosis: false,
        mania: false,
        substance_use: false,
        sleep_problem: false,
        suicidal_ideation: false,
        self_harm: false,
        irritability: false,
        attention_problem: false,
        notes: ''
    });
    const [symptomsLoading, setSymptomsLoading] = useState(false);
    const [symptomsSaveSuccess, setSymptomsSaveSuccess] = useState(false);

    // Prescription Documents state
    const [prescriptions, setPrescriptions] = useState([]);
    const [uploadFile, setUploadFile] = useState(null);
    const [prescriptionDate, setPrescriptionDate] = useState('');
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Follow-up Notes state
    const [followUpData, setFollowUpData] = useState({
        appointment_id: '',
        changes_since_last_visit: '',
        medication_adherence_change: '',
        side_effects_change: ''
    });
    const [recentAppointments, setRecentAppointments] = useState([]);
    const [followUpLoading, setFollowUpLoading] = useState(false);
    const [followUpSuccess, setFollowUpSuccess] = useState(false);

    // ASD Profile state
    const [asdProfile, setAsdProfile] = useState({
        diagnosed: false,
        diagnosis_source: '',
        severity_level: '',
        language_level: '',
        notes: ''
    });
    const [asdLoading, setAsdLoading] = useState(false);
    const [asdSuccess, setAsdSuccess] = useState(false);

    // Autism Forms state
    const [asdFormResponses, setAsdFormResponses] = useState({
        social_communication: '',
        repetitive_behaviors: '',
        sensory_sensitivities: '',
        special_interests: '',
        routine_changes: '',
        eye_contact: '',
        social_cues: '',
        preference_sameness: ''
    });
    const [asdFormSummary, setAsdFormSummary] = useState('');
    const [savedAsdForms, setSavedAsdForms] = useState([]);
    const [asdFormLoading, setAsdFormLoading] = useState(false);
    const [asdFormSuccess, setAsdFormSuccess] = useState(false);

    // Session & Payment Panel state
    const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
    const [paymentForm, setPaymentForm] = useState({
        session_type: '',
        payment_status: '',
        free_return_reason: '',
        doctor_cut_percent: '',
        doctor_involved: true
    });
    const [lastPaidVisit, setLastPaidVisit] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [freeReturnEligibility, setFreeReturnEligibility] = useState(null);

    useEffect(() => {
        if (id) {
            fetchPatient();
            fetchNotes();
            fetchPsychiatricHistory();
            fetchSymptoms();
            fetchPrescriptions();
            fetchRecentAppointments();
            fetchAsdProfile();
            fetchAsdForms();
            fetchLastPaidVisit();
            fetchFreeReturnEligibility();
        }
    }, [id]);

    const fetchNotes = async () => {
        try {
            const data = await getPatientNotes(id);
            setNotes(data);
        } catch (err) {
            console.error('Error fetching notes:', err);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setNoteLoading(true);
        try {
            await createNote({ patient_id: id, content: newNote });
            setNewNote('');
            fetchNotes();
        } catch (err) {
            alert(err.message);
        } finally {
            setNoteLoading(false);
        }
    };

    const fetchPsychiatricHistory = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/psychiatric-profile`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.profile) {
                    setPsychiatricHistory(data.profile.psychiatric_history_text || '');
                }
            }
        } catch (err) {
            console.error('Error fetching psychiatric history:', err);
        }
    };

    const handleSavePsychiatricHistory = async () => {
        setHistoryLoading(true);
        setHistorySaveSuccess(false);
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/psychiatric-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ psychiatric_history_text: psychiatricHistory }),
                credentials: 'include'
            });

            if (res.ok) {
                setHistorySaveSuccess(true);
                setTimeout(() => setHistorySaveSuccess(false), 3000);
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to save psychiatric history');
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchSymptoms = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/symptoms`, { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.symptoms) {
                    // Convert SQLite integers (0/1) to booleans
                    const symptomsData = {
                        depression: !!data.symptoms.depression,
                        anxiety: !!data.symptoms.anxiety,
                        panic: !!data.symptoms.panic,
                        ptsd: !!data.symptoms.ptsd,
                        ocd: !!data.symptoms.ocd,
                        psychosis: !!data.symptoms.psychosis,
                        mania: !!data.symptoms.mania,
                        substance_use: !!data.symptoms.substance_use,
                        sleep_problem: !!data.symptoms.sleep_problem,
                        suicidal_ideation: !!data.symptoms.suicidal_ideation,
                        self_harm: !!data.symptoms.self_harm,
                        irritability: !!data.symptoms.irritability,
                        attention_problem: !!data.symptoms.attention_problem,
                        notes: data.symptoms.notes || ''
                    };
                    setSymptoms(symptomsData);
                }
            }
        } catch (err) {
            console.error('Error fetching symptoms:', err);
        }
    };

    const handleSaveSymptoms = async () => {
        setSymptomsLoading(true);
        setSymptomsSaveSuccess(false);
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/symptoms`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(symptoms),
                credentials: 'include'
            });

            if (res.ok) {
                setSymptomsSaveSuccess(true);
                setTimeout(() => setSymptomsSaveSuccess(false), 3000);
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to save symptoms');
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setSymptomsLoading(false);
        }
    };

    const handleSymptomChange = (symptom) => {
        setSymptoms(prev => ({
            ...prev,
            [symptom]: !prev[symptom]
        }));
    };

    const fetchPrescriptions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/documents?doc_type=PRESCRIPTION`,
                { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setPrescriptions(data.documents || []);
            }
        } catch (err) {
            console.error('Error fetching prescriptions:', err);
        }
    };

    const handleUploadPrescription = async (e) => {
        e.preventDefault();

        if (!uploadFile) {
            alert('Please select a file');
            return;
        }

        if (!prescriptionDate) {
            alert('Please select a prescription date');
            return;
        }

        setUploadLoading(true);
        setUploadSuccess(false);

        try {
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('doc_type', 'PRESCRIPTION');
            formData.append('doc_date', prescriptionDate);

            const res = await fetch(`${API_BASE_URL}/patients/${id}/documents`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
                credentials: 'include'
            });

            if (res.ok) {
                setUploadSuccess(true);
                setUploadFile(null);
                setPrescriptionDate('');
                // Reset file input
                document.getElementById('prescription-upload').value = '';
                // Refresh list
                fetchPrescriptions();
                setTimeout(() => setUploadSuccess(false), 3000);
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to upload prescription');
            }
        } catch (err) {
            alert(err.message || 'Failed to upload prescription');
        } finally {
            setUploadLoading(false);
        }
    };

    const fetchRecentAppointments = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/recent-appointments`,
                { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setRecentAppointments(data.appointments || []);
            }
        } catch (err) {
            console.error('Error fetching recent appointments:', err);
        }
    };

    const handleSaveFollowUp = async () => {
        if (!followUpData.changes_since_last_visit.trim()) {
            alert('Please describe what changed since last visit');
            return;
        }

        setFollowUpLoading(true);
        setFollowUpSuccess(false);

        try {
            const noteData = {
                patient_id: id,
                appointment_id: followUpData.appointment_id || null,
                content: followUpData.changes_since_last_visit,
                note_type: 'FOLLOW_UP',
                changes_since_last_visit: followUpData.changes_since_last_visit,
                medication_adherence_change: followUpData.medication_adherence_change || null,
                side_effects_change: followUpData.side_effects_change || null
            };

            const savedNote = await createNote(noteData);

            if (savedNote) {
                setFollowUpSuccess(true);
                // Reset form
                setFollowUpData({
                    appointment_id: '',
                    changes_since_last_visit: '',
                    medication_adherence_change: '',
                    side_effects_change: ''
                });
                // Refresh notes
                fetchNotes();
                setTimeout(() => setFollowUpSuccess(false), 3000);
            }
        } catch (err) {
            alert(err.message || 'Failed to save follow-up note');
        } finally {
            setFollowUpLoading(false);
        }
    };

    const fetchAsdProfile = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/asd-profile`,
                { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data.asd_profile) {
                    setAsdProfile({
                        diagnosed: !!data.asd_profile.diagnosed,
                        diagnosis_source: data.asd_profile.diagnosis_source || '',
                        severity_level: data.asd_profile.severity_level || '',
                        language_level: data.asd_profile.language_level || '',
                        notes: data.asd_profile.notes || ''
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching ASD profile:', err);
        }
    };

    const handleSaveAsdProfile = async () => {
        setAsdLoading(true);
        setAsdSuccess(false);

        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/asd-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(asdProfile),
                credentials: 'include'
            });

            if (res.ok) {
                setAsdSuccess(true);
                setTimeout(() => setAsdSuccess(false), 3000);
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to save ASD profile');
            }
        } catch (err) {
            alert(err.message || 'Failed to save ASD profile');
        } finally {
            setAsdLoading(false);
        }
    };

    const fetchAsdForms = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/asd-forms`,
                { credentials: 'include', headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSavedAsdForms(data.forms || []);
            }
        } catch (err) {
            console.error('Error fetching ASD forms:', err);
        }
    };

    const handleSaveAsdForm = async () => {
        // Check if at least one question is answered
        const hasAnswers = Object.values(asdFormResponses).some(val => val !== '');

        if (!hasAnswers) {
            alert('Please answer at least one question');
            return;
        }

        setAsdFormLoading(true);
        setAsdFormSuccess(false);

        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}/asd-forms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_version: 'v1',
                    responses_json: asdFormResponses,
                    summary_text: asdFormSummary || null
                }),
                credentials: 'include'
            });

            if (res.ok) {
                setAsdFormSuccess(true);
                // Reset form
                setAsdFormResponses({
                    social_communication: '',
                    repetitive_behaviors: '',
                    sensory_sensitivities: '',
                    special_interests: '',
                    routine_changes: '',
                    eye_contact: '',
                    social_cues: '',
                    preference_sameness: ''
                });
                setAsdFormSummary('');
                // Refresh list
                fetchAsdForms();
                setTimeout(() => setAsdFormSuccess(false), 3000);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save autism form');
            }
        } catch (err) {
            alert(err.message || 'Failed to save autism form');
        } finally {
            setAsdFormLoading(false);
        }
    };

    const fetchPatient = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setFormData(data.patient);
            } else {
                setError('Failed to fetch patient');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Session & Payment Panel functions
    const fetchLastPaidVisit = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/patient/${id}/last-paid`,
                { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setLastPaidVisit(data.last_paid);
            }
        } catch (err) {
            console.error('Error fetching last paid visit:', err);
        }
    };

    const fetchFreeReturnEligibility = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/patient/${id}/free-return-eligibility`,
                { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setFreeReturnEligibility(data);
            }
        } catch (err) {
            console.error('Error fetching free return eligibility:', err);
        }
    };

    const handleAppointmentSelect = (appointmentId) => {
        setSelectedAppointmentId(appointmentId);
        setPaymentSuccess(false);
        setPaymentError('');

        // Find the appointment and populate form
        const apt = recentAppointments.find(a => a.id === parseInt(appointmentId));
        if (apt) {
            setPaymentForm({
                session_type: apt.session_type || '',
                payment_status: apt.payment_status || '',
                free_return_reason: apt.free_return_reason || '',
                doctor_cut_percent: apt.doctor_cut_percent || '',
                doctor_involved: apt.doctor_involved !== 0
            });
        }
    };

    const handlePaymentUpdate = async (newPaymentStatus = null) => {
        if (!selectedAppointmentId) {
            setPaymentError('Please select an appointment');
            return;
        }

        setPaymentLoading(true);
        setPaymentError('');
        setPaymentSuccess(false);

        try {
            const body = {
                session_type: paymentForm.session_type,
                payment_status: newPaymentStatus || paymentForm.payment_status,
                free_return_reason: paymentForm.free_return_reason || null,
                doctor_cut_percent: paymentForm.doctor_cut_percent ? parseFloat(paymentForm.doctor_cut_percent) : null,
                doctor_involved: paymentForm.doctor_involved
            };

            const res = await fetch(`${API_BASE_URL}/appointments/${selectedAppointmentId}/payment`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                setPaymentSuccess(true);

                // Update local form state
                if (newPaymentStatus) {
                    setPaymentForm(prev => ({ ...prev, payment_status: newPaymentStatus }));
                }

                // Refresh appointments, last paid, and eligibility
                fetchRecentAppointments();
                fetchLastPaidVisit();
                fetchFreeReturnEligibility();

                setTimeout(() => setPaymentSuccess(false), 3000);
            } else {
                setPaymentError(data.error || 'Failed to update payment status');
            }
        } catch (err) {
            setPaymentError(err.message || 'Failed to update payment status');
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Frontend validation: if not married, living_with is required
        if (formData.marital_status && formData.marital_status.toLowerCase() !== 'married' && !formData.living_with) {
            setError('Living With is required when patient is not married');
            setLoading(false);
            return;
        }

        const url = id
            ? `${API_BASE_URL}/patients/${id}`
            : `${API_BASE_URL}/patients`;

        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (res.ok) {
                navigate('/patients');
            } else {
                const data = await res.json();
                setError(data.message || 'Failed to save patient');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl">
            <PageTitle
                title={id ? 'Edit Patient' : 'Add New Patient'}
                action={
                    <div className="flex gap-2">
                        {id && (
                            <>
                                <Link to={`/patients/${id}/prescription`}>
                                    <Button variant="secondary">📝 Print Prescription</Button>
                                </Link>
                                <Link to={`/patients/${id}/print`}>
                                    <Button variant="secondary">🖨️ Print / Export</Button>
                                </Link>
                            </>
                        )}
                        <Link to="/patients">
                            <Button variant="secondary">← Back to Patients</Button>
                        </Link>
                    </div>
                }
            />

            <Card>
                {error && <Alert variant="error" className="mb-4">{error}</Alert>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            name="first_name"
                            label="First Name *"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            name="last_name"
                            label="Last Name *"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            name="date_of_birth"
                            type="date"
                            label="Date of Birth *"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            name="phone"
                            label="Phone"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <Input
                        name="email"
                        type="email"
                        label="Email"
                        value={formData.email}
                        onChange={handleChange}
                    />

                    <TextArea
                        name="address"
                        label="Address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                    />

                    {/* Demographics Section */}
                    <div className="pt-6 border-t border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Demographics</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                name="place_of_living"
                                label="Place of Living"
                                value={formData.place_of_living}
                                onChange={handleChange}
                            />
                            <Input
                                name="education_level"
                                label="Education Level"
                                value={formData.education_level}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Marital Status</label>
                                <select
                                    name="marital_status"
                                    value={formData.marital_status}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                    <option value="">Select...</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                            <Input
                                name="occupation"
                                label="Work/Occupation"
                                value={formData.occupation}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mt-4">
                            <Input
                                name="living_with"
                                label={`Living With ${formData.marital_status && formData.marital_status.toLowerCase() !== 'married' ? '*' : ''}`}
                                value={formData.living_with}
                                onChange={handleChange}
                                required={formData.marital_status && formData.marital_status.toLowerCase() !== 'married'}
                            />
                            {formData.marital_status && formData.marital_status.toLowerCase() !== 'married' && (
                                <p className="text-xs text-slate-500 mt-1">Required when not married</p>
                            )}
                        </div>
                    </div>

                    {/* Autism Flag */}
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.has_asd}
                                onChange={(e) => setFormData({ ...formData, has_asd: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-900">
                                Patient has Autism Spectrum Disorder (ASD)
                            </span>
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Patient'}
                        </Button>
                        <Link to="/patients">
                            <Button variant="secondary" type="button">Cancel</Button>
                        </Link>
                    </div>
                </form>
            </Card>

            {/* Patient Summary Card - shown when editing */}
            {id && formData.first_name && (
                <Card className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Patient Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500">Name:</span>
                            <span className="ml-2 text-slate-900 font-medium">{formData.first_name} {formData.last_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Date of Birth:</span>
                            <span className="ml-2 text-slate-900 font-medium">{formData.date_of_birth}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Phone:</span>
                            <span className="ml-2 text-slate-900 font-medium">{formData.phone || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Email:</span>
                            <span className="ml-2 text-slate-900 font-medium">{formData.email || 'N/A'}</span>
                        </div>
                        <div className="md:col-span-2">
                            <span className="text-slate-500">Address:</span>
                            <span className="ml-2 text-slate-900 font-medium">{formData.address || 'N/A'}</span>
                        </div>

                        {/* Demographics */}
                        {(formData.place_of_living || formData.education_level || formData.marital_status || formData.occupation || formData.living_with) && (
                            <>
                                <div className="md:col-span-2 border-t border-slate-200 pt-3 mt-2">
                                    <h4 className="font-semibold text-slate-700 mb-2">Demographics</h4>
                                </div>
                                {formData.place_of_living && (
                                    <div>
                                        <span className="text-slate-500">Place of Living:</span>
                                        <span className="ml-2 text-slate-900 font-medium">{formData.place_of_living}</span>
                                    </div>
                                )}
                                {formData.education_level && (
                                    <div>
                                        <span className="text-slate-500">Education Level:</span>
                                        <span className="ml-2 text-slate-900 font-medium">{formData.education_level}</span>
                                    </div>
                                )}
                                {formData.marital_status && (
                                    <div>
                                        <span className="text-slate-500">Marital Status:</span>
                                        <span className="ml-2 text-slate-900 font-medium">{formData.marital_status}</span>
                                    </div>
                                )}
                                {formData.occupation && (
                                    <div>
                                        <span className="text-slate-500">Occupation:</span>
                                        <span className="ml-2 text-slate-900 font-medium">{formData.occupation}</span>
                                    </div>
                                )}
                                {formData.living_with && (
                                    <div>
                                        <span className="text-slate-500">Living With:</span>
                                        <span className="ml-2 text-slate-900 font-medium">{formData.living_with}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Card>
            )}

            {/* Session & Payment Panel - shown when editing */}
            {id && recentAppointments.length > 0 && (
                <Card className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Session & Payment</h3>
                        <Link
                            to="/daily-summary"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                            📊 View Today's Ledger →
                        </Link>
                    </div>

                    {paymentError && <Alert variant="error" className="mb-4">{paymentError}</Alert>}
                    {paymentSuccess && <Alert variant="success" className="mb-4">Payment status updated successfully!</Alert>}

                    {/* FREE_RETURN Eligibility Status */}
                    {freeReturnEligibility && (
                        <div className={`p-4 rounded-lg border-2 mb-4 ${freeReturnEligibility.eligible
                            ? 'bg-green-50 border-green-300'
                            : 'bg-amber-50 border-amber-300'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                    🎁 Free Return Policy (10-day)
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${freeReturnEligibility.eligible
                                        ? 'bg-green-200 text-green-800'
                                        : 'bg-amber-200 text-amber-800'
                                        }`}>
                                        {freeReturnEligibility.eligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}
                                    </span>
                                </h4>
                            </div>
                            <div className="text-sm space-y-1">
                                {freeReturnEligibility.last_paid ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-600">Last Paid Visit:</span>
                                            <span className="font-medium text-slate-900">
                                                {freeReturnEligibility.last_paid.date} ({freeReturnEligibility.last_paid.session_type})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-600">Days Since Payment:</span>
                                            <span className={`font-bold ${freeReturnEligibility.days_since_last_paid <= 10
                                                ? 'text-green-700'
                                                : 'text-red-700'
                                                }`}>
                                                {freeReturnEligibility.days_since_last_paid} days
                                            </span>
                                            {freeReturnEligibility.eligible && (
                                                <span className="text-slate-500">
                                                    ({freeReturnEligibility.days_remaining} days remaining)
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-amber-700">
                                        ⚠️ No prior paid visit found for this patient
                                    </div>
                                )}
                                <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                                    {freeReturnEligibility.policy}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Appointment Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Select Appointment
                            </label>
                            <select
                                value={selectedAppointmentId}
                                onChange={(e) => handleAppointmentSelect(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select an appointment --</option>
                                {recentAppointments.map(apt => (
                                    <option key={apt.id} value={apt.id}>
                                        {apt.start_at?.split(' ')[0] || 'Unknown date'} - {apt.session_type || 'N/A'} ({apt.payment_status || 'UNPAID'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedAppointmentId && (
                            <>
                                {/* Session Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Session Type
                                    </label>
                                    <select
                                        value={paymentForm.session_type}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, session_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="IN_CLINIC">In Clinic</option>
                                        <option value="ONLINE">Online</option>
                                    </select>
                                </div>

                                {/* Payment Status */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Payment Status
                                    </label>
                                    <select
                                        value={paymentForm.payment_status}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_status: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="PAID">Paid</option>
                                        <option value="UNPAID">Unpaid</option>
                                        <option value="FREE_RETURN">Free Return</option>
                                    </select>
                                </div>

                                {/* FREE_RETURN Reason + Last Paid Date */}
                                {paymentForm.payment_status === 'FREE_RETURN' && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Free Return Reason
                                            </label>
                                            <textarea
                                                value={paymentForm.free_return_reason}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, free_return_reason: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                rows={2}
                                                placeholder="Reason for free return visit..."
                                            />
                                        </div>
                                        {lastPaidVisit && (
                                            <div className="text-sm">
                                                <span className="text-slate-600">Last Paid Visit:</span>
                                                <span className="ml-2 font-medium text-slate-900">
                                                    {lastPaidVisit.date} ({lastPaidVisit.session_type})
                                                </span>
                                            </div>
                                        )}
                                        {!lastPaidVisit && (
                                            <div className="text-sm text-amber-700">
                                                ⚠️ No prior paid visit found - FREE_RETURN may not be allowed
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Doctor Cut Settings (for ONLINE sessions) */}
                                {paymentForm.session_type === 'ONLINE' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Doctor Cut %
                                            </label>
                                            <input
                                                type="number"
                                                min="10"
                                                max="20"
                                                value={paymentForm.doctor_cut_percent}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, doctor_cut_percent: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="10-20"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <label className="flex items-center gap-2 cursor-pointer pb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={paymentForm.doctor_involved}
                                                    onChange={(e) => setPaymentForm({ ...paymentForm, doctor_involved: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-slate-900">Doctor Involved</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        onClick={() => handlePaymentUpdate('PAID')}
                                        disabled={paymentLoading || paymentForm.payment_status === 'PAID'}
                                        className={paymentForm.payment_status === 'PAID' ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                        {paymentLoading ? 'Processing...' : '💰 Mark Paid'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => handlePaymentUpdate()}
                                        disabled={paymentLoading}
                                    >
                                        {paymentLoading ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>

                                {paymentForm.payment_status === 'PAID' && (
                                    <div className="text-sm text-green-600 font-medium">
                                        ✅ This appointment is already marked as PAID
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Card>
            )}


            {/* Autism Profile - shown only if has_asd is true */}
            {id && formData.has_asd && (
                <Card className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Autism Spectrum Disorder Profile</h3>

                    <div className="space-y-4">
                        {/* Formally Diagnosed */}
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={asdProfile.diagnosed}
                                    onChange={(e) => setAsdProfile({ ...asdProfile, diagnosed: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-900">
                                    Formally Diagnosed
                                </span>
                            </label>
                        </div>

                        {/* Diagnosis Source */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Diagnosis Source
                            </label>
                            <Input
                                value={asdProfile.diagnosis_source}
                                onChange={(e) => setAsdProfile({ ...asdProfile, diagnosis_source: e.target.value })}
                                placeholder="e.g., Clinical psychologist, Pediatrician, Child psychiatrist..."
                            />
                        </div>

                        {/* Severity Level */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Severity Level (DSM-5)
                            </label>
                            <select
                                value={asdProfile.severity_level}
                                onChange={(e) => setAsdProfile({ ...asdProfile, severity_level: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Not specified --</option>
                                <option value="Level 1">Level 1 - Requiring support</option>
                                <option value="Level 2">Level 2 - Requiring substantial support</option>
                                <option value="Level 3">Level 3 - Requiring very substantial support</option>
                            </select>
                        </div>

                        {/* Language Level */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Language Level
                            </label>
                            <select
                                value={asdProfile.language_level}
                                onChange={(e) => setAsdProfile({ ...asdProfile, language_level: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Not specified --</option>
                                <option value="Verbal">Verbal</option>
                                <option value="Minimally verbal">Minimally verbal</option>
                                <option value="Non-verbal">Non-verbal</option>
                            </select>
                        </div>

                        {/* Clinical Notes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Clinical Notes
                            </label>
                            <TextArea
                                value={asdProfile.notes}
                                onChange={(e) => setAsdProfile({ ...asdProfile, notes: e.target.value })}
                                placeholder="Additional clinical information, observations, or special considerations..."
                                rows={4}
                            />
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleSaveAsdProfile}
                                disabled={asdLoading}
                            >
                                {asdLoading ? 'Saving...' : 'Save ASD Profile'}
                            </Button>
                            {asdSuccess && (
                                <Alert variant="success" className="mb-0">
                                    ASD profile saved successfully!
                                </Alert>
                            )}
                        </div>
                    </div>
                </Card>
            )}


            {/* Autism Questionnaire - shown only if has_asd is true */}
            {id && formData.has_asd && (
                <Card className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Autism Screening Questionnaire</h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Complete this basic screening form. Responses are saved for record-keeping.
                    </p>

                    <div className="space-y-4">
                        {/* Question 1 */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                1. Social communication difficulties?
                            </label>
                            <select
                                value={asdFormResponses.social_communication}
                                onChange={(e) => setAsdFormResponses({ ...asdFormResponses, social_communication: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                            </select>
                        </div>

                        {/* Question 2 */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                2. Repetitive behaviors or routines?
                            </label>
                            <select
                                value={asdFormResponses.repetitive_behaviors}
                                onChange={(e) => setAsdFormResponses({ ...asdFormResponses, repetitive_behaviors: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                            </select>
                        </div>

                        {/* Question 3 */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                3. Sensory sensitivities (sound, light, texture, etc.)?
                            </label>
                            <select
                                value={asdFormResponses.sensory_sensitivities}
                                onChange={(e) => setAsdFormResponses({ ...asdFormResponses, sensory_sensitivities: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                            </select>
                        </div>

                        {/* Question 4 */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                4. Intense special interests or hobbies?
                            </label>
                            <select
                                value={asdFormResponses.special_interests}
                                onChange={(e) => setAsdFormResponses({ ...asdFormResponses, special_interests: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                            </select>
                        </div>

                        {/* Question 5 */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                5. Difficulty with changes in routine?
                            </label>
                            <select
                                value={asdFormResponses.routine_changes}
                                onChange={(e) => setAsdFormResponses({ ...asdFormResponses, routine_changes: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                            </select>
                        </div>

                        {/* Question 6 */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                6. Difficulties with eye contact?
                            </label>
                            <select
                                value={asdFormResponses.eye_contact}
                                onChange={(e) => setAsdFormResponses({ ...asdFormResponses, eye_contact: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                            </select>
                        </div>

                        {/* Question 7 */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                7. Difficulty understanding social cues?
                            </label>
                            <select
                                value={asdFormResponses.social_cues}
                                onChange={(e) => setAsdFormResponses({ ...asdFormResponses, social_cues: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                            </select>
                        </div>

                        {/* Question 8 */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <label className="block text-sm font-medium text-slate-900 mb-2">
                                8. Strong preference for sameness/predictability?
                            </label>
                            <select
                                value={asdFormResponses.preference_sameness}
                                onChange={(e) => setAsdFormResponses({ ...asdFormResponses, preference_sameness: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Unsure">Unsure</option>
                            </select>
                        </div>

                        {/* Clinician Summary */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Clinician Summary/Observations
                            </label>
                            <TextArea
                                value={asdFormSummary}
                                onChange={(e) => setAsdFormSummary(e.target.value)}
                                placeholder="Add your clinical observations or summary..."
                                rows={3}
                            />
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                onClick={handleSaveAsdForm}
                                disabled={asdFormLoading}
                            >
                                {asdFormLoading ? 'Saving...' : 'Save Questionnaire'}
                            </Button>
                            {asdFormSuccess && (
                                <Alert variant="success" className="mb-0">
                                    Autism questionnaire saved successfully!
                                </Alert>
                            )}
                        </div>
                    </div>

                    {/* Saved Forms List */}
                    {savedAsdForms.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <h4 className="font-semibold text-slate-900 mb-3">Previously Completed Forms</h4>
                            <div className="space-y-3">
                                {savedAsdForms.map((form) => (
                                    <div key={form.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {new Date(form.created_at).toLocaleDateString()} at {new Date(form.created_at).toLocaleTimeString()}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    Completed by: {form.created_by_username || 'Unknown'}
                                                </p>
                                            </div>
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                {form.form_version}
                                            </span>
                                        </div>
                                        {form.summary_text && (
                                            <p className="text-sm text-slate-700 mt-2 italic">
                                                "{form.summary_text}"
                                            </p>
                                        )}
                                        <details className="mt-3">
                                            <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                                                View Responses
                                            </summary>
                                            <div className="mt-2 pl-4 space-y-1 text-sm text-slate-600">
                                                {form.responses.social_communication && <p>• Social communication: {form.responses.social_communication}</p>}
                                                {form.responses.repetitive_behaviors && <p>• Repetitive behaviors: {form.responses.repetitive_behaviors}</p>}
                                                {form.responses.sensory_sensitivities && <p>• Sensory sensitivities: {form.responses.sensory_sensitivities}</p>}
                                                {form.responses.special_interests && <p>• Special interests: {form.responses.special_interests}</p>}
                                                {form.responses.routine_changes && <p>• Routine changes: {form.responses.routine_changes}</p>}
                                                {form.responses.eye_contact && <p>• Eye contact: {form.responses.eye_contact}</p>}
                                                {form.responses.social_cues && <p>• Social cues: {form.responses.social_cues}</p>}
                                                {form.responses.preference_sameness && <p>• Preference for sameness: {form.responses.preference_sameness}</p>}
                                            </div>
                                        </details>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Symptoms Checklist - shown when editing */}
            {id && (
                <Card className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Symptoms Checklist</h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Check all symptoms currently present. This is for clinical tracking only, not diagnostic assessment.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Mood Symptoms */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-slate-700 mb-2">Mood</h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.depression}
                                    onChange={() => handleSymptomChange('depression')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Depression</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.mania}
                                    onChange={() => handleSymptomChange('mania')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Mania</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.irritability}
                                    onChange={() => handleSymptomChange('irritability')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Irritability</span>
                            </label>
                        </div>

                        {/* Anxiety Symptoms */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-slate-700 mb-2">Anxiety</h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.anxiety}
                                    onChange={() => handleSymptomChange('anxiety')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Anxiety</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.panic}
                                    onChange={() => handleSymptomChange('panic')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Panic</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.ptsd}
                                    onChange={() => handleSymptomChange('ptsd')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">PTSD</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.ocd}
                                    onChange={() => handleSymptomChange('ocd')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">OCD</span>
                            </label>
                        </div>

                        {/* Other Clinical Symptoms */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-slate-700 mb-2">Other</h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.psychosis}
                                    onChange={() => handleSymptomChange('psychosis')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Psychosis</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.substance_use}
                                    onChange={() => handleSymptomChange('substance_use')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Substance Use</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.sleep_problem}
                                    onChange={() => handleSymptomChange('sleep_problem')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Sleep Problem</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.attention_problem}
                                    onChange={() => handleSymptomChange('attention_problem')}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-900">Attention Problem</span>
                            </label>
                        </div>

                        {/* Risk Factors */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-red-700 mb-2">Risk Factors</h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.suicidal_ideation}
                                    onChange={() => handleSymptomChange('suicidal_ideation')}
                                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                                />
                                <span className="text-sm text-slate-900">Suicidal Ideation</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={symptoms.self_harm}
                                    onChange={() => handleSymptomChange('self_harm')}
                                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                                />
                                <span className="text-sm text-slate-900">Self Harm</span>
                            </label>
                        </div>
                    </div>

                    {/* Clinical Notes */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Clinical Notes
                        </label>
                        <TextArea
                            value={symptoms.notes}
                            onChange={(e) => setSymptoms(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Brief clinical context or observations..."
                            rows={3}
                            className="mb-4"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSaveSymptoms}
                            disabled={symptomsLoading}
                        >
                            {symptomsLoading ? 'Saving...' : 'Save Symptoms'}
                        </Button>
                        {symptomsSaveSuccess && (
                            <Alert variant="success" className="mb-0">
                                Symptoms saved successfully!
                            </Alert>
                        )}
                    </div>
                </Card>
            )}


            {/* Psychiatric History Section - shown when editing */}
            {id && (
                <Card className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Psychiatric History</h3>

                    <TextArea
                        value={psychiatricHistory}
                        onChange={(e) => setPsychiatricHistory(e.target.value)}
                        placeholder="Enter psychiatric history narrative..."
                        rows={12}
                        className="mb-4"
                    />

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSavePsychiatricHistory}
                            disabled={historyLoading}
                        >
                            {historyLoading ? 'Saving...' : 'Save Psychiatric History'}
                        </Button>
                        {historySaveSuccess && (
                            <Alert variant="success" className="mb-0">
                                Psychiatric history saved successfully!
                            </Alert>
                        )}
                    </div>
                </Card>
            )}


            {/* Prescription Documents - shown when editing */}
            {id && (
                <Card className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Prescription Documents</h3>

                    {/* Upload Form */}
                    <form onSubmit={handleUploadPrescription} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="font-semibold text-sm text-slate-700 mb-3">Upload New Prescription</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Prescription Image *
                                </label>
                                <input
                                    id="prescription-upload"
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                    className="w-full text-sm text-slate-900 border border-slate-300 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">JPG, PNG, or WebP (max 5MB)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Prescription Date *
                                </label>
                                <Input
                                    type="date"
                                    value={prescriptionDate}
                                    onChange={(e) => setPrescriptionDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={uploadLoading}>
                                {uploadLoading ? 'Uploading...' : 'Upload Prescription'}
                            </Button>
                            {uploadSuccess && (
                                <Alert variant="success" className="mb-0">
                                    Prescription uploaded successfully!
                                </Alert>
                            )}
                        </div>
                    </form>

                    {/* Prescription List */}
                    <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-3">Uploaded Prescriptions</h4>

                        {prescriptions.length === 0 ? (
                            <p className="text-slate-500 italic text-sm">No prescriptions uploaded yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {prescriptions.map(prescription => (
                                    <div key={prescription.id} className="border border-slate-200 rounded-lg p-3 bg-white hover:shadow-md transition">
                                        <div className="aspect-square bg-slate-100 rounded-lg mb-3 overflow-hidden">
                                            <img
                                                src={`${API_BASE_URL}/documents/${prescription.id}/file`}
                                                alt={prescription.original_name}
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={() => window.open(`${API_BASE_URL}/documents/${prescription.id}/file`, '_blank')}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-900 truncate" title={prescription.original_name}>
                                                {prescription.original_name}
                                            </p>
                                            <p className="text-xs text-slate-600">
                                                <span className="font-semibold">Date:</span> {prescription.doc_date || 'Not specified'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Uploaded: {new Date(prescription.uploaded_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}


            {/* Follow-up Notes - shown when editing */}
            {id && (
                <Card className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">New Follow-up Note</h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Record patient changes and progress since last visit.
                    </p>

                    <div className="space-y-4">
                        {/* Appointment Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Related Appointment (Optional)
                            </label>
                            <select
                                value={followUpData.appointment_id}
                                onChange={(e) => setFollowUpData(prev => ({ ...prev, appointment_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- No appointment selected --</option>
                                {recentAppointments.map(apt => (
                                    <option key={apt.id} value={apt.id}>
                                        {apt.date} at {apt.time} - {apt.reason || 'General visit'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Main Changes Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                What changed since last visit? *
                            </label>
                            <TextArea
                                value={followUpData.changes_since_last_visit}
                                onChange={(e) => setFollowUpData(prev => ({ ...prev, changes_since_last_visit: e.target.value }))}
                                placeholder="Describe patient's progress, symptom changes, concerns, or observations..."
                                rows={6}
                                required
                            />
                        </div>

                        {/* Optional: Medication Adherence */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Medication Adherence Changes (Optional)
                            </label>
                            <TextArea
                                value={followUpData.medication_adherence_change}
                                onChange={(e) => setFollowUpData(prev => ({ ...prev, medication_adherence_change: e.target.value }))}
                                placeholder="Any changes in medication compliance or adherence..."
                                rows={2}
                            />
                        </div>

                        {/* Optional: Side Effects */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Side Effects or New Symptoms (Optional)
                            </label>
                            <TextArea
                                value={followUpData.side_effects_change}
                                onChange={(e) => setFollowUpData(prev => ({ ...prev, side_effects_change: e.target.value }))}
                                placeholder="Report any new side effects or symptoms..."
                                rows={2}
                            />
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                onClick={handleSaveFollowUp}
                                disabled={followUpLoading}
                            >
                                {followUpLoading ? 'Saving...' : 'Save Follow-up Note'}
                            </Button>
                            {followUpSuccess && (
                                <Alert variant="success" className="mb-0">
                                    Follow-up note saved successfully!
                                </Alert>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {id && (
                <Card className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Clinical Notes</h3>

                    <div className="mb-6">
                        <TextArea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add a new clinical note..."
                            rows={4}
                        />
                        <Button
                            onClick={handleAddNote}
                            disabled={noteLoading || !newNote.trim()}
                            className="mt-2"
                        >
                            {noteLoading ? 'Adding...' : 'Add Note'}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {notes.length === 0 ? (
                            <p className="text-slate-500 italic">No notes recorded.</p>
                        ) : (
                            notes.map(note => (
                                <div
                                    key={note.id}
                                    className={`p-4 rounded-lg border ${note.note_type === 'FOLLOW_UP'
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-slate-50 border-slate-200'
                                        }`}
                                >
                                    {/* Note Type Badge */}
                                    {note.note_type === 'FOLLOW_UP' && (
                                        <div className="mb-2">
                                            <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded">
                                                Follow-up Note
                                            </span>
                                        </div>
                                    )}

                                    {/* Main Content */}
                                    <div className="whitespace-pre-wrap mb-2 text-slate-900">{note.content}</div>

                                    {/* Follow-up Structured Fields */}
                                    {note.note_type === 'FOLLOW_UP' && (
                                        <div className="mt-3 space-y-2 border-t border-blue-200 pt-3">
                                            {note.medication_adherence_change && (
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-700">Medication Adherence: </span>
                                                    <span className="text-sm text-slate-600">{note.medication_adherence_change}</span>
                                                </div>
                                            )}
                                            {note.side_effects_change && (
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-700">Side Effects: </span>
                                                    <span className="text-sm text-slate-600">{note.side_effects_change}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Author and Timestamp */}
                                    <div className="text-sm text-slate-600 mt-2">
                                        {new Date(note.created_at).toLocaleString()} by {note.author_username || 'Unknown'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}
