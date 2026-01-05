import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthHeaders } from './ClinicContext';

const AuthContext = createContext(null);

// Token storage keys
const EMPLOYEE_TOKEN_KEY = 'yomchi_employee_token';
const DEVICE_TOKEN_KEY = 'yomchi_device_token';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.authenticated) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error('Auth check failed', err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (role, password, rememberDevice = false) => {
        // Get clinic token for mobile fallback
        const clinicToken = localStorage.getItem('yomchi_clinic_token');

        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                role,
                password,
                rememberDevice,
                deviceName: navigator.userAgent.substring(0, 100),
                clinicToken
            }),
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();

            // Store JWT token for mobile browsers
            if (data.token) {
                localStorage.setItem(EMPLOYEE_TOKEN_KEY, data.token);
            }

            // Store device token if Remember Device was selected
            if (data.deviceToken) {
                localStorage.setItem(DEVICE_TOKEN_KEY, data.deviceToken);
            }

            setUser(data.user);
            return { success: true };
        } else {
            const data = await res.json();
            return { success: false, message: data.message };
        }
    };

    const deviceLogin = async (deviceToken) => {
        const clinicToken = localStorage.getItem('yomchi_clinic_token');

        try {
            const res = await fetch(`${API_BASE_URL}/auth/device-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    deviceToken,
                    clinicToken
                }),
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    localStorage.setItem(EMPLOYEE_TOKEN_KEY, data.token);
                }
                setUser(data.user);
                return { success: true };
            } else {
                // Device token invalid or expired - clear it
                localStorage.removeItem(DEVICE_TOKEN_KEY);
                return { success: false };
            }
        } catch (err) {
            console.error('Device login failed:', err);
            return { success: false };
        }
    };

    const logout = async () => {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders()
        });

        // Clear tokens (keep device token for remember device functionality)
        localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
        // Note: We don't clear DEVICE_TOKEN_KEY so user can auto-login next time

        setUser(null);
    };

    const fullLogout = async () => {
        await logout();
        // Also clear device token for full logout
        localStorage.removeItem(DEVICE_TOKEN_KEY);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, fullLogout, deviceLogin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
