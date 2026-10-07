/**
 * CyberSage - Axios API Instance
 *
 * Configures a shared Axios instance with:
 *  - Base URL from env
 *  - Request interceptor: attaches JWT from localStorage
 *  - Response interceptor: handles 401 (token expired → logout)
 */

import axios from 'axios';
import { TOKEN_KEY } from '../utils/constants';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// ---- Request Interceptor ----
// Attach JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response Interceptor ----
// Handle global errors: 401 auto-logout, normalize error shape
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Token expired or invalid — clear storage and redirect to login
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('cybersage_user');

      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname;
      if (!['/login', '/signup', '/forgot-password'].some(p => currentPath.includes(p))) {
        window.location.href = '/login';
      }
    }

    // Extract readable error message from response
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    const normalizedError = new Error(message);
    normalizedError.status = status;
    normalizedError.errors = error.response?.data?.errors || [];
    normalizedError.data = error.response?.data;

    return Promise.reject(normalizedError);
  }
);

export default api;
