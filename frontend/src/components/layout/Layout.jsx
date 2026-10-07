/**
 * CyberSage - Main App Layout
 *
 * Provides the sidebar + topbar shell for all private pages.
 * Uses React Router's <Outlet /> to render child routes.
 */

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdDashboard, MdSearch, MdHistory, MdDescription,
  MdPerson, MdAdminPanelSettings, MdLogout, MdMenu,
  MdClose, MdShield, MdNotifications
} from 'react-icons/md';
import useAuth from '../../hooks/useAuth';
import { getInitials } from '../../utils/helpers';
import { APP_NAME } from '../../utils/constants';

const navLinks = [
  { label: 'Dashboard',    path: '/',        icon: MdDashboard,  exact: true  },
  { label: 'New Scan',     path: '/scan',    icon: MdSearch,     exact: false },
  { label: 'Scan History', path: '/history', icon: MdHistory,    exact: false },
  { label: 'Profile',      path: '/profile', icon: MdPerson,     exact: false },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-800">
        <div className="p-2 bg-primary-600/20 rounded-lg border border-primary-700/50">
          <MdShield className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">{APP_NAME}</h1>
          <p className="text-xs text-gray-500">Security Auditing</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-700/50'
                  : 'text-gray-400 hover:bg-dark-800 hover:text-gray-200'
              }`
            }
          >
            <link.icon className="w-5 h-5 flex-shrink-0" />
            {link.label}
          </NavLink>
        ))}

        {/* Admin link if admin role */}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-700/50'
                  : 'text-gray-400 hover:bg-dark-800 hover:text-gray-200'
              }`
            }
          >
            <MdAdminPanelSettings className="w-5 h-5 flex-shrink-0" />
            Admin Panel
          </NavLink>
        )}
      </nav>

      {/* User Info + Logout */}
      <div className="px-3 py-4 border-t border-dark-800">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-800/50 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200"
        >
          <MdLogout className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-dark-900 border-r border-dark-800 fixed top-0 left-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 left-0 h-screen w-64 bg-dark-900 border-r border-dark-800 z-50 lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <MdClose className="w-6 h-6" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-dark-900/80 backdrop-blur-sm border-b border-dark-800 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <MdMenu className="w-6 h-6" />
            </button>

            {/* Page title placeholder — pages can override via context */}
            <div className="hidden lg:block" />

            {/* Right side */}
            <div className="flex items-center gap-3">
              <button
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition-all"
                aria-label="Notifications"
              >
                <MdNotifications className="w-5 h-5" />
              </button>

              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer"
                onClick={() => navigate('/profile')}
              >
                {getInitials(user?.name)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
