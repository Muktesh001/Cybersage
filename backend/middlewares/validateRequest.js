/**
 * CyberSage - Request Validation Middleware
 *
 * Purpose:
 *   Works alongside express-validator to check the result
 *   of validation chains and return a structured 400 response
 *   if any fields fail validation.
 *
 * Flow:
 *   Route defines validation rules → validateRequest runs →
 *   If errors exist: return 400 JSON → Otherwise: next()
 *
 * Usage:
 *   const { body } = require('express-validator');
 *   const validateRequest = require('../middlewares/validateRequest');
 *
 *   router.post('/login',
 *     [
 *       body('email').isEmail().withMessage('Valid email required'),
 *       body('password').notEmpty().withMessage('Password required')
 *     ],
 *     validateRequest,
 *     loginController
 *   );
 */

const { validationResult } = require('express-validator');

/**
 * Validates the request against express-validator rules defined
 * in the route handler chain. Returns 400 if errors exist.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors into a clean array of { field, message }
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param || 'unknown',
      message: error.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check your input.',
      errors: formattedErrors
    });
  }

  next();
};

/**
 * Sanitize input — strips keys with undefined/null values
 * from req.body to prevent overwrite attacks.
 * Call this middleware before controllers on sensitive routes.
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === undefined || req.body[key] === null) {
        delete req.body[key];
      }
      // Trim string values
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

module.exports = validateRequest;
module.exports.sanitizeBody = sanitizeBody;
