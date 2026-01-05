import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getAuthHeaders } from './ClinicContext';

const AuthContext = createContext(null);

// Token storage key
const EMPLOYEE_TOKEN_KEY = 'yomchi_employee_token';

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

    const login = async (role, password) => {
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
                clinicToken: clinicToken // Send clinic token in body as backup
            }),
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();

            // Store JWT token for mobile browsers
            if (data.token) {
                localStorage.setItem(EMPLOYEE_TOKEN_KEY, data.token);
            }

            setUser(data.user);
            return { success: true };
        } else {
            const data = await res.json();
            return { success: false, message: data.message };
        }
    };

    const logout = async () => {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders()
        });

        // Clear employee token (keep clinic token for switch user)
        localStorage.removeItem(EMPLOYEE_TOKEN_KEY);

        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

