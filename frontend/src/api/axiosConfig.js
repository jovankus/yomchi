/**
 * Configured axios instance with automatic JWT auth headers
 * Use this instead of the default axios import for authenticated requests
 */
import axios from 'axios';
import { getAuthHeaders } from './apiUtils';

// Create axios instance with default config
const api = axios.create({
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add JWT auth headers
api.interceptors.request.use(
    (config) => {
        const authHeaders = getAuthHeaders();
        if (authHeaders.Authorization) {
            config.headers.set
                ? config.headers.set('Authorization', authHeaders.Authorization)
                : (config.headers = { ...config.headers, ...authHeaders });
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for better error logging
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error(`API Error ${error.response.status}:`, error.response.data);
        } else if (error.request) {
            console.error('Network Error - no response received:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
