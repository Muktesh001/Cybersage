/**
 * CyberSage - AI Service
 * All API calls for the AI explanation module.
 */

import api from './api';

const aiService = {
  /**
   * Generate (or return cached) AI explanation for a scan
   * @param {string} scanId
   * @param {boolean} regenerate - Force fresh generation
   */
  explainScan: async (scanId, regenerate = false) => {
    const response = await api.post(
      `/ai/explain/${scanId}${regenerate ? '?regenerate=true' : ''}`
    );
    return response.data;
  },

  /**
   * Get cached AI explanation (no generation)
   * @param {string} scanId
   */
  getExplanation: async (scanId) => {
    const response = await api.get(`/ai/explain/${scanId}`);
    return response.data;
  },

  /**
   * Explain a single finding
   * @param {string} scanId
   * @param {string} ruleId - e.g. "HDR-001"
   */
  explainFinding: async (scanId, ruleId) => {
    const response = await api.post(`/ai/finding/${scanId}/${ruleId}`);
    return response.data;
  }
};

export default aiService;
