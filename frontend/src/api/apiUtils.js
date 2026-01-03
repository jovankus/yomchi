/**
 * API Utilities for safe data handling
 * Prevents "undefined is not iterable" and similar errors
 */

// Re-export API_BASE_URL for use by other API modules
export { API_BASE_URL } from '../config';

/**
 * Safely convert any value to an array.
 * Prevents .map() errors on non-array data.
 * 
 * @param {any} data - The data to normalize
 * @returns {Array} - Always returns an array
 */
export const safeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data === null || data === undefined) return [];
    // If it's an object with data property (common API pattern)
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
    // If it's a single item, wrap it
    if (data && typeof data === 'object') return [data];
    return [];
};

/**
 * Unwrap API response with standardized error handling.
 * 
 * @param {Promise} promise - The fetch promise
 * @returns {Object} - { data, error }
 */
export const unwrapApi = async (promise) => {
    try {
        const response = await promise;
        // Handle axios-style responses
        if (response && response.data !== undefined) {
            return { data: response.data, error: null };
        }
        return { data: response, error: null };
    } catch (err) {
        const errorMessage = err.response?.data?.error?.message
            || err.response?.data?.error
            || err.response?.data?.message
            || err.message
            || 'An unexpected error occurred';

        return {
            data: null,
            error: {
                code: err.response?.status || 'UNKNOWN',
                message: errorMessage
            }
        };
    }
};

/**
 * Safe fetch wrapper that returns standardized responses
 * 
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Object} - { data, error }
 */
export const safeFetch = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                data: null,
                error: {
                    code: response.status,
                    message: data.error || data.message || `HTTP ${response.status}`
                }
            };
        }

        return { data, error: null };
    } catch (err) {
        return {
            data: null,
            error: {
                code: 'NETWORK_ERROR',
                message: err.message || 'Network request failed'
            }
        };
    }
};

/**
 * Extract array from common API response patterns
 * Handles: { patients: [...] }, { data: [...] }, [...], etc.
 * 
 * @param {any} response - API response
 * @param {string} key - Optional key to look for
 * @returns {Array}
 */
export const extractArray = (response, key = null) => {
    if (Array.isArray(response)) return response;
    if (!response || typeof response !== 'object') return [];

    // Try specific key first
    if (key && Array.isArray(response[key])) return response[key];

    // Try common patterns
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.items)) return response.items;
    if (Array.isArray(response.results)) return response.results;

    // Look for any array property
    for (const prop of Object.values(response)) {
        if (Array.isArray(prop)) return prop;
    }

    return [];
};
