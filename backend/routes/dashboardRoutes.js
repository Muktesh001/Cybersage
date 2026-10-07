/**
 * CyberSage - Dashboard Routes
 *
 * Base path (mounted in server.js):
 *   /api/dashboard
 *
 * All routes are private — require valid JWT via protect middleware.
 *
 * Routes:
 *   GET /api/dashboard/stats    → Full stats (main dashboard load)
 *   GET /api/dashboard/summary  → Lightweight summary (widgets)
 */

const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getDashboardSummary
} = require('../controllers/dashboardController');

const { protect } = require('../middlewares/authMiddleware');

// All dashboard routes require authentication
router.use(protect);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Full dashboard statistics for the authenticated user
 * @access  Private
 */
router.get('/stats', getDashboardStats);

/**
 * @route   GET /api/dashboard/summary
 * @desc    Lightweight stats summary
 * @access  Private
 */
router.get('/summary', getDashboardSummary);

module.exports = router;
