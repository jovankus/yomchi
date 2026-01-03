import { useState, useEffect } from 'react';
import PageTitle from '../components/PageTitle';
import { API_BASE_URL } from '../config';

const API_BASE = API_BASE_URL;

export default function BackupSettings() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [backing, setBacking] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/backup/status`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            } else {
                setMessage({ type: 'error', text: 'Failed to fetch backup status' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = async () => {
        setBacking(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/backup/google-sheets`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({
                    type: 'success',
                    text: `Backup completed! Exported ${data.rowsExported.patients} patients, ${data.rowsExported.appointments} appointments, ${data.rowsExported.clinicalNotes} notes.`,
                });
                fetchStatus();
            } else {
                setMessage({ type: 'error', text: data.error || 'Backup failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error: ' + err.message });
        } finally {
            setBacking(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="space-y-6">
            <PageTitle
                title="Backup Settings"
                subtitle="Export your data to Google Sheets for external backup"
            />

            {/* Status Messages */}
            {message && (
                <div className={`p-4 rounded-xl border ${message.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    <p className="font-medium">{message.text}</p>
                </div>
            )}

            {/* Configuration Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Google Sheets Integration</h2>

                {loading ? (
                    <div className="flex items-center gap-2 text-slate-500">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        Loading configuration...
                    </div>
                ) : status ? (
                    <div className="space-y-4">
                        {/* Configuration Status */}
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.configured
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                {status.configured ? '✓ Configured' : '⚠ Not Configured'}
                            </span>
                        </div>

                        {!status.configured && (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm text-slate-600 mb-3">
                                    <strong>Setup Required:</strong> To enable Google Sheets backup:
                                </p>
                                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
                                    <li>Create a Google Cloud project and enable Sheets API</li>
                                    <li>Create a Service Account and download JSON credentials</li>
                                    <li>Save credentials as <code className="bg-slate-200 px-1 rounded">google-credentials.json</code> in backend folder</li>
                                    <li>Set <code className="bg-slate-200 px-1 rounded">GOOGLE_SPREADSHEET_ID</code> environment variable</li>
                                    <li>Share your Google Sheet with the service account email</li>
                                </ol>
                            </div>
                        )}

                        {/* Last Backup Info */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                            <div>
                                <p className="text-sm text-slate-500">Last Backup</p>
                                <p className="font-medium text-slate-800">
                                    {formatDate(status.lastBackup?.timestamp)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Status</p>
                                <p className={`font-medium ${status.lastBackup?.status === 'success'
                                        ? 'text-green-600'
                                        : status.lastBackup?.status === 'failed'
                                            ? 'text-red-600'
                                            : 'text-slate-500'
                                    }`}>
                                    {status.lastBackup?.status === 'success' ? '✓ Success'
                                        : status.lastBackup?.status === 'failed' ? '✗ Failed'
                                            : 'Never run'}
                                </p>
                            </div>
                        </div>

                        {/* Last Backup Details */}
                        {status.lastBackup?.details && status.lastBackup.status === 'success' && (
                            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">{status.lastBackup.details.patients}</p>
                                    <p className="text-sm text-slate-500">Patients</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-600">{status.lastBackup.details.appointments}</p>
                                    <p className="text-sm text-slate-500">Appointments</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{status.lastBackup.details.clinicalNotes}</p>
                                    <p className="text-sm text-slate-500">Notes</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-slate-500">Unable to load status</p>
                )}
            </div>

            {/* Backup Action Card */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-1">Backup to Google Sheets</h3>
                        <p className="text-blue-100 text-sm">
                            Export all patients, appointments, and clinical notes to your Google Sheet
                        </p>
                    </div>
                    <button
                        onClick={handleBackup}
                        disabled={backing || !status?.configured}
                        className={`px-6 py-3 rounded-xl font-semibold text-lg transition-all duration-200 ${backing || !status?.configured
                                ? 'bg-white/20 cursor-not-allowed text-white/50'
                                : 'bg-white text-blue-600 hover:bg-blue-50 hover:shadow-lg transform hover:-translate-y-0.5'
                            }`}
                    >
                        {backing ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                                Backing up...
                            </span>
                        ) : (
                            '🚀 Backup Now'
                        )}
                    </button>
                </div>
            </div>

            {/* Data Included Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Data Included in Backup</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="text-2xl mb-2">👥</div>
                        <h3 className="font-semibold text-blue-800">Patients</h3>
                        <p className="text-sm text-blue-600">Demographics, contact info, ASD status</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="text-2xl mb-2">📅</div>
                        <h3 className="font-semibold text-purple-800">Appointments</h3>
                        <p className="text-sm text-purple-600">All sessions with payment status</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-2xl mb-2">📝</div>
                        <h3 className="font-semibold text-green-800">Clinical Notes</h3>
                        <p className="text-sm text-green-600">Session notes and observations</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
