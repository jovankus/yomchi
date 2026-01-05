import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import { API_BASE_URL } from '../config';

export default function PatientPrintView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [psychiatricHistory, setPsychiatricHistory] = useState('');
    const [symptoms, setSymptoms] = useState(null);
    const [notes, setNotes] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Config
    const [notesLimit, setNotesLimit] = useState(10);
    const [appointmentsLimit, setAppointmentsLimit] = useState(10);

    useEffect(() => {
        fetchAllData();
    }, [id]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchPatient(),
                fetchPsychiatricHistory(),
                fetchSymptoms(),
                fetchNotes(),
                fetchPrescriptions(),
                fetchAppointments()
            ]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchPatient = async () => {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setPatient(data.patient);
        }
    };

    const fetchPsychiatricHistory = async () => {
        const res = await fetch(`${API_BASE_URL}/patients/${id}/psychiatric-profile`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setPsychiatricHistory(data.profile?.psychiatric_history_text || '');
        }
    };

    const fetchSymptoms = async () => {
        const res = await fetch(`${API_BASE_URL}/patients/${id}/symptoms`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setSymptoms(data.symptoms);
        }
    };

    const fetchNotes = async () => {
        const res = await fetch(`${API_BASE_URL}/clinical-notes/patient/${id}`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setNotes(data.notes || data || []);
        }
    };

    const fetchPrescriptions = async () => {
        const res = await fetch(`${API_BASE_URL}/patients/${id}/documents?doc_type=PRESCRIPTION`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setPrescriptions(data.documents || []);
        }
    };

    const fetchAppointments = async () => {
        const res = await fetch(`${API_BASE_URL}/patients/${id}/recent-appointments`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            setAppointments(data.appointments || []);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return '';
        const today = new Date();
        const birth = new Date(dob);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-GB');
    };

    const getActiveSymptoms = () => {
        if (!symptoms) return [];
        const symptomLabels = {
            depression: 'Depression',
            anxiety: 'Anxiety',
            panic: 'Panic',
            ptsd: 'PTSD',
            ocd: 'OCD',
            psychosis: 'Psychosis',
            mania: 'Mania',
            substance_use: 'Substance Use',
            sleep_problem: 'Sleep Problem',
            suicidal_ideation: 'Suicidal Ideation',
            self_harm: 'Self Harm',
            irritability: 'Irritability',
            attention_problem: 'Attention Problem'
        };
        return Object.entries(symptomLabels)
            .filter(([key]) => symptoms[key])
            .map(([, label]) => label);
    };

    const generateTextExport = () => {
        const lines = [];
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push(`PATIENT RECORD: ${patient?.first_name} ${patient?.last_name}`);
        lines.push(`Generated: ${new Date().toLocaleString()}`);
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push('');

        // Demographics
        lines.push('▓ DEMOGRAPHICS');
        lines.push('───────────────────────────────────────────────────────────');
        lines.push(`Name: ${patient?.first_name} ${patient?.last_name}`);
        lines.push(`Date of Birth: ${formatDate(patient?.date_of_birth)} (Age: ${calculateAge(patient?.date_of_birth)})`);
        lines.push(`Phone: ${patient?.phone || '—'}`);
        lines.push(`Email: ${patient?.email || '—'}`);
        lines.push(`Address: ${patient?.address || '—'}`);
        lines.push(`Place of Living: ${patient?.place_of_living || '—'}`);
        lines.push(`Education: ${patient?.education_level || '—'}`);
        lines.push(`Marital Status: ${patient?.marital_status || '—'}`);
        lines.push(`Occupation: ${patient?.occupation || '—'}`);
        lines.push(`Living With: ${patient?.living_with || '—'}`);
        if (patient?.has_asd) lines.push(`ASD: Yes`);
        lines.push('');

        // Psychiatric History
        lines.push('▓ PSYCHIATRIC HISTORY');
        lines.push('───────────────────────────────────────────────────────────');
        lines.push(psychiatricHistory || 'No psychiatric history recorded.');
        lines.push('');

        // Symptoms
        lines.push('▓ SYMPTOMS CHECKLIST');
        lines.push('───────────────────────────────────────────────────────────');
        const activeSymptoms = getActiveSymptoms();
        if (activeSymptoms.length > 0) {
            lines.push(`Active: ${activeSymptoms.join(', ')}`);
        } else {
            lines.push('No active symptoms checked.');
        }
        if (symptoms?.notes) {
            lines.push(`Notes: ${symptoms.notes}`);
        }
        lines.push('');

        // Notes
        lines.push(`▓ CLINICAL NOTES (Last ${notesLimit})`);
        lines.push('───────────────────────────────────────────────────────────');
        const displayNotes = notes.slice(0, notesLimit);
        if (displayNotes.length > 0) {
            displayNotes.forEach((note, i) => {
                lines.push(`[${formatDate(note.created_at)}] ${note.content}`);
            });
        } else {
            lines.push('No clinical notes.');
        }
        lines.push('');

        // Appointments
        lines.push(`▓ APPOINTMENTS (Last ${appointmentsLimit})`);
        lines.push('───────────────────────────────────────────────────────────');
        const displayAppointments = appointments.slice(0, appointmentsLimit);
        if (displayAppointments.length > 0) {
            displayAppointments.forEach(apt => {
                lines.push(`${formatDate(apt.start_at)} | ${apt.session_type || '—'} | ${apt.payment_status || '—'}`);
            });
        } else {
            lines.push('No appointments.');
        }
        lines.push('');

        // Prescriptions
        lines.push('▓ PRESCRIPTIONS');
        lines.push('───────────────────────────────────────────────────────────');
        if (prescriptions.length > 0) {
            prescriptions.forEach(p => {
                lines.push(`${formatDate(p.doc_date)} | ${p.original_filename}`);
            });
        } else {
            lines.push('No prescriptions uploaded.');
        }
        lines.push('');
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push('END OF PATIENT RECORD');
        lines.push('═══════════════════════════════════════════════════════════');

        return lines.join('\n');
    };

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(generateTextExport());
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 3000);
        } catch (err) {
            alert('Failed to copy to clipboard');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-slate-500">Loading patient data...</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="text-center py-12 bg-red-50 rounded-lg">
                    <p className="text-red-600">{error || 'Patient not found'}</p>
                    <Link to="/patients">
                        <Button className="mt-4">← Back to Patients</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const activeSymptoms = getActiveSymptoms();

    return (
        <>
            {/* Print Controls - Hidden when printing */}
            <div className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to={`/patients/${id}`}>
                            <Button variant="secondary">← Back to Patient</Button>
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-800">
                            Patient Export: {patient.first_name} {patient.last_name}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600 border-r border-slate-200 pr-4">
                            <label>Notes:</label>
                            <select
                                value={notesLimit}
                                onChange={(e) => setNotesLimit(parseInt(e.target.value))}
                                className="px-2 py-1 border rounded"
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">All</option>
                            </select>
                            <label className="ml-2">Appts:</label>
                            <select
                                value={appointmentsLimit}
                                onChange={(e) => setAppointmentsLimit(parseInt(e.target.value))}
                                className="px-2 py-1 border rounded"
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">All</option>
                            </select>
                        </div>
                        <Button variant="secondary" onClick={() => setShowCopyModal(true)}>
                            📋 Copy Text
                        </Button>
                        <Button onClick={handlePrint}>
                            🖨️ Print / PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Printable Content */}
            <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
                {/* Header */}
                <div className="text-center mb-8 print:mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {patient.first_name} {patient.last_name}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Patient Record • Generated {new Date().toLocaleDateString()}
                    </p>
                </div>

                {/* Demographics Section */}
                <section className="mb-8 print:mb-6 print:break-inside-avoid">
                    <h2 className="text-lg font-bold text-slate-800 border-b-2 border-blue-500 pb-2 mb-4">
                        👤 Demographics
                    </h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div><span className="text-slate-500">Full Name:</span> <strong>{patient.first_name} {patient.last_name}</strong></div>
                        <div><span className="text-slate-500">DOB / Age:</span> <strong>{formatDate(patient.date_of_birth)} ({calculateAge(patient.date_of_birth)} years)</strong></div>
                        <div><span className="text-slate-500">Phone:</span> <strong>{patient.phone || '—'}</strong></div>
                        <div><span className="text-slate-500">Email:</span> <strong>{patient.email || '—'}</strong></div>
                        <div className="col-span-2"><span className="text-slate-500">Address:</span> <strong>{patient.address || '—'}</strong></div>
                        <div><span className="text-slate-500">Place of Living:</span> <strong>{patient.place_of_living || '—'}</strong></div>
                        <div><span className="text-slate-500">Education:</span> <strong>{patient.education_level || '—'}</strong></div>
                        <div><span className="text-slate-500">Marital Status:</span> <strong>{patient.marital_status || '—'}</strong></div>
                        <div><span className="text-slate-500">Occupation:</span> <strong>{patient.occupation || '—'}</strong></div>
                        <div><span className="text-slate-500">Living With:</span> <strong>{patient.living_with || '—'}</strong></div>
                        {patient.has_asd && <div className="col-span-2"><span className="text-blue-600 font-semibold">🧩 ASD Patient</span></div>}
                    </div>
                </section>

                {/* Psychiatric History */}
                <section className="mb-8 print:mb-6 print:break-inside-avoid">
                    <h2 className="text-lg font-bold text-slate-800 border-b-2 border-purple-500 pb-2 mb-4">
                        🧠 Psychiatric History
                    </h2>
                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap print:bg-transparent print:p-0">
                        {psychiatricHistory || <em className="text-slate-400">No psychiatric history recorded.</em>}
                    </div>
                </section>

                {/* Symptoms */}
                <section className="mb-8 print:mb-6 print:break-inside-avoid">
                    <h2 className="text-lg font-bold text-slate-800 border-b-2 border-orange-500 pb-2 mb-4">
                        ⚠️ Symptoms Checklist
                    </h2>
                    {activeSymptoms.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {activeSymptoms.map(s => (
                                <span key={s} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium print:bg-transparent print:border print:border-orange-300">
                                    {s}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 italic text-sm">No active symptoms checked.</p>
                    )}
                    {symptoms?.notes && (
                        <p className="text-sm text-slate-600 mt-2"><strong>Additional notes:</strong> {symptoms.notes}</p>
                    )}
                </section>

                {/* Clinical Notes */}
                <section className="mb-8 print:mb-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b-2 border-green-500 pb-2 mb-4">
                        📝 Clinical Notes <span className="font-normal text-slate-500">(Last {notesLimit})</span>
                    </h2>
                    {notes.slice(0, notesLimit).length > 0 ? (
                        <div className="space-y-3">
                            {notes.slice(0, notesLimit).map((note, i) => (
                                <div key={note.id || i} className="border-l-4 border-green-300 pl-4 py-2 print:break-inside-avoid">
                                    <div className="text-xs text-slate-500 mb-1">{formatDate(note.created_at)}</div>
                                    <div className="text-sm text-slate-700">{note.content}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 italic text-sm">No clinical notes.</p>
                    )}
                </section>

                {/* Appointments */}
                <section className="mb-8 print:mb-6">
                    <h2 className="text-lg font-bold text-slate-800 border-b-2 border-teal-500 pb-2 mb-4">
                        📅 Appointments <span className="font-normal text-slate-500">(Last {appointmentsLimit})</span>
                    </h2>
                    {appointments.slice(0, appointmentsLimit).length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 print:bg-transparent">
                                <tr>
                                    <th className="text-left px-3 py-2 font-semibold">Date</th>
                                    <th className="text-left px-3 py-2 font-semibold">Type</th>
                                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                                    <th className="text-left px-3 py-2 font-semibold">Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.slice(0, appointmentsLimit).map((apt, i) => (
                                    <tr key={apt.id || i} className="border-b border-slate-200">
                                        <td className="px-3 py-2">{formatDate(apt.start_at)}</td>
                                        <td className="px-3 py-2">{apt.session_type || '—'}</td>
                                        <td className="px-3 py-2">{apt.status || '—'}</td>
                                        <td className="px-3 py-2">{apt.payment_status || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-slate-400 italic text-sm">No appointments.</p>
                    )}
                </section>

                {/* Prescriptions */}
                <section className="mb-8 print:mb-6 print:break-inside-avoid">
                    <h2 className="text-lg font-bold text-slate-800 border-b-2 border-pink-500 pb-2 mb-4">
                        💊 Prescriptions
                    </h2>
                    {prescriptions.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 print:bg-transparent">
                                <tr>
                                    <th className="text-left px-3 py-2 font-semibold">Date</th>
                                    <th className="text-left px-3 py-2 font-semibold">Filename</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prescriptions.map((p, i) => (
                                    <tr key={p.id || i} className="border-b border-slate-200">
                                        <td className="px-3 py-2">{formatDate(p.doc_date)}</td>
                                        <td className="px-3 py-2">{p.original_filename}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-slate-400 italic text-sm">No prescriptions uploaded.</p>
                    )}
                </section>

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 pt-8 border-t border-slate-200 print:mt-8">
                    Generated by Yomchi Healthcare • {new Date().toLocaleString()}
                </div>
            </div>

            {/* Copy Text Modal */}
            {showCopyModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden"
                    onClick={() => setShowCopyModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white flex items-center justify-between">
                            <h2 className="text-lg font-bold">📋 Copy Patient Text</h2>
                            <button
                                onClick={() => setShowCopyModal(false)}
                                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <textarea
                                readOnly
                                value={generateTextExport()}
                                className="w-full h-96 p-4 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg resize-none"
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                            {copySuccess && (
                                <span className="text-green-600 font-medium">✅ Copied to clipboard!</span>
                            )}
                            <div className="flex gap-3 ml-auto">
                                <Button variant="secondary" onClick={() => setShowCopyModal(false)}>
                                    Close
                                </Button>
                                <Button onClick={handleCopyText}>
                                    📋 Copy to Clipboard
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    .print\\:mb-6 { margin-bottom: 1.5rem !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:max-w-none { max-width: none !important; }
                    .print\\:bg-transparent { background: transparent !important; }
                    .print\\:break-inside-avoid { break-inside: avoid !important; }
                    .print\\:border { border: 1px solid !important; }
                    .print\\:mt-8 { margin-top: 2rem !important; }
                }
            `}</style>
        </>
    );
}
