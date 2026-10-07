/**
 * CyberSage - Authentication Routes
 *
 * Purpose:
 *   Define all HTTP routes for user authentication.
 *   Each route chains:
 *     1. express-validator rules  (input validation)
 *     2. validateRequest           (check results, return 400 on fail)
 *     3. sanitizeBody              (trim strings, strip null/undefined)
 *     4. Controller function       (business logic)
 *
 * Base path (mounted in server.js):
 *   /api/auth
 *
 * Routes:
 *   POST   /api/auth/signup
 *   POST   /api/auth/login
 *   POST   /api/auth/forgot-password
 *   POST   /api/auth/reset-password/:token
 *   GET    /api/auth/profile
 *   PUT    /api/auth/profile
 *   PUT    /api/auth/change-password
 */

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

// Controllers
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

// Middlewares
const { protect } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const { sanitizeBody } = require('../middlewares/validateRequest');

// ========================================
// VALIDATION RULE SETS
// ========================================

const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

const resetPasswordValidation = [
  param('token')
    .notEmpty().withMessage('Reset token is required'),

  body('password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmNewPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// ========================================
// PUBLIC ROUTES
// ========================================

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/signup',
  sanitizeBody,
  signupValidation,
  validateRequest,
  signup
);

/**
 * @route   POST /api/auth/login
 * @desc    Login and receive JWT token
 * @access  Public
 */
router.post(
  '/login',
  sanitizeBody,
  loginValidation,
  validateRequest,
  login
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset link
 * @access  Public
 */
router.post(
  '/forgot-password',
  sanitizeBody,
  forgotPasswordValidation,
  validateRequest,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with valid token
 * @access  Public
 */
router.post(
  '/reset-password/:token',
  sanitizeBody,
  resetPasswordValidation,
  validateRequest,
  resetPassword
);

// ========================================
// PRIVATE ROUTES (Require JWT)
// ========================================

/**
 * @route   GET /api/auth/profile
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get(
  '/profile',
  protect,
  getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user's name or email
 * @access  Private
 */
router.put(
  '/profile',
  protect,
  sanitizeBody,
  updateProfileValidation,
  validateRequest,
  updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change current user's password
 * @access  Private
 */
router.put(
  '/change-password',
  protect,
  sanitizeBody,
  changePasswordValidation,
  validateRequest,
  changePassword
);

module.exports = router;
