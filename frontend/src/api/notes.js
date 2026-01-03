import { API_BASE_URL } from './apiUtils';

const API_URL = `${API_BASE_URL}/notes`;

export const createNote = async (data) => {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create note');
    }
    return res.json();
};

export const getPatientNotes = async (patientId) => {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/notes`, {
        credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
};
