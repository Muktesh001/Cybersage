/**
 * CyberSage - Reset Password Page
 *
 * Receives token from URL params.
 * Submits new password to backend.
 */

import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdShield, MdLock, MdVisibility, MdVisibilityOff, MdCheckCircle } from 'react-icons/md';
import authService from '../../services/authService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { APP_NAME } from '../../utils/constants';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    const errors = {};
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(formData.password)) errors.password = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(formData.password)) errors.password = 'Must contain a number';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (formData.confirmPassword !== formData.password) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSubmitting(true);
    try {
      await authService.resetPassword(token, formData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2 bg-primary-600/20 rounded-lg border border-primary-700/50">
            <MdShield className="w-7 h-7 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
        </div>

        <div className="card">
          {!success ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Set New Password</h2>
                <p className="text-gray-400 text-sm mt-1">Choose a strong password for your account.</p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                  <div className="relative">
                    <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                    <input
                      id="password" type={showPassword ? 'text' : 'password'} name="password"
                      value={formData.password} onChange={handleChange}
                      placeholder="Min. 8 chars, 1 uppercase, 1 number"
                      className={`input pl-10 pr-10 ${formErrors.password ? 'border-red-600 focus:ring-red-500' : ''}`}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      aria-label="Toggle password">
                      {showPassword ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="mt-1.5 text-xs text-red-400">{formErrors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                  <div className="relative">
                    <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                    <input
                      id="confirmPassword" type={showPassword ? 'text' : 'password'} name="confirmPassword"
                      value={formData.confirmPassword} onChange={handleChange}
                      placeholder="Repeat new password"
                      className={`input pl-10 ${formErrors.confirmPassword ? 'border-red-600 focus:ring-red-500' : ''}`}
                    />
                  </div>
                  {formErrors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{formErrors.confirmPassword}</p>}
                </div>

                <button type="submit" disabled={submitting}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base font-semibold">
                  {submitting ? <LoadingSpinner size="sm" /> : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 bg-green-900/30 rounded-full border border-green-700">
                  <MdCheckCircle className="w-10 h-10 text-green-400" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Password Reset!</h3>
              <p className="text-gray-400 text-sm mb-1">Your password has been updated successfully.</p>
              <p className="text-gray-500 text-xs">Redirecting to login in 3 seconds...</p>
            </motion.div>
          )}

          <div className="mt-6 pt-6 border-t border-dark-700 text-center">
            <Link to="/login" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
              Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
