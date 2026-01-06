import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../components/Button';
import { API_BASE_URL } from '../config';

export default function PatientReportView() {
    const { id } = useParams();
    const [patient, setPatient] = useState(null);
    const [psychiatricHistory, setPsychiatricHistory] = useState('');
    const [symptoms, setSymptoms] = useState(null);
    const [notes, setNotes] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

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
        lines.push(`PATIENT REPORT: ${patient?.first_name} ${patient?.last_name}`);
        lines.push(`Generated: ${new Date().toLocaleString()}`);
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push('');

        lines.push('▓ DEMOGRAPHICS');
        lines.push('───────────────────────────────────────────────────────────');
        lines.push(`Name: ${patient?.first_name} ${patient?.last_name}`);
        lines.push(`Date of Birth: ${formatDate(patient?.date_of_birth)} (Age: ${calculateAge(patient?.date_of_birth)})`);
        lines.push(`Phone: ${patient?.phone || '—'}`);
        lines.push(`Place of Living: ${patient?.place_of_living || '—'}`);
        if (patient?.has_asd) lines.push(`ASD: Yes`);
        lines.push('');

        lines.push('▓ PSYCHIATRIC HISTORY');
        lines.push('───────────────────────────────────────────────────────────');
        lines.push(psychiatricHistory || 'No psychiatric history recorded.');
        lines.push('');

        lines.push('▓ SYMPTOMS');
        lines.push('───────────────────────────────────────────────────────────');
        const activeSymptoms = getActiveSymptoms();
        if (activeSymptoms.length > 0) {
            lines.push(`Active: ${activeSymptoms.join(', ')}`);
        } else {
            lines.push('No active symptoms.');
        }
        lines.push('');

        lines.push(`▓ CLINICAL NOTES (Last ${notesLimit})`);
        lines.push('───────────────────────────────────────────────────────────');
        const displayNotes = notes.slice(0, notesLimit);
        if (displayNotes.length > 0) {
            displayNotes.forEach((note) => {
                lines.push(`[${formatDate(note.created_at)}] ${note.content}`);
            });
        } else {
            lines.push('No clinical notes.');
        }
        lines.push('');

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
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push('END OF REPORT');
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
                    <p className="text-slate-500">Loading patient report...</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="text-center py-12 bg-red-50 rounded-lg">
                    <p className="text-red-600">{error || 'Patient not found'}</p>
                    <Link to="/patient-reports">
                        <Button className="mt-4">← Back to Reports</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const activeSymptoms = getActiveSymptoms();

    return (
        <>
            {/* Controls - Hidden when printing */}
            <div className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/patient-reports">
                            <Button variant="secondary">← Back to Reports</Button>
                        </Link>
                        <h1 className="text-lg font-semibold text-slate-800">
                            Patient Report: {patient.first_name} {patient.last_name}
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

            {/* Report Content */}
            <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
                {/* Header */}
                <div className="text-center mb-8 print:mb-6">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {patient.first_name} {patient.last_name}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Patient Report • Generated {new Date().toLocaleDateString()}
                    </p>
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        READ-ONLY REPORT
                    </span>
                </div>

                {/* Demographics */}
                <section className="mb-8 print:mb-6 print:break-inside-avoid">
                    <h2 className="text-lg font-bold text-slate-800 border-b-2 border-blue-500 pb-2 mb-4">
                        👤 Demographics
                    </h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div><span className="text-slate-500">Full Name:</span> <strong>{patient.first_name} {patient.last_name}</strong></div>
                        <div><span className="text-slate-500">DOB / Age:</span> <strong>{formatDate(patient.date_of_birth)} ({calculateAge(patient.date_of_birth)} years)</strong></div>
                        <div><span className="text-slate-500">Phone:</span> <strong>{patient.phone || '—'}</strong></div>
                        <div><span className="text-slate-500">Place of Living:</span> <strong>{patient.place_of_living || '—'}</strong></div>
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
                        ⚠️ Symptoms
                    </h2>
                    {activeSymptoms.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {activeSymptoms.map(s => (
                                <span key={s} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                    {s}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 italic text-sm">No active symptoms checked.</p>
                    )}
                    {symptoms?.notes && (
                        <p className="text-sm text-slate-600 mt-2"><strong>Notes:</strong> {symptoms.notes}</p>
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
                            <h2 className="text-lg font-bold">📋 Copy Report Text</h2>
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
                    .print\\:mt-8 { margin-top: 2rem !important; }
                }
            `}</style>
        </>
    );
}
