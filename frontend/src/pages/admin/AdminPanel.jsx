/**
 * CyberSage - Admin Panel Page
 * Platform stats, user management, and global scan overview.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdAdminPanelSettings, MdPeople, MdBarChart, MdSearch,
  MdDelete, MdShield, MdWarning, MdCheckCircle, MdRefresh,
  MdPersonOff, MdSupervisorAccount, MdOpenInNew
} from 'react-icons/md';
import adminService   from '../../services/adminService';
import ScoreBar       from '../../components/common/ScoreBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate }  from '../../utils/helpers';

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = 'text-primary-400', bg = 'bg-primary-900/30', border = 'border-primary-800/40', loading }) {
  return (
    <div className={`card border ${border} ${bg}`}>
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="w-10 h-10 rounded-xl bg-dark-700" />
          <div className="h-7 w-16 rounded bg-dark-700" />
          <div className="h-4 w-24 rounded bg-dark-700" />
        </div>
      ) : (
        <>
          <div className={`p-2.5 rounded-xl w-fit mb-3 border ${bg} ${border}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1">{value ?? '–'}</div>
          <div className="text-sm text-gray-400">{label}</div>
        </>
      )}
    </div>
  );
}

// ── Role Badge ──────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  return role === 'admin'
    ? <span className="badge bg-purple-900/40 text-purple-400 border-purple-700 text-xs">Admin</span>
    : <span className="badge bg-dark-700 text-gray-400 border-dark-600 text-xs">User</span>;
}

// ── Delete Modal ────────────────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onCancel, loading }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <motion.div className="card max-w-sm w-full border border-red-800/50"
        initial={{ scale:0.95 }} animate={{ scale:1 }}>
        <div className="flex items-start gap-3 mb-5">
          <MdWarning className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-bold">Delete User?</h3>
            <p className="text-gray-400 text-sm mt-1">
              This will permanently delete <span className="text-white font-medium">{user?.email}</span> and all their scan data.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 btn bg-red-700 hover:bg-red-600 text-white flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : <MdDelete className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [stats,       setStats]       = useState(null);
  const [users,       setUsers]       = useState([]);
  const [userPage,    setUserPage]    = useState({ total:0, page:1 });
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);
  const [actionUser,  setActionUser]  = useState(null);
  const [actionType,  setActionType]  = useState(null);
  const [processing,  setProcessing]  = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminService.getStats(),
        adminService.getAllUsers({ search, limit:15 })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setUserPage(usersRes.data.pagination);
    } catch (err) {
      showToast(err.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRoleToggle = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setProcessing(true);
    try {
      await adminService.updateUserRole(user._id, newRole);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, role: newRole } : u));
      showToast(`${user.email} is now ${newRole}`);
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally { setProcessing(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!actionUser) return;
    setProcessing(true);
    try {
      await adminService.deleteUser(actionUser._id);
      setUsers(prev => prev.filter(u => u._id !== actionUser._id));
      showToast(`${actionUser.email} deleted successfully`);
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setProcessing(false);
      setActionUser(null);
    }
  };

  const statCards = [
    { label:'Total Users',      value: stats?.users?.total,      icon: MdPeople,             color:'text-primary-400', bg:'bg-primary-900/30', border:'border-primary-800/40' },
    { label:'Admin Users',      value: stats?.users?.admins,     icon: MdAdminPanelSettings, color:'text-purple-400',  bg:'bg-purple-900/30',  border:'border-purple-800/40'  },
    { label:'Total Scans',      value: stats?.scans?.total,      icon: MdBarChart,           color:'text-blue-400',    bg:'bg-blue-900/30',    border:'border-blue-800/40'    },
    { label:'Completed Scans',  value: stats?.scans?.completed,  icon: MdCheckCircle,        color:'text-green-400',   bg:'bg-green-900/30',   border:'border-green-800/40'   },
    { label:'Failed Scans',     value: stats?.scans?.failed,     icon: MdWarning,            color:'text-red-400',     bg:'bg-red-900/30',     border:'border-red-800/40'     },
    { label:'Avg. Score',       value: stats?.scans?.avgScore ?? '–', icon: MdShield,        color:'text-yellow-400',  bg:'bg-yellow-900/30',  border:'border-yellow-800/40'  }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MdAdminPanelSettings className="w-7 h-7 text-purple-400" />
            Admin Panel
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Platform management dashboard</p>
        </div>
        <button onClick={loadData} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
          <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(c => (
          <StatCard key={c.label} loading={loading} {...c} />
        ))}
      </div>

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <MdPeople className="w-5 h-5 text-primary-400" />
            <h3 className="text-white font-semibold">Users</h3>
            <span className="badge bg-dark-700 border border-dark-600 text-gray-400 text-xs">{userPage.total}</span>
          </div>
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input type="text" placeholder="Search users..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-9 py-1.5 text-sm w-52" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-dark-800 bg-dark-950/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {['User','Role','Scans','Joined','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/50">
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="animate-pulse">
                    {[45,15,10,20,10].map((w,j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-dark-700 rounded" style={{width:`${w}%`}} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">No users found</td></tr>
              ) : users.map((u, i) => (
                <motion.tr key={u._id} className="hover:bg-dark-800/30 transition-colors"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.03 }}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-700 to-purple-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.name||'?').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3.5 text-sm text-gray-300 font-mono">{u.scanCount ?? 0}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleRoleToggle(u)} disabled={processing}
                        title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-dark-700 transition-all">
                        {u.role === 'admin' ? <MdPersonOff className="w-4 h-4" /> : <MdSupervisorAccount className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { setActionUser(u); setActionType('delete'); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-dark-700 transition-all">
                        <MdDelete className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent scans across all users */}
      {stats?.recentScans?.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-800 flex items-center gap-2">
            <MdBarChart className="w-5 h-5 text-primary-400" />
            <h3 className="text-white font-semibold">Recent Scans (All Users)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-dark-800 bg-dark-950/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {['Domain','User','Score','Date','Detail'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/50">
                {stats.recentScans.map((s, i) => (
                  <tr key={s._id||i} className="hover:bg-dark-800/30">
                    <td className="px-4 py-3 text-sm text-gray-200 truncate max-w-[160px]">{s.domain}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{s.userId?.email || '–'}</td>
                    <td className="px-4 py-3 min-w-[100px]">
                      <ScoreBar score={s.score} height="h-1.5" showValue animate={false} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/history/${s._id}`}
                        className="p-1.5 rounded text-gray-400 hover:text-primary-400 hover:bg-dark-700 inline-flex transition-all">
                        <MdOpenInNew className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete modal */}
      <AnimatePresence>
        {actionUser && actionType === 'delete' && (
          <DeleteModal user={actionUser} loading={processing}
            onConfirm={handleDeleteConfirm} onCancel={() => setActionUser(null)} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${
              toast.type === 'error' ? 'bg-red-950/90 border-red-700 text-red-300' : 'bg-green-950/90 border-green-700 text-green-300'
            }`}>
            {toast.type === 'error' ? <MdWarning className="w-4 h-4" /> : <MdCheckCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
