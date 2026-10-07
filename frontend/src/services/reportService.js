/**
 * CyberSage - Report Service
 * Handles PDF download by streaming the response as a Blob.
 */

import api from './api';

const reportService = {
  /**
   * Download PDF report — triggers browser file download
   * @param {string} scanId
   * @param {string} filename - suggested filename
   */
  downloadPDF: async (scanId, filename = 'CyberSage_Report.pdf') => {
    const response = await api.get(`/report/${scanId}/pdf`, {
      responseType: 'blob'   // Tell Axios to return raw binary
    });

    // Create an object URL and trigger download
    const url    = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link   = document.createElement('a');
    link.href    = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Get report metadata (no PDF generated)
   * @param {string} scanId
   */
  getReportMeta: async (scanId) => {
    const response = await api.get(`/report/${scanId}/meta`);
    return response.data;
  }
};

export default reportService;
