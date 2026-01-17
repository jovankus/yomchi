import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../api/apiUtils';
import Button from '../components/Button';
import { Input } from '../components/Input';
import Card from '../components/Card';
import Alert from '../components/Alert';
import '../styles/prescription-print.css';

export default function PrescriptionForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form fields
    const [patientName, setPatientName] = useState('');
    const [age, setAge] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [drugs, setDrugs] = useState('');

    useEffect(() => {
        fetchPatient();
    }, [id]);

    const fetchPatient = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch patient');
            const data = await res.json();
            setPatient(data.patient);

            // Auto-fill form
            setPatientName(`${data.patient.first_name} ${data.patient.last_name}`);
            if (data.patient.date_of_birth) {
                const calcAge = calculateAge(data.patient.date_of_birth);
                setAge(calcAge.toString());
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (error) return <Alert variant="error">{error}</Alert>;

    return (
        <div>
            {/* Non-printable: Form inputs */}
            <div className="no-print p-6">
                <div className="mb-4">
                    <Button variant="secondary" onClick={() => navigate(`/patients/${id}`)}>
                        ← Back to Patient
                    </Button>
                </div>

                <Card>
                    <h2 className="text-xl font-bold mb-4">Prescription for {patient?.first_name} {patient?.last_name}</h2>

                    <div className="space-y-4">
                        <Input
                            label="Patient Name"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                        />

                        <Input
                            label="Age"
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                        />

                        <Input
                            label="Date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Drugs / Prescription
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="10"
                                value={drugs}
                                onChange={(e) => setDrugs(e.target.value)}
                                placeholder="Enter medication details..."
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <Button onClick={handlePrint}>
                            🖨️ Print Prescription
                        </Button>
                        <Button variant="secondary" onClick={() => navigate(`/patients/${id}`)}>
                            Cancel
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Printable: A5 prescription */}
            <div className="print-only">
                <div className="a5-page">
                    {/* Patient Name - right-aligned at specified position */}
                    <div className="rx-field rx-name" style={{
                        right: '10mm',
                        top: '55.5mm',
                        textAlign: 'right',
                        maxWidth: '52mm'
                    }}>
                        {patientName}
                    </div>

                    {/* Age - right-aligned */}
                    <div className="rx-field rx-age" style={{
                        right: '10mm',
                        top: '61.9mm',
                        textAlign: 'right'
                    }}>
                        {age}
                    </div>

                    {/* Date - right-aligned */}
                    <div className="rx-field rx-date" style={{
                        right: '10mm',
                        top: '68.4mm',
                        textAlign: 'right'
                    }}>
                        {new Date(date).toLocaleDateString('en-GB')}
                    </div>

                    {/* Drugs block - left-aligned */}
                    <div className="rx-field rx-drugs" style={{
                        left: '20.5mm',
                        top: '79.6mm',
                        width: '108.2mm',
                        height: '103.6mm'
                    }}>
                        {drugs}
                    </div>
                </div>
            </div>
        </div>
    );
}
