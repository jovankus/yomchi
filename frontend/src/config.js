/**
 * Yomchi Frontend Configuration
 * 
 * API URL is configured via environment variable for production,
 * with fallback to localhost for development.
 */

// Vite exposes env vars prefixed with VITE_
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper to construct API endpoints
export const apiUrl = (path) => {
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

// Default fetch options with credentials
export const fetchOptions = {
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json'
    }
};

// Helper for authenticated fetch
export const apiFetch = async (path, options = {}) => {
    const url = apiUrl(path);
    const response = await fetch(url, {
        ...fetchOptions,
        ...options,
        headers: {
            ...fetchOptions.headers,
            ...options.headers
        }
    });
    return response;
};
