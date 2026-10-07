/**
 * CyberSage - Signup Page
 *
 * Registration form with client-side validation.
 * Password strength indicator included.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdShield, MdPerson, MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdCheckCircle } from 'react-icons/md';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { APP_NAME } from '../../utils/constants';

// Password strength checker
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: '', color: '' },
    { label: 'Very Weak', color: 'bg-red-500' },
    { label: 'Weak',      color: 'bg-orange-500' },
    { label: 'Fair',      color: 'bg-yellow-500' },
    { label: 'Strong',    color: 'bg-blue-500' },
    { label: 'Very Strong', color: 'bg-green-500' },
  ];
  return { score, ...levels[score] };
};

const Signup = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated, error, clearError } = useAuth();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const passwordStrength = getPasswordStrength(formData.password);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => () => clearError(), [clearError]);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    else if (formData.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Enter a valid email';

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
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSubmitting(true);
    const result = await signup(formData);
    setSubmitting(false);

    if (result.success) {
      navigate('/', { replace: true });
    } else if (result.errors?.length > 0) {
      const fieldErrors = {};
      result.errors.forEach(err => { fieldErrors[err.field] = err.message; });
      setFormErrors(fieldErrors);
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
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2 bg-primary-600/20 rounded-lg border border-primary-700/50">
            <MdShield className="w-7 h-7 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Create Account</h2>
            <p className="text-gray-400 text-sm mt-1">Join CyberSage to start auditing web security</p>
          </div>

          {/* Global Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-4 py-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm flex items-center gap-2"
            >
              <MdCheckCircle className="w-5 h-5 flex-shrink-0" />
              {successMsg}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <div className="relative">
                <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  id="name" type="text" name="name"
                  value={formData.name} onChange={handleChange}
                  placeholder="John Doe" autoComplete="name"
                  className={`input pl-10 ${formErrors.name ? 'border-red-600 focus:ring-red-500' : ''}`}
                />
              </div>
              {formErrors.name && <p className="mt-1.5 text-xs text-red-400">{formErrors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  id="email" type="email" name="email"
                  value={formData.email} onChange={handleChange}
                  placeholder="you@example.com" autoComplete="email"
                  className={`input pl-10 ${formErrors.email ? 'border-red-600 focus:ring-red-500' : ''}`}
                />
              </div>
              {formErrors.email && <p className="mt-1.5 text-xs text-red-400">{formErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  id="password" type={showPassword ? 'text' : 'password'} name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number" autoComplete="new-password"
                  className={`input pl-10 pr-10 ${formErrors.password ? 'border-red-600 focus:ring-red-500' : ''}`}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  aria-label={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Bar */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= passwordStrength.score ? passwordStrength.color : 'bg-dark-700'
                      }`} />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <p className="text-xs text-gray-500">{passwordStrength.label}</p>
                  )}
                </div>
              )}
              {formErrors.password && <p className="mt-1.5 text-xs text-red-400">{formErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                  value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Repeat your password" autoComplete="new-password"
                  className={`input pl-10 pr-10 ${formErrors.confirmPassword ? 'border-red-600 focus:ring-red-500' : ''}`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                  {showConfirmPassword ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                </button>
              </div>
              {formErrors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{formErrors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={submitting}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base font-semibold mt-2">
              {submitting ? <LoadingSpinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
