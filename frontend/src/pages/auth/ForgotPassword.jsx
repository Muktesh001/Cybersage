/**
 * CyberSage - Forgot Password Page
 *
 * Sends password reset request to backend.
 * Shows success state with instructions.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdShield, MdEmail, MdArrowBack, MdCheckCircle } from 'react-icons/md';
import authService from '../../services/authService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { APP_NAME } from '../../utils/constants';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setEmailError(err); return; }

    setSubmitting(true);
    setError('');

    try {
      await authService.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2 bg-primary-600/20 rounded-lg border border-primary-700/50">
            <MdShield className="w-7 h-7 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
        </div>

        <div className="card">
          {!submitted ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Forgot Password</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                    <input
                      id="email" type="email" name="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); setError(''); }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={`input pl-10 ${emailError ? 'border-red-600 focus:ring-red-500' : ''}`}
                    />
                  </div>
                  {emailError && <p className="mt-1.5 text-xs text-red-400">{emailError}</p>}
                </div>

                <button type="submit" disabled={submitting}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base font-semibold">
                  {submitting ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            // ---- Success State ----
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
              <h3 className="text-lg font-bold text-white mb-2">Check Your Email</h3>
              <p className="text-gray-400 text-sm mb-4">
                If an account exists for <span className="text-primary-400 font-medium">{email}</span>,
                we&apos;ve sent password reset instructions.
              </p>
              <p className="text-gray-500 text-xs">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button onClick={() => { setSubmitted(false); setEmail(''); }}
                  className="text-primary-400 hover:text-primary-300 transition-colors">
                  try again
                </button>
              </p>
            </motion.div>
          )}

          <div className="mt-6 pt-6 border-t border-dark-700">
            <Link to="/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
              <MdArrowBack className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
