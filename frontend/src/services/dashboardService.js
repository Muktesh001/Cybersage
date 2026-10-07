/**
 * CyberSage - Dashboard Service
 *
 * Purpose:
 *   All API calls related to the dashboard module.
 *   Used by useDashboard hook and Dashboard page.
 *
 * Endpoints consumed:
 *   GET /api/dashboard/stats    → Full dashboard statistics
 *   GET /api/dashboard/summary  → Lightweight summary
 */

import api from './api';

const dashboardService = {
  /**
   * Fetch full dashboard statistics
   * Returns: { overview, severityCounts, recentScans, trend }
   */
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  /**
   * Fetch lightweight summary for widgets
   * Returns: { totalScans, lastScan }
   */
  getSummary: async () => {
    const response = await api.get('/dashboard/summary');
    return response.data;
  }
};

export default dashboardService;
