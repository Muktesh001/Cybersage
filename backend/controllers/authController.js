/**
 * CyberSage - Authentication Controllers
 *
 * Purpose:
 *   Business logic for user authentication operations.
 *   Handles signup, login, password reset, profile management.
 *
 * Controllers:
 *   - signup: Register new user
 *   - login: Authenticate user and return JWT
 *   - forgotPassword: Generate password reset token
 *   - resetPassword: Reset password using token
 *   - getProfile: Get current user details
 *   - updateProfile: Update user name/email
 *   - changePassword: Change password for authenticated user
 *
 * Flow:
 *   Route → Validation → Controller → Model → Response
 */

const User = require('../models/User');
const logger = require('../utils/logger');
const { createError } = require('../middlewares/errorHandler');
const crypto = require('crypto');

// ========================================
// SIGNUP - Register New User
// ========================================

/**
 * @route   POST /api/auth/signup
 * @access  Public
 * @desc    Create new user account
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(createError(409, 'Email already registered. Please login.'));
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'user', // Default role
      isVerified: false
    });

    // Generate JWT token
    const token = user.generateAuthToken();

    // Update last login
    await user.updateLastLogin();

    logger.info(`[Auth] New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    logger.error(`[Auth] Signup error: ${error.message}`);
    next(error);
  }
};

// ========================================
// LOGIN - Authenticate User
// ========================================

/**
 * @route   POST /api/auth/login
 * @access  Public
 * @desc    Authenticate user and return JWT
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return next(createError(401, 'Invalid email or password'));
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      logger.warn(`[Auth] Failed login attempt for: ${email}`);
      return next(createError(401, 'Invalid email or password'));
    }

    // Generate JWT token
    const token = user.generateAuthToken();

    // Update last login
    await user.updateLastLogin();

    logger.info(`[Auth] User logged in: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin
        },
        token
      }
    });
  } catch (error) {
    logger.error(`[Auth] Login error: ${error.message}`);
    next(error);
  }
};

// ========================================
// FORGOT PASSWORD - Generate Reset Token
// ========================================

/**
 * @route   POST /api/auth/forgot-password
 * @access  Public
 * @desc    Generate password reset token and send email (placeholder)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Security: Don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    // TODO: Send email with reset link
    // For now, we'll just log it (in production, use nodemailer)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    logger.info(`[Auth] Password reset requested for: ${email}`);
    logger.info(`[Auth] Reset URL (DEV ONLY): ${resetUrl}`);

    // In development, return the token for testing
    const responseData = {
      success: true,
      message: 'Password reset instructions have been sent to your email.'
    };

    // Include token in development for testing
    if (process.env.NODE_ENV === 'development') {
      responseData.resetToken = resetToken;
      responseData.resetUrl = resetUrl;
    }

    res.status(200).json(responseData);

  } catch (error) {
    logger.error(`[Auth] Forgot password error: ${error.message}`);
    next(error);
  }
};

// ========================================
// RESET PASSWORD - Update Password with Token
// ========================================

/**
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 * @desc    Reset password using valid token
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user by valid reset token
    const user = await User.findByResetToken(token);

    if (!user) {
      return next(createError(400, 'Invalid or expired password reset token'));
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info(`[Auth] Password reset successful for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    logger.error(`[Auth] Reset password error: ${error.message}`);
    next(error);
  }
};

// ========================================
// GET PROFILE - Get Current User
// ========================================

/**
 * @route   GET /api/auth/profile
 * @access  Private (requires JWT)
 * @desc    Get current authenticated user's profile
 */
const getProfile = async (req, res, next) => {
  try {
    // req.user is set by protect middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(createError(404, 'User not found'));
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    logger.error(`[Auth] Get profile error: ${error.message}`);
    next(error);
  }
};

// ========================================
// UPDATE PROFILE - Update User Details
// ========================================

/**
 * @route   PUT /api/auth/profile
 * @access  Private (requires JWT)
 * @desc    Update user name and email (not password)
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // Update fields
    if (name) user.name = name;
    if (email && email !== user.email) {
      // Check if new email already exists
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return next(createError(409, 'Email already in use'));
      }
      user.email = email.toLowerCase();
      user.isVerified = false; // Re-verify if email changed
    }

    await user.save();

    logger.info(`[Auth] Profile updated for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        }
      }
    });

  } catch (error) {
    logger.error(`[Auth] Update profile error: ${error.message}`);
    next(error);
  }
};

// ========================================
// CHANGE PASSWORD - Update Password
// ========================================

/**
 * @route   PUT /api/auth/change-password
 * @access  Private (requires JWT)
 * @desc    Change password for authenticated user
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return next(createError(404, 'User not found'));
    }

    // Verify current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return next(createError(401, 'Current password is incorrect'));
    }

    // Update to new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    logger.info(`[Auth] Password changed for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error(`[Auth] Change password error: ${error.message}`);
    next(error);
  }
};

// ========================================
// EXPORTS
// ========================================

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword
};
