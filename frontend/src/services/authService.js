/**
 * CyberSage - Auth Service
 *
 * All API calls related to authentication.
 * Uses the shared api.js Axios instance.
 */

import api from './api';

const authService = {
  /**
   * Register new user
   * @param {{ name, email, password, confirmPassword }} data
   */
  signup: async (data) => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  /**
   * Login user
   * @param {{ email, password }} data
   */
  login: async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  /**
   * Request password reset link
   * @param {{ email }} data
   */
  forgotPassword: async (data) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  /**
   * Reset password with token
   * @param {string} token
   * @param {{ password, confirmPassword }} data
   */
  resetPassword: async (token, data) => {
    const response = await api.post(`/auth/reset-password/${token}`, data);
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  /**
   * Update user profile
   * @param {{ name, email }} data
   */
  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  /**
   * Change password
   * @param {{ currentPassword, newPassword, confirmNewPassword }} data
   */
  changePassword: async (data) => {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  },
};

export default authService;
