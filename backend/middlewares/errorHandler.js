/**
 * CyberSage - Global Error Handler Middleware
 *
 * Purpose:
 *   Centralized error handling for the entire Express application.
 *   Catches all errors thrown with next(err) or thrown from
 *   async route handlers via express-async-errors pattern.
 *
 * Flow:
 *   Route throws error → next(err) → errorHandler middleware →
 *   Normalize error → Log it → Send JSON response
 *
 * Response Shape:
 *   {
 *     success: false,
 *     message: "Human-readable message",
 *     errors: [...],         // Validation errors array (if any)
 *     stack: "..."           // Only in development
 *   }
 *
 * Usage:
 *   app.use(errorHandler);  // Must be LAST middleware in server.js
 */

const logger = require('../utils/logger');

// ---- Known Error Types ----

/**
 * Normalize Mongoose validation errors into a consistent array
 */
const handleMongooseValidationError = (err) => {
  const errors = Object.values(err.errors).map(e => ({
    field: e.path,
    message: e.message
  }));
  return {
    statusCode: 400,
    message: 'Validation failed',
    errors
  };
};

/**
 * Handle Mongoose duplicate key error (e.g. duplicate email)
 */
const handleMongoDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  return {
    statusCode: 409,
    message: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' is already in use`,
    errors: [{ field, message: `${field} already exists` }]
  };
};

/**
 * Handle Mongoose CastError (e.g. invalid ObjectId)
 */
const handleMongoCastError = (err) => ({
  statusCode: 400,
  message: `Invalid value for field '${err.path}': ${err.value}`,
  errors: [{ field: err.path, message: 'Invalid format' }]
});

/**
 * Handle JWT errors
 */
const handleJWTError = () => ({
  statusCode: 401,
  message: 'Invalid or malformed token. Please log in again.',
  errors: []
});

const handleJWTExpiredError = () => ({
  statusCode: 401,
  message: 'Your session has expired. Please log in again.',
  errors: []
});

// ---- Main Error Handler ----

const errorHandler = (err, req, res, next) => {
  // Default error shape
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // ---- Identify and normalize specific error types ----

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const normalized = handleMongooseValidationError(err);
    statusCode = normalized.statusCode;
    message = normalized.message;
    errors = normalized.errors;
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const normalized = handleMongoDuplicateKeyError(err);
    statusCode = normalized.statusCode;
    message = normalized.message;
    errors = normalized.errors;
  }

  // Mongoose CastError (invalid ObjectId etc.)
  if (err.name === 'CastError') {
    const normalized = handleMongoCastError(err);
    statusCode = normalized.statusCode;
    message = normalized.message;
    errors = normalized.errors;
  }

  // JWT invalid token
  if (err.name === 'JsonWebTokenError') {
    const normalized = handleJWTError();
    statusCode = normalized.statusCode;
    message = normalized.message;
    errors = normalized.errors;
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const normalized = handleJWTExpiredError();
    statusCode = normalized.statusCode;
    message = normalized.message;
    errors = normalized.errors;
  }

  // ---- Log the error ----
  if (statusCode >= 500) {
    logger.error(`[ErrorHandler] ${statusCode} - ${message}`, {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: err.stack
    });
  } else {
    logger.warn(`[ErrorHandler] ${statusCode} - ${message}`, {
      path: req.originalUrl,
      method: req.method
    });
  }

  // ---- Build response ----
  const response = {
    success: false,
    message,
    ...(errors.length > 0 && { errors })
  };

  // Attach stack trace only in development
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Utility: Create a structured AppError
 * Use this to throw intentional errors from controllers/services
 *
 * Usage:
 *   throw createError(404, 'User not found');
 *   throw createError(400, 'Validation failed', [{ field: 'email', message: '...' }]);
 */
const createError = (statusCode, message, errors = []) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errors = errors;
  return err;
};

module.exports = errorHandler;
module.exports.createError = createError;
