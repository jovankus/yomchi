import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const PharmacyContext = createContext();

export function PharmacyProvider({ children }) {
    const [selectedPharmacyId, setSelectedPharmacyId] = useState(() => {
        return localStorage.getItem('selectedPharmacyId') || '';
    });
    const [pharmacies, setPharmacies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPharmacies();
    }, []);

    const fetchPharmacies = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/pharmacies`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setPharmacies(data);

                // If selected pharmacy is no longer in list, clear it
                if (selectedPharmacyId && !data.find(p => p.id == selectedPharmacyId)) {
                    setSelectedPharmacyId('');
                    localStorage.removeItem('selectedPharmacyId');
                }
            }
        } catch (err) {
            console.error('Failed to fetch pharmacies', err);
        } finally {
            setLoading(false);
        }
    };

    const selectPharmacy = (id) => {
        setSelectedPharmacyId(id);
        if (id) {
            localStorage.setItem('selectedPharmacyId', id);
        } else {
            localStorage.removeItem('selectedPharmacyId');
        }
    };

    const value = {
        pharmacies,
        selectedPharmacyId,
        selectPharmacy,
        refreshPharmacies: fetchPharmacies,
        loading
    };

    return (
        <PharmacyContext.Provider value={value}>
            {children}
        </PharmacyContext.Provider>
    );
}

export function usePharmacy() {
    return useContext(PharmacyContext);
}
