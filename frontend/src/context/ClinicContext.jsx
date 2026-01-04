import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const ClinicContext = createContext(null);

// Token storage key
const CLINIC_TOKEN_KEY = 'yomchi_clinic_token';

// Get auth headers for API calls
export const getAuthHeaders = () => {
    const clinicToken = localStorage.getItem(CLINIC_TOKEN_KEY);
    const employeeToken = localStorage.getItem('yomchi_employee_token');
    // Prefer employee token if available
    const token = employeeToken || clinicToken;

    if (token) {
        return { 'Authorization': `Bearer ${token}` };
    }
    return {};
};

export const ClinicProvider = ({ children }) => {
    const [clinic, setClinic] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkClinic = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/clinic/me`, {
                credentials: 'include',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.authenticated || data.clinic) {
                setClinic(data.clinic);
            } else {
                setClinic(null);
            }
        } catch (err) {
            console.error('Clinic check failed', err);
            setClinic(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkClinic();
    }, []);

    const loginClinic = async (clinicName, clinicPassword) => {
        const res = await fetch(`${API_BASE_URL}/clinic/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinic_name: clinicName, clinic_password: clinicPassword }),
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();

            // Store JWT token for mobile browsers
            if (data.token) {
                localStorage.setItem(CLINIC_TOKEN_KEY, data.token);
            }

            setClinic(data.clinic);
            return { success: true };
        } else {
            const data = await res.json();
            return { success: false, message: data.error };
        }
    };

    const logoutClinic = async () => {
        await fetch(`${API_BASE_URL}/clinic/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders()
        });

        // Clear tokens
        localStorage.removeItem(CLINIC_TOKEN_KEY);
        localStorage.removeItem('yomchi_employee_token');

        setClinic(null);
    };

    return (
        <ClinicContext.Provider value={{ clinic, loading, loginClinic, logoutClinic, getAuthHeaders }}>
            {children}
        </ClinicContext.Provider>
    );
};

export const useClinic = () => useContext(ClinicContext);

