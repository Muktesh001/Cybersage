/**
 * CyberSage - Scan Service
 *
 * All API calls for the scanner module.
 */

import api from './api';

const scanService = {
  /**
   * Start a new security scan
   * @param {string} url - Target URL
   */
  startScan: async (url) => {
    const response = await api.post('/scan', { url });
    return response.data;
  },

  /**
   * Get a single scan result by ID
   * @param {string} id - Scan ID
   */
  getScanById: async (id) => {
    const response = await api.get(`/scan/${id}`);
    return response.data;
  },

  /**
   * Get paginated scan history
   * @param {object} params - { page, limit, search, status, sortBy, sortDir }
   */
  getScanHistory: async (params = {}) => {
    const response = await api.get('/scan/history', { params });
    return response.data;
  },

  /**
   * Get raw headers for a scan
   * @param {string} id - Scan ID
   */
  getScanHeaders: async (id) => {
    const response = await api.get(`/scan/${id}/headers`);
    return response.data;
  },

  /**
   * Delete a scan record
   * @param {string} id - Scan ID
   */
  deleteScan: async (id) => {
    const response = await api.delete(`/scan/${id}`);
    return response.data;
  }
};

export default scanService;
