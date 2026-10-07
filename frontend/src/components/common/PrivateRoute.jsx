/**
 * CyberSage - PrivateRoute Component
 *
 * Route guard that redirects unauthenticated users to /login.
 * Shows a full-page spinner while auth is being initialized.
 */

import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While checking localStorage / validating token
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Initializing CyberSage..." />
      </div>
    );
  }

  // Not authenticated → redirect to login, preserve intended path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
