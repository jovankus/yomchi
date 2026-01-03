import { API_BASE_URL } from './apiUtils';

const API_URL = `${API_BASE_URL}/appointments`;

export const getAppointments = async (date, search = '') => {
    let url = `${API_URL}?date=${date}`;
    if (search && search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
    }
    const res = await fetch(url, {
        credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return res.json();
};

export const createAppointment = async (data) => {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    });

    // Pass along error message for conflicts
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Failed to create appointment');
    }
    return res.json();
};

export const updateAppointment = async (id, data) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Failed to update appointment');
    }
    return res.json();
};

export const deleteAppointment = async (id) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to delete appointment');
    return res.json();
};
