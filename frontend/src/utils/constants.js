/**
 * CyberSage - Application-Wide Constants
 */

export const APP_NAME = 'CyberSage';
export const APP_TAGLINE = 'AI-Powered Web Security Configuration Auditing';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Local Storage Keys
export const TOKEN_KEY = 'cybersage_token';
export const USER_KEY = 'cybersage_user';

// Security Score Thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: { min: 90, max: 100, label: 'Excellent', color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-700' },
  GOOD:      { min: 70, max: 89,  label: 'Good',      color: 'text-blue-400',  bg: 'bg-blue-900/30',  border: 'border-blue-700'  },
  FAIR:      { min: 50, max: 69,  label: 'Fair',       color: 'text-yellow-400',bg: 'bg-yellow-900/30',border: 'border-yellow-700'},
  POOR:      { min: 30, max: 49,  label: 'Poor',       color: 'text-orange-400',bg: 'bg-orange-900/30',border: 'border-orange-700'},
  CRITICAL:  { min: 0,  max: 29,  label: 'Critical',   color: 'text-red-400',   bg: 'bg-red-900/30',   border: 'border-red-700'  },
};

// Severity Levels
export const SEVERITY = {
  CRITICAL: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-900/40',    border: 'border-red-600'    },
  HIGH:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-900/40', border: 'border-orange-600' },
  MEDIUM:   { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-900/40', border: 'border-yellow-600' },
  LOW:      { label: 'Low',      color: 'text-blue-400',   bg: 'bg-blue-900/40',   border: 'border-blue-600'   },
  INFO:     { label: 'Info',     color: 'text-gray-400',   bg: 'bg-gray-900/40',   border: 'border-gray-600'   },
};

// Navigation Links (for Layout)
export const NAV_LINKS = [
  { label: 'Dashboard',    path: '/',        icon: 'MdDashboard'    },
  { label: 'New Scan',     path: '/scan',    icon: 'MdSearch'       },
  { label: 'Scan History', path: '/history', icon: 'MdHistory'      },
  { label: 'Reports',      path: '/reports', icon: 'MdDescription'  },
  { label: 'Profile',      path: '/profile', icon: 'MdPerson'       },
];

export const ADMIN_NAV_LINKS = [
  { label: 'Admin Panel',  path: '/admin',   icon: 'MdAdminPanelSettings' },
];
