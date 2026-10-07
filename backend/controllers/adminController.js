/**
 * CyberSage - Admin Controller
 *
 * Purpose:
 *   Administrative operations for the admin panel.
 *   All routes require admin role — enforced by restrictTo('admin').
 *
 * Controllers:
 *   getAdminStats     GET  /api/admin/stats         — Platform-wide statistics
 *   getAllUsers        GET  /api/admin/users          — Paginated user list
 *   getUserById        GET  /api/admin/users/:id      — Single user detail
 *   updateUserRole     PUT  /api/admin/users/:id/role — Change user role
 *   deleteUser         DEL  /api/admin/users/:id      — Delete user + their scans
 *   getAllScans         GET  /api/admin/scans          — All scans across all users
 */

const User            = require('../models/User');
const Scan            = require('../models/Scan');
const { createError } = require('../middlewares/errorHandler');
const logger          = require('../utils/logger');

// ========================================
// GET ADMIN STATS
// ========================================

/**
 * @route   GET /api/admin/stats
 * @access  Admin only
 */
const getAdminStats = async (req, res, next) => {
  try {
    const [
      userStats,
      totalScans,
      completedScans,
      failedScans,
      avgScoreResult,
      recentScans,
      topDomains,
      scansLast7Days
    ] = await Promise.all([
      User.getUserStats(),

      Scan.countDocuments(),
      Scan.countDocuments({ status: 'completed' }),
      Scan.countDocuments({ status: 'failed' }),

      Scan.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } }
      ]),

      Scan.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name email')
        .select('url domain score grade createdAt userId')
        .lean(),

      Scan.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$domain', count: { $sum: 1 }, avgScore: { $avg: '$score' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),

      Scan.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: userStats,
        scans: {
          total:     totalScans,
          completed: completedScans,
          failed:    failedScans,
          running:   totalScans - completedScans - failedScans,
          avgScore:  avgScoreResult[0]?.avgScore
            ? Math.round(avgScoreResult[0].avgScore) : null
        },
        recentScans,
        topDomains,
        scansLast7Days
      }
    });
  } catch (error) {
    logger.error(`[Admin] getAdminStats error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET ALL USERS
// ========================================

/**
 * @route   GET /api/admin/users
 * @access  Admin only
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(50, parseInt(req.query.limit || '20', 10));
    const skip   = (page - 1) * limit;
    const search = req.query.search || '';
    const role   = req.query.role   || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;

    const sortField = req.query.sortBy  || 'createdAt';
    const sortOrder = req.query.sortDir === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    // Attach scan count per user
    const userIds    = users.map(u => u._id);
    const scanCounts = await Scan.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(scanCounts.map(s => [s._id.toString(), s.count]));

    const enrichedUsers = users.map(u => ({
      ...u,
      scanCount: countMap[u._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    logger.error(`[Admin] getAllUsers error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET USER BY ID
// ========================================

/**
 * @route   GET /api/admin/users/:id
 * @access  Admin only
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return next(createError(404, 'User not found'));

    const [scans, scanStats] = await Promise.all([
      Scan.find({ userId: req.params.id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('url domain score grade status createdAt')
        .lean(),
      Scan.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, total: { $sum: 1 }, avgScore: { $avg: '$score' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        recentScans: scans,
        stats: {
          totalScans: scanStats[0]?.total || 0,
          avgScore:   scanStats[0]?.avgScore ? Math.round(scanStats[0].avgScore) : null
        }
      }
    });
  } catch (error) {
    logger.error(`[Admin] getUserById error: ${error.message}`);
    next(error);
  }
};

// ========================================
// UPDATE USER ROLE
// ========================================

/**
 * @route   PUT /api/admin/users/:id/role
 * @access  Admin only
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return next(createError(400, 'Invalid role. Must be "user" or "admin"'));
    }

    // Prevent admin from demoting themselves
    if (req.params.id === req.user.id) {
      return next(createError(400, 'You cannot change your own role'));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) return next(createError(404, 'User not found'));

    logger.info(`[Admin] Role updated: ${user.email} -> ${role} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user }
    });
  } catch (error) {
    logger.error(`[Admin] updateUserRole error: ${error.message}`);
    next(error);
  }
};

// ========================================
// DELETE USER
// ========================================

/**
 * @route   DELETE /api/admin/users/:id
 * @access  Admin only
 * @desc    Delete user and ALL their scans (cascade)
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return next(createError(400, 'You cannot delete your own account from admin panel'));
    }

    const user = await User.findById(req.params.id);
    if (!user) return next(createError(404, 'User not found'));

    // Delete all user's scans first
    const { deletedCount } = await Scan.deleteMany({ userId: req.params.id });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    logger.info(`[Admin] User deleted: ${user.email} (${deletedCount} scans removed) by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `User ${user.email} and ${deletedCount} scan(s) deleted successfully`
    });
  } catch (error) {
    logger.error(`[Admin] deleteUser error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET ALL SCANS (Admin view)
// ========================================

/**
 * @route   GET /api/admin/scans
 * @access  Admin only
 */
const getAllScans = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.domain) filter.domain = { $regex: req.query.domain, $options: 'i' };

    const [scans, total] = await Promise.all([
      Scan.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .select('-findings -headers -cookies -aiExplanation')
        .lean(),
      Scan.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        scans,
        pagination: {
          page, limit, total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    logger.error(`[Admin] getAllScans error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAdminStats, getAllUsers, getUserById,
  updateUserRole, deleteUser, getAllScans
};
