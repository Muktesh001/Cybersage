/**
 * CyberSage - Report Routes
 *
 * Base path (mounted in server.js):
 *   /api/report
 *
 * All routes require JWT authentication.
 *
 * Routes:
 *   GET /api/report/:scanId/pdf   — Download PDF report
 *   GET /api/report/:scanId/meta  — Get report metadata
 */

const express = require('express');
const { param } = require('express-validator');
const router  = express.Router();

const { downloadPDFReport, getReportMeta } = require('../controllers/reportController');
const { protect }     = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');

// All report routes require authentication
router.use(protect);

// ---- Validation ----
const scanIdValidation = [
  param('scanId')
    .notEmpty().withMessage('Scan ID is required')
    .isMongoId().withMessage('Invalid scan ID format')
];

// ---- Routes ----

/**
 * @route   GET /api/report/:scanId/pdf
 * @desc    Generate and download PDF security report
 * @access  Private
 */
router.get(
  '/:scanId/pdf',
  scanIdValidation,
  validateRequest,
  downloadPDFReport
);

/**
 * @route   GET /api/report/:scanId/meta
 * @desc    Get report metadata (lightweight, no PDF generation)
 * @access  Private
 */
router.get(
  '/:scanId/meta',
  scanIdValidation,
  validateRequest,
  getReportMeta
);

module.exports = router;
