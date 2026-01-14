/**
 * Configured axios instance with automatic JWT auth headers
 * Use this instead of the default axios import for authenticated requests
 */
import axios from 'axios';
import { getAuthHeaders } from './apiUtils';

// Create axios instance with default config
const api = axios.create({
    withCredentials: true
});

// Request interceptor to add JWT auth headers
api.interceptors.request.use(
    (config) => {
        const authHeaders = getAuthHeaders();
        if (authHeaders.Authorization) {
            config.headers = {
                ...config.headers,
                ...authHeaders
            };
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
