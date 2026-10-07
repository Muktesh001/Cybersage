/**
 * CyberSage - Dashboard Controller
 *
 * Purpose:
 *   Aggregate and return all data needed by the frontend dashboard
 *   in a single API response. Minimizes round-trips.
 *
 * Endpoints:
 *   GET /api/dashboard/stats   → Full dashboard statistics
 *   GET /api/dashboard/summary → Lightweight summary (for header widgets)
 *
 * Flow:
 *   protect middleware → getStats → Scan.getDashboardStats() →
 *   enrich data → return JSON
 */

const Scan = require('../models/Scan');
const User = require('../models/User');
const logger = require('../utils/logger');
const { createError } = require('../middlewares/errorHandler');

// ========================================
// HELPERS
// ========================================

/**
 * Derive score label and color class from numeric score
 */
const getScoreRating = (score) => {
  if (score === null || score === undefined) return { label: 'No Data', color: 'gray' };
  if (score >= 90) return { label: 'Excellent', color: 'green' };
  if (score >= 70) return { label: 'Good',      color: 'blue'  };
  if (score >= 50) return { label: 'Fair',       color: 'yellow'};
  if (score >= 30) return { label: 'Poor',       color: 'orange'};
  return               { label: 'Critical',   color: 'red'   };
};

/**
 * Fill missing days in trend data so the chart always shows 7 data points
 * @param {Array} trendData - [{ _id: 'YYYY-MM-DD', avgScore, count }]
 * @returns {Array} - 7 entries, one per day (null score for missing days)
 */
const fillTrendDays = (trendData) => {
  const result = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const found = trendData.find(t => t._id === key);

    result.push({
      date:     key,
      label:    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgScore: found ? Math.round(found.avgScore) : null,
      count:    found ? found.count : 0
    });
  }

  return result;
};

// ========================================
// GET DASHBOARD STATS
// ========================================

/**
 * @route   GET /api/dashboard/stats
 * @access  Private
 * @desc    Full dashboard statistics for the authenticated user
 *
 * Response shape:
 * {
 *   success: true,
 *   data: {
 *     overview:       { totalScans, averageScore, scoreRating, totalFindings }
 *     severityCounts: { critical, high, medium, low, info }
 *     recentScans:    [...5 recent scans]
 *     trend:          [...7 day data points]
 *     user:           { name, email, role }
 *   }
 * }
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch aggregated stats from Scan model
    const stats = await Scan.getDashboardStats(userId);

    // Enrich score with label
    const scoreRating = getScoreRating(stats.averageScore);

    // Fill missing trend days
    const trend = fillTrendDays(stats.trendData || []);

    // Total findings across all scans
    const sc = stats.severityCounts;
    const totalFindings = (sc.critical || 0) + (sc.high || 0) +
                          (sc.medium  || 0) + (sc.low  || 0) + (sc.info || 0);

    // Format recent scans for frontend table
    const recentScans = (stats.recentScans || []).map(scan => ({
      id:           scan._id,
      url:          scan.url,
      domain:       scan.domain,
      score:        scan.score,
      grade:        scan.grade,
      status:       scan.status,
      findings:     scan.findingsSummary || {},
      scannedAt:    scan.createdAt,
      duration:     scan.scanDuration
    }));

    logger.info(`[Dashboard] Stats fetched for user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalScans:    stats.totalScans,
          averageScore:  stats.averageScore,
          scoreRating,
          totalFindings
        },
        severityCounts: stats.severityCounts,
        recentScans,
        trend
      }
    });

  } catch (error) {
    logger.error(`[Dashboard] Stats error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET LIGHTWEIGHT SUMMARY
// ========================================

/**
 * @route   GET /api/dashboard/summary
 * @access  Private
 * @desc    Minimal stats for header/nav widgets
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [totalScans, lastScan] = await Promise.all([
      Scan.countDocuments({ userId, status: 'completed' }),
      Scan.findOne({ userId, status: 'completed' })
        .sort({ createdAt: -1 })
        .select('score grade domain createdAt')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalScans,
        lastScan: lastScan || null
      }
    });

  } catch (error) {
    logger.error(`[Dashboard] Summary error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getDashboardSummary
};
