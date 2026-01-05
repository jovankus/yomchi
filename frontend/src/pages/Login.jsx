import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { Input } from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';

const ROLES = [
    { value: 'SENIOR_DOCTOR', label: 'Senior Doctor' },
    { value: 'PERMANENT_DOCTOR', label: 'Permanent Doctor' },
    { value: 'DOCTOR', label: 'Doctor' },
    { value: 'SECRETARY', label: 'Secretary' }
];

export default function Login() {
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [rememberDevice, setRememberDevice] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, deviceLogin } = useAuth();
    const { clinic, logoutClinic } = useClinic();
    const navigate = useNavigate();

    // Try device auto-login on mount
    useEffect(() => {
        const tryDeviceLogin = async () => {
            const deviceToken = localStorage.getItem('yomchi_device_token');
            if (deviceToken && deviceLogin) {
                setLoading(true);
                const result = await deviceLogin(deviceToken);
                if (result.success) {
                    navigate('/appointments');
                }
                setLoading(false);
            }
        };
        tryDeviceLogin();
    }, [deviceLogin, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!role) {
            setError('Please select a role');
            return;
        }
        setLoading(true);
        const res = await login(role, password, rememberDevice);
        setLoading(false);
        if (res.success) {
            navigate('/appointments');
        } else {
            setError(res.message);
        }
    };

    const handleSwitchClinic = async () => {
        await logoutClinic();
        navigate('/clinic-login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-slate-50 to-primary-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-slate-600">Checking device session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-slate-50 to-primary-100 flex items-center justify-center px-4">
            <Card className="w-full max-w-md">
                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                            ✓
                        </div>
                        <span className="ml-2 text-sm text-green-600 font-medium">Clinic</span>
                    </div>
                    <div className="w-8 h-0.5 bg-primary-300"></div>
                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
                            2
                        </div>
                        <span className="ml-2 text-sm text-primary-600 font-medium">Role</span>
                    </div>
                </div>

                <div className="text-center mb-6">
                    {clinic && (
                        <div className="mb-3 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm inline-flex items-center gap-2">
                            <span className="font-semibold">{clinic.name}</span>
                            <button
                                onClick={handleSwitchClinic}
                                className="text-xs text-primary-500 hover:text-primary-700 underline"
                            >
                                switch
                            </button>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">Select Your Role</h1>
                    <p className="text-slate-500 text-sm">Choose your role and enter the password</p>
                </div>

                {error && <Alert variant="error" className="mb-4">{error}</Alert>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-slate-900 text-base"
                            required
                        >
                            <option value="">Select your role...</option>
                            {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter the role password"
                        required
                    />

                    {/* Remember This Device Checkbox */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="rememberDevice"
                            checked={rememberDevice}
                            onChange={(e) => setRememberDevice(e.target.checked)}
                            className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="rememberDevice" className="text-sm text-slate-600">
                            Remember this device (stay logged in for 60 days)
                        </label>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

                <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                    <button
                        onClick={handleSwitchClinic}
                        className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                    >
                        ← Back to Clinic Login
                    </button>
                </div>
            </Card>
        </div>
    );
}
