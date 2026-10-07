/**
 * CyberSage - JWT Authentication Middleware
 *
 * Purpose:
 *   Protects private routes by verifying the JWT token
 *   sent in the Authorization header.
 *
 * Flow:
 *   Request arrives → Extract Bearer token →
 *   Verify with jwt.verify() → Attach decoded user to req.user →
 *   Call next() → Route handler executes
 *
 * Token Format:
 *   Authorization: Bearer <jwt_token>
 *
 * On failure:
 *   Returns 401 Unauthorized JSON response
 *
 * Usage:
 *   const { protect, restrictTo } = require('../middlewares/authMiddleware');
 *
 *   // Protect a single route:
 *   router.get('/profile', protect, getProfile);
 *
 *   // Protect + restrict to admin only:
 *   router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');
const { createError } = require('./errorHandler');

/**
 * protect middleware
 * Verifies JWT and attaches decoded payload to req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. No token found
    if (!token) {
      return next(createError(401, 'Access denied. No token provided. Please log in.'));
    }

    // 3. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtErr) {
      // Let the global error handler normalize JWT errors
      return next(jwtErr);
    }

    // 4. Attach decoded user info to request
    // decoded contains: { id, email, role, iat, exp }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    logger.debug(`[Auth] Authenticated user: ${decoded.email} (${decoded.role})`);

    next();

  } catch (error) {
    logger.error(`[Auth] Middleware error: ${error.message}`);
    next(error);
  }
};

/**
 * restrictTo middleware factory
 * Restricts access to specific roles after protect() has run.
 *
 * @param {...string} roles - Allowed roles e.g. 'admin', 'user'
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`[Auth] Unauthorized access attempt by user: ${req.user.email} (role: ${req.user.role}) on ${req.originalUrl}`);
      return next(createError(403, 'You do not have permission to perform this action'));
    }

    next();
  };
};

/**
 * optionalAuth middleware
 * Attaches user to req.user if token is present but does NOT
 * block the request if no token is found.
 * Useful for routes that behave differently for auth vs guest users.
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        };
      } catch (_) {
        // Token invalid — continue as unauthenticated
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next(); // Never block on optional auth
  }
};

module.exports = { protect, restrictTo, optionalAuth };
