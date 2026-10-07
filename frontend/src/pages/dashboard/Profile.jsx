/**
 * CyberSage - Profile Page
 * Edit account info + change password with tabbed layout.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdPerson, MdLock, MdSave, MdEmail, MdCalendarToday,
  MdAccessTime, MdVerified, MdWarning, MdCheckCircle,
  MdVisibility, MdVisibilityOff, MdShield
} from 'react-icons/md';
import useAuth        from '../../hooks/useAuth';
import authService    from '../../services/authService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, getInitials } from '../../utils/helpers';

// Password strength
const getStrength = (p) => {
  if (!p) return { score:0, label:'', color:'' };
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[a-z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const lvl = [null,
    { label:'Very Weak',   color:'bg-red-500'    },
    { label:'Weak',        color:'bg-orange-500' },
    { label:'Fair',        color:'bg-yellow-500' },
    { label:'Strong',      color:'bg-blue-500'   },
    { label:'Very Strong', color:'bg-green-500'  }
  ];
  return { score:s, ...(lvl[s]||lvl[1]) };
};

const TABS = [
  { id:'account',  label:'Account',  icon: MdPerson },
  { id:'security', label:'Security', icon: MdLock   }
];

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [tab,     setTab]     = useState('account');
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MdPerson className="w-7 h-7 text-primary-400" />
          Profile
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your account settings</p>
      </motion.div>

      {/* Avatar card */}
      <motion.div className="card flex items-center gap-5"
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.05 }}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {getInitials(user?.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg truncate">{user?.name}</p>
          <p className="text-gray-400 text-sm truncate">{user?.email}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`badge text-xs ${user?.role === 'admin' ? 'bg-purple-900/40 text-purple-400 border-purple-700' : 'bg-primary-900/40 text-primary-400 border-primary-700'}`}>
              {user?.role === 'admin' ? 'Admin' : 'User'}
            </span>
            {user?.isVerified && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <MdVerified className="w-3.5 h-3.5" /> Verified
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mb-1">
            <MdCalendarToday className="w-3.5 h-3.5" />
            Joined {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
          </p>
          {user?.lastLogin && (
            <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
              <MdAccessTime className="w-3.5 h-3.5" />
              Last login {formatDate(user.lastLogin)}
            </p>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-900 rounded-xl p-1 border border-dark-800">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-primary-600/20 text-primary-400 border border-primary-700/50' : 'text-gray-400 hover:text-gray-200'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'account' && (
          <motion.div key="account" initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-5 }}>
            <AccountTab user={user} refreshUser={refreshUser} showToast={showToast} />
          </motion.div>
        )}
        {tab === 'security' && (
          <motion.div key="security" initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-5 }}>
            <SecurityTab showToast={showToast} />
          </motion.div>
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

// ── Account Tab ─────────────────────────────────────────────────────────────
function AccountTab({ user, refreshUser, showToast }) {
  const [form,    setForm]    = useState({ name: user?.name || '', email: user?.email || '' });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { setForm({ name: user?.name||'', email: user?.email||'' }); }, [user]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    return e;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await authService.updateProfile({ name: form.name, email: form.email });
      await refreshUser();
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally { setSaving(false); }
  };

  const changed = form.name !== user?.name || form.email !== user?.email;

  return (
    <form onSubmit={handleSave} className="card space-y-5">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <MdPerson className="w-4 h-4 text-primary-400" /> Account Information
      </h3>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
        <div className="relative">
          <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input type="text" value={form.name}
            onChange={e => { setForm(p => ({...p, name:e.target.value})); setErrors(p => ({...p,name:''})); }}
            className={`input pl-10 ${errors.name ? 'border-red-600' : ''}`} placeholder="Your full name" />
        </div>
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
        <div className="relative">
          <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input type="email" value={form.email}
            onChange={e => { setForm(p => ({...p, email:e.target.value})); setErrors(p => ({...p,email:''})); }}
            className={`input pl-10 ${errors.email ? 'border-red-600' : ''}`} placeholder="your@email.com" />
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        {form.email !== user?.email && (
          <p className="mt-1 text-xs text-yellow-400">Changing email will require re-verification.</p>
        )}
      </div>
      <button type="submit" disabled={saving || !changed}
        className="btn-primary flex items-center gap-2 w-full justify-center py-3">
        {saving ? <LoadingSpinner size="sm" /> : <MdSave className="w-4 h-4" />}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

// ── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab({ showToast }) {
  const [form,  setForm]  = useState({ currentPassword:'', newPassword:'', confirmNewPassword:'' });
  const [errors,setErrors]= useState({});
  const [show,  setShow]  = useState({});
  const [saving,setSaving]= useState(false);
  const strength = getStrength(form.newPassword);

  const validate = () => {
    const e = {};
    if (!form.currentPassword)        e.currentPassword = 'Current password is required';
    if (!form.newPassword)            e.newPassword     = 'New password is required';
    else if (form.newPassword.length < 8) e.newPassword = 'Minimum 8 characters';
    else if (!/[A-Z]/.test(form.newPassword)) e.newPassword = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(form.newPassword)) e.newPassword = 'Must contain a number';
    if (form.newPassword === form.currentPassword) e.newPassword = 'New password must differ from current';
    if (!form.confirmNewPassword)     e.confirmNewPassword = 'Please confirm your password';
    else if (form.confirmNewPassword !== form.newPassword) e.confirmNewPassword = 'Passwords do not match';
    return e;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await authService.changePassword(form);
      setForm({ currentPassword:'', newPassword:'', confirmNewPassword:'' });
      showToast('Password changed successfully');
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally { setSaving(false); }
  };

  const Field = ({ id, label, placeholder, autoComplete }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative">
        <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
        <input type={show[id] ? 'text' : 'password'} value={form[id]}
          autoComplete={autoComplete}
          onChange={e => { setForm(p => ({...p,[id]:e.target.value})); setErrors(p => ({...p,[id]:''})); }}
          placeholder={placeholder}
          className={`input pl-10 pr-10 ${errors[id] ? 'border-red-600' : ''}`} />
        <button type="button" onClick={() => setShow(p => ({...p,[id]:!p[id]}))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
          {show[id] ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
        </button>
      </div>
      {errors[id] && <p className="mt-1 text-xs text-red-400">{errors[id]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSave} className="card space-y-5">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <MdShield className="w-4 h-4 text-primary-400" /> Change Password
      </h3>
      <Field id="currentPassword" label="Current Password" placeholder="Enter current password" autoComplete="current-password" />
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
        <div className="relative">
          <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input type={show.newPassword ? 'text' : 'password'} value={form.newPassword}
            autoComplete="new-password"
            onChange={e => { setForm(p => ({...p, newPassword:e.target.value})); setErrors(p => ({...p, newPassword:''})); }}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            className={`input pl-10 pr-10 ${errors.newPassword ? 'border-red-600' : ''}`} />
          <button type="button" onClick={() => setShow(p => ({...p, newPassword:!p.newPassword}))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {show.newPassword ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
          </button>
        </div>
        {form.newPassword && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-dark-700'}`} />
              ))}
            </div>
            {strength.label && <p className="text-xs text-gray-500">{strength.label}</p>}
          </div>
        )}
        {errors.newPassword && <p className="mt-1 text-xs text-red-400">{errors.newPassword}</p>}
      </div>
      <Field id="confirmNewPassword" label="Confirm New Password" placeholder="Repeat new password" autoComplete="new-password" />
      <button type="submit" disabled={saving}
        className="btn-primary flex items-center gap-2 w-full justify-center py-3">
        {saving ? <LoadingSpinner size="sm" /> : <MdLock className="w-4 h-4" />}
        {saving ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
}
