/**
 * CyberSage - Admin Service
 */
import api from './api';

const adminService = {
  getStats:       async ()           => (await api.get('/admin/stats')).data,
  getAllUsers:     async (params={}) => (await api.get('/admin/users', { params })).data,
  getUserById:    async (id)         => (await api.get(`/admin/users/${id}`)).data,
  updateUserRole: async (id, role)   => (await api.put(`/admin/users/${id}/role`, { role })).data,
  deleteUser:     async (id)         => (await api.delete(`/admin/users/${id}`)).data,
  getAllScans:     async (params={}) => (await api.get('/admin/scans', { params })).data
};

export default adminService;
