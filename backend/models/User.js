/**
 * CyberSage - User Model
 *
 * Purpose:
 *   Mongoose schema for User collection.
 *   Handles authentication, password hashing, JWT generation,
 *   and password reset tokens.
 *
 * Schema Fields:
 *   - name: User's full name
 *   - email: Unique email (indexed)
 *   - password: Hashed password (bcrypt)
 *   - role: 'user' or 'admin'
 *   - isVerified: Email verification flag
 *   - resetPasswordToken: Hashed token for password reset
 *   - resetPasswordExpires: Token expiration time
 *   - lastLogin: Last login timestamp
 *   - createdAt, updatedAt: Auto timestamps
 *
 * Instance Methods:
 *   - comparePassword(candidatePassword): Verify password
 *   - generateAuthToken(): Generate JWT
 *   - generateResetToken(): Generate password reset token
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const config = require('../config/config');

// ========================================
// USER SCHEMA
// ========================================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Please provide a valid email address'
      }
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Never return password in queries by default
    },

    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role must be either user or admin'
      },
      default: 'user'
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    resetPasswordToken: {
      type: String,
      select: false
    },

    resetPasswordExpires: {
      type: Date,
      select: false
    },

    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// ========================================
// INDEXES
// ========================================

// email index is created automatically by unique:true on the field
userSchema.index({ createdAt: -1 });

// ========================================
// PRE-SAVE MIDDLEWARE
// ========================================

/**
 * Hash password before saving if it has been modified
 */
userSchema.pre('save', async function (next) {
  // Only hash if password is modified (or new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ========================================
// INSTANCE METHODS
// ========================================

/**
 * Compare candidate password with stored hashed password
 * @param {string} candidatePassword - Plain text password
 * @returns {Promise<boolean>} - True if match, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Generate JWT authentication token
 * @returns {string} - Signed JWT token
 */
userSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Generate password reset token
 * Stores hashed version in DB, returns plain token to send via email
 * @returns {string} - Plain reset token (to be sent in email)
 */
userSchema.methods.generateResetToken = function () {
  // Generate random 32-byte token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token before storing in DB
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiry (from config, default 1 hour)
  this.resetPasswordExpires = Date.now() + config.reset.tokenExpires;

  // Return the plain token (this is what gets emailed)
  return resetToken;
};

/**
 * Update last login timestamp
 */
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
};

// ========================================
// STATIC METHODS
// ========================================

/**
 * Find user by reset token
 * @param {string} token - Plain reset token from email link
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByResetToken = async function (token) {
  // Hash the incoming token to match stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  return this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() } // Token not expired
  }).select('+resetPasswordToken +resetPasswordExpires');
};

/**
 * Get user count by role
 * @returns {Promise<Object>} - { total, users, admins }
 */
userSchema.statics.getUserStats = async function () {
  const total = await this.countDocuments();
  const users = await this.countDocuments({ role: 'user' });
  const admins = await this.countDocuments({ role: 'admin' });

  return { total, users, admins };
};

// ========================================
// EXPORT MODEL
// ========================================

const User = mongoose.model('User', userSchema);

module.exports = User;
