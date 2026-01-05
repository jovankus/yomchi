import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPatientFinalReports, createFinalReport, updateFinalReport, deleteFinalReport } from '../api/final-reports';
import Card from '../components/Card';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { hasAccess, ADMIN_ROLES } from '../components/RoleProtectedRoute';

export default function FinalReports({ patientId, patientName }) {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [formData, setFormData] = useState({
        diagnosis: '',
        treatment_plan: '',
        summary: '',
        recommendations: ''
    });

    const canDelete = hasAccess(user?.role, ADMIN_ROLES);

    useEffect(() => {
        loadReports();
    }, [patientId]);

    const loadReports = async () => {
        try {
            setLoading(true);
            const data = await getPatientFinalReports(patientId);
            setReports(data.reports || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (editingReport) {
                await updateFinalReport(patientId, editingReport.id, formData);
            } else {
                await createFinalReport(patientId, formData);
            }
            setShowForm(false);
            setEditingReport(null);
            setFormData({ diagnosis: '', treatment_plan: '', summary: '', recommendations: '' });
            loadReports();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (report) => {
        setEditingReport(report);
        setFormData({
            diagnosis: report.diagnosis || '',
            treatment_plan: report.treatment_plan || '',
            summary: report.summary || '',
            recommendations: report.recommendations || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (reportId) => {
        if (!confirm('Are you sure you want to delete this report?')) return;

        try {
            await deleteFinalReport(patientId, reportId);
            loadReports();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleNew = () => {
        setEditingReport(null);
        setFormData({ diagnosis: '', treatment_plan: '', summary: '', recommendations: '' });
        setShowForm(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Final Reports</h2>
                {!showForm && (
                    <Button onClick={handleNew} size="sm">
                        + New Report
                    </Button>
                )}
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            {showForm && (
                <Card className="border-2 border-primary-200">
                    <h3 className="font-medium text-slate-800 mb-4">
                        {editingReport ? 'Edit Report' : 'New Final Report'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis</label>
                            <textarea
                                value={formData.diagnosis}
                                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                rows={3}
                                placeholder="Enter diagnosis..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Treatment Plan</label>
                            <textarea
                                value={formData.treatment_plan}
                                onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                rows={3}
                                placeholder="Enter treatment plan..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
                            <textarea
                                value={formData.summary}
                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                rows={3}
                                placeholder="Enter summary..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Recommendations</label>
                            <textarea
                                value={formData.recommendations}
                                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                rows={3}
                                placeholder="Enter recommendations..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">
                                {editingReport ? 'Save Changes' : 'Create Report'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {reports.length === 0 && !showForm ? (
                <div className="text-center py-8 text-slate-500">
                    No final reports yet. Click "New Report" to create one.
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <Card key={report.id} className="relative">
                            <div className="absolute top-3 right-3 flex gap-2">
                                <button
                                    onClick={() => handleEdit(report)}
                                    className="text-sm text-primary-600 hover:text-primary-800"
                                >
                                    Edit
                                </button>
                                {canDelete && (
                                    <button
                                        onClick={() => handleDelete(report.id)}
                                        className="text-sm text-red-600 hover:text-red-800"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>

                            <div className="text-xs text-slate-500 mb-3">
                                Created: {new Date(report.created_at).toLocaleDateString()} by {report.author_role?.replace('_', ' ')}
                                {report.updated_at !== report.created_at && (
                                    <span> • Updated: {new Date(report.updated_at).toLocaleDateString()}</span>
                                )}
                            </div>

                            {report.diagnosis && (
                                <div className="mb-3">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Diagnosis</div>
                                    <p className="text-slate-800 whitespace-pre-wrap">{report.diagnosis}</p>
                                </div>
                            )}

                            {report.treatment_plan && (
                                <div className="mb-3">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Treatment Plan</div>
                                    <p className="text-slate-800 whitespace-pre-wrap">{report.treatment_plan}</p>
                                </div>
                            )}

                            {report.summary && (
                                <div className="mb-3">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Summary</div>
                                    <p className="text-slate-800 whitespace-pre-wrap">{report.summary}</p>
                                </div>
                            )}

                            {report.recommendations && (
                                <div>
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Recommendations</div>
                                    <p className="text-slate-800 whitespace-pre-wrap">{report.recommendations}</p>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
