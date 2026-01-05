import { API_BASE_URL } from '../config';
import { getAuthHeaders } from '../context/ClinicContext';

// Get all final reports for a patient
export async function getPatientFinalReports(patientId) {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/final-reports`, {
        credentials: 'include',
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch reports');
    }
    return res.json();
}

// Get a single final report
export async function getFinalReport(patientId, reportId) {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/final-reports/${reportId}`, {
        credentials: 'include',
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch report');
    }
    return res.json();
}

// Create a new final report
export async function createFinalReport(patientId, reportData) {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/final-reports`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify(reportData)
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create report');
    }
    return res.json();
}

// Update a final report
export async function updateFinalReport(patientId, reportId, reportData) {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/final-reports/${reportId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify(reportData)
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update report');
    }
    return res.json();
}

// Delete a final report
export async function deleteFinalReport(patientId, reportId) {
    const res = await fetch(`${API_BASE_URL}/patients/${patientId}/final-reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete report');
    }
    return res.json();
}
