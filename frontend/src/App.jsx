import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Pages
import Login          from './pages/auth/Login';
import Signup         from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword  from './pages/auth/ResetPassword';
import Dashboard      from './pages/dashboard/Dashboard';
import Scanner        from './pages/scanner/Scanner';
import ScanHistory    from './pages/history/ScanHistory';
import ScanDetail     from './pages/history/ScanDetail';
import Profile        from './pages/dashboard/Profile';
import AdminPanel     from './pages/admin/AdminPanel';

// Layout + Guards
import Layout         from './components/layout/Layout';
import PrivateRoute   from './components/common/PrivateRoute';
import AdminRoute     from './components/common/AdminRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login"                 element={<Login />} />
          <Route path="/signup"                element={<Signup />} />
          <Route path="/forgot-password"       element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Private Routes */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index              element={<Dashboard />} />
            <Route path="scan"        element={<Scanner />} />
            <Route path="history"     element={<ScanHistory />} />
            <Route path="history/:id" element={<ScanDetail />} />
            <Route path="profile"     element={<Profile />} />
            <Route path="admin"       element={<AdminRoute><AdminPanel /></AdminRoute>} />
          </Route>

          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
