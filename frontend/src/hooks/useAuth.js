/**
 * CyberSage - useAuth Hook
 *
 * Convenience hook to access AuthContext.
 * Throws if used outside of AuthProvider.
 *
 * Usage:
 *   const { user, login, logout, isAuthenticated } = useAuth();
 */

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default useAuth;
