/**
 * CyberSage - AI Routes
 *
 * Base path (mounted in server.js):
 *   /api/ai
 *
 * All routes require JWT authentication.
 *
 * Routes:
 *   POST  /api/ai/explain/:scanId              — Generate AI explanation for a scan
 *   GET   /api/ai/explain/:scanId              — Get cached AI explanation
 *   POST  /api/ai/finding/:scanId/:ruleId      — Explain a single finding
 */

const express = require('express');
const { param, query } = require('express-validator');
const router  = express.Router();

const {
  explainScan,
  getExplanation,
  explainFinding
} = require('../controllers/aiController');

const { protect }      = require('../middlewares/authMiddleware');
const validateRequest  = require('../middlewares/validateRequest');

// All AI routes require authentication
router.use(protect);

// ---- Validation ----

const scanIdValidation = [
  param('scanId')
    .notEmpty().withMessage('Scan ID is required')
    .isMongoId().withMessage('Invalid scan ID format')
];

const findingValidation = [
  param('scanId')
    .notEmpty().withMessage('Scan ID is required')
    .isMongoId().withMessage('Invalid scan ID format'),
  param('ruleId')
    .notEmpty().withMessage('Rule ID is required')
    .isString().withMessage('Rule ID must be a string')
    .matches(/^[A-Z]+-\d+$/).withMessage('Invalid rule ID format (e.g. HDR-001)')
];

const regenerateValidation = [
  query('regenerate')
    .optional()
    .isIn(['true', 'false']).withMessage('regenerate must be true or false')
];

// ---- Routes ----

/**
 * @route   POST /api/ai/explain/:scanId
 * @desc    Generate (or return cached) full AI analysis for a scan
 * @access  Private
 */
router.post(
  '/explain/:scanId',
  [...scanIdValidation, ...regenerateValidation],
  validateRequest,
  explainScan
);

/**
 * @route   GET /api/ai/explain/:scanId
 * @desc    Get cached AI explanation (no generation)
 * @access  Private
 */
router.get(
  '/explain/:scanId',
  scanIdValidation,
  validateRequest,
  getExplanation
);

/**
 * @route   POST /api/ai/finding/:scanId/:ruleId
 * @desc    Generate AI explanation for a specific finding
 * @access  Private
 */
router.post(
  '/finding/:scanId/:ruleId',
  findingValidation,
  validateRequest,
  explainFinding
);

module.exports = router;
