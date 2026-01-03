import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const ClinicContext = createContext(null);

export const ClinicProvider = ({ children }) => {
    const [clinic, setClinic] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkClinic = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/clinic/me`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.authenticated) {
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
            credentials: 'include'
        });
        setClinic(null);
    };

    return (
        <ClinicContext.Provider value={{ clinic, loading, loginClinic, logoutClinic }}>
            {children}
        </ClinicContext.Provider>
    );
};

export const useClinic = () => useContext(ClinicContext);
