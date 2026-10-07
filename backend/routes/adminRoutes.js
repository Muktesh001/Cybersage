/**
 * CyberSage - Admin Routes
 *
 * Base path: /api/admin
 * ALL routes: protect + restrictTo('admin')
 *
 * Routes:
 *   GET    /api/admin/stats           — Platform statistics
 *   GET    /api/admin/users           — All users (paginated)
 *   GET    /api/admin/users/:id       — Single user detail
 *   PUT    /api/admin/users/:id/role  — Update user role
 *   DELETE /api/admin/users/:id       — Delete user + scans
 *   GET    /api/admin/scans           — All scans (paginated)
 */

const express = require('express');
const { param, body, query } = require('express-validator');
const router  = express.Router();

const {
  getAdminStats, getAllUsers, getUserById,
  updateUserRole, deleteUser, getAllScans
} = require('../controllers/adminController');

const { protect, restrictTo } = require('../middlewares/authMiddleware');
const validateRequest          = require('../middlewares/validateRequest');

// Require admin role for all routes in this router
router.use(protect, restrictTo('admin'));

const idValidation = [
  param('id').isMongoId().withMessage('Invalid ID format')
];

// Stats
router.get('/stats', getAdminStats);

// Users
router.get('/users',
  [
    query('page').optional().isInt({ min:1 }),
    query('limit').optional().isInt({ min:1, max:50 }),
    query('role').optional().isIn(['user','admin'])
  ],
  validateRequest, getAllUsers);

router.get('/users/:id',  idValidation, validateRequest, getUserById);

router.put('/users/:id/role',
  [ ...idValidation, body('role').isIn(['user','admin']).withMessage('Role must be user or admin') ],
  validateRequest, updateUserRole);

router.delete('/users/:id', idValidation, validateRequest, deleteUser);

// Scans
router.get('/scans',
  [
    query('page').optional().isInt({ min:1 }),
    query('limit').optional().isInt({ min:1, max:50 }),
    query('status').optional().isIn(['pending','running','completed','failed'])
  ],
  validateRequest, getAllScans);

module.exports = router;
