import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { Input } from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { clinic, logoutClinic } = useClinic();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await login(username, password);
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
                        <span className="ml-2 text-sm text-primary-600 font-medium">Employee</span>
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
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">Employee Login</h1>
                    <p className="text-slate-500 text-sm">Sign in to continue to {clinic?.name || 'the clinic'}</p>
                </div>

                {error && <Alert variant="error" className="mb-4">{error}</Alert>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                    />

                    <Button type="submit" className="w-full" size="lg">
                        Sign In
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
