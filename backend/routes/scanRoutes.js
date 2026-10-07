/**
 * CyberSage - Scan Routes
 *
 * Base path (mounted in server.js):
 *   /api/scan
 *
 * All routes require JWT authentication via protect middleware.
 *
 * Routes:
 *   POST   /api/scan              — Start a new security scan
 *   GET    /api/scan/history      — Get paginated scan history
 *   GET    /api/scan/:id          — Get single scan result
 *   GET    /api/scan/:id/headers  — Get raw headers for a scan
 *   DELETE /api/scan/:id          — Delete a scan record
 */

const express   = require('express');
const { body, param, query } = require('express-validator');
const router    = express.Router();

const {
  startScan,
  getScanById,
  getScanHistory,
  deleteScan,
  getScanHeaders
} = require('../controllers/scanController');

const { protect }       = require('../middlewares/authMiddleware');
const validateRequest   = require('../middlewares/validateRequest');
const { sanitizeBody }  = require('../middlewares/validateRequest');

// All scan routes are private
router.use(protect);

// ---- Validation Rules ----

const startScanValidation = [
  body('url')
    .notEmpty().withMessage('URL is required')
    .isString().withMessage('URL must be a string')
    .isLength({ max: 2048 }).withMessage('URL is too long')
    .trim()
];

const idParamValidation = [
  param('id')
    .notEmpty().withMessage('Scan ID is required')
    .isMongoId().withMessage('Invalid scan ID format')
];

const historyQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['pending', 'running', 'completed', 'failed']).withMessage('Invalid status'),
  query('sortBy').optional().isIn(['createdAt', 'score', 'domain']).withMessage('Invalid sort field'),
  query('sortDir').optional().isIn(['asc', 'desc']).withMessage('Sort direction must be asc or desc')
];

// ---- Routes ----

/**
 * @route   POST /api/scan
 * @desc    Start a new passive security scan
 * @access  Private
 */
router.post(
  '/',
  sanitizeBody,
  startScanValidation,
  validateRequest,
  startScan
);

/**
 * @route   GET /api/scan/history
 * @desc    Get paginated scan history for current user
 * @access  Private
 * NOTE: Must be defined BEFORE /:id to avoid 'history' being matched as ID
 */
router.get(
  '/history',
  historyQueryValidation,
  validateRequest,
  getScanHistory
);

/**
 * @route   GET /api/scan/:id
 * @desc    Get full result of a single scan
 * @access  Private
 */
router.get(
  '/:id',
  idParamValidation,
  validateRequest,
  getScanById
);

/**
 * @route   GET /api/scan/:id/headers
 * @desc    Get raw headers collected during a scan
 * @access  Private
 */
router.get(
  '/:id/headers',
  idParamValidation,
  validateRequest,
  getScanHeaders
);

/**
 * @route   DELETE /api/scan/:id
 * @desc    Delete a scan record
 * @access  Private
 */
router.delete(
  '/:id',
  idParamValidation,
  validateRequest,
  deleteScan
);

module.exports = router;
