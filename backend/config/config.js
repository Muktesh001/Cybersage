/**
 * CyberSage - Centralized Configuration Module
 *
 * Purpose:
 *   Single source of truth for all configuration values.
 *   Reads from process.env and applies defaults.
 *   All modules should import from here instead of
 *   accessing process.env directly.
 *
 * Usage:
 *   const config = require('../config/config');
 *   config.jwt.secret
 */

require('dotenv').config();

const config = {
  // ---- Server ----
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    isProd: process.env.NODE_ENV === 'production',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
  },

  // ---- Database ----
  db: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/cybersage'
  },

  // ---- JWT ----
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_dev_secret_change_in_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // ---- Password Reset ----
  reset: {
    tokenExpires: parseInt(process.env.RESET_TOKEN_EXPIRES, 10) || 3600000
  },

  // ---- AI (Gemini) ----
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  },

  // ---- Email ----
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'CyberSage <no-reply@cybersage.com>'
  },

  // ---- Rate Limiting ----
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5
  },

  // ---- Scanner ----
  scanner: {
    timeout: parseInt(process.env.SCANNER_TIMEOUT, 10) || 10000,
    maxRedirects: parseInt(process.env.SCANNER_MAX_REDIRECTS, 10) || 5
  },

  // ---- Admin ----
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@cybersage.com'
  }
};

// Validate critical config values on startup
const validateConfig = () => {
  const warnings = [];

  if (!process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET is not set. Using insecure fallback — set it in .env');
  }
  if (!process.env.MONGO_URI) {
    warnings.push('MONGO_URI is not set. Using local MongoDB fallback');
  }
  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not set. AI features will be unavailable');
  }

  if (warnings.length > 0) {
    const logger = require('../utils/logger');
    warnings.forEach(w => logger.warn(`[Config] ${w}`));
  }
};

// Run validation (non-blocking)
try {
  validateConfig();
} catch (_) {
  // logger might not be ready yet — skip validation silently
}

module.exports = config;
