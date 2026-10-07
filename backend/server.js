/**
 * CyberSage Backend Server
 * Main entry point for the Express application
 * 
 * Purpose:
 * - Initialize Express app
 * - Configure middleware (CORS, Helmet, Rate Limiting)
 * - Connect to MongoDB
 * - Register routes
 * - Start server
 * - Handle graceful shutdown
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./database/connection');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');

// Initialize Express App
const app = express();

// Environment Variables
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========================================
// DATABASE CONNECTION
// ========================================
connectDB();

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP Request Logger
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// ========================================
// ROUTES
// ========================================

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CyberSage Backend is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// API Routes
app.use('/api/auth',      authLimiter,              require('./routes/authRoutes'));
app.use('/api/dashboard',                           require('./routes/dashboardRoutes'));
app.use('/api/scan',                                require('./routes/scanRoutes'));
app.use('/api/ai',                                  require('./routes/aiRoutes'));
app.use('/api/report',                              require('./routes/reportRoutes'));
app.use('/api/admin',                               require('./routes/adminRoutes'));

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================
app.use(errorHandler);

// ========================================
// START SERVER
// ========================================
const server = app.listen(PORT, () => {
  logger.info(`🚀 CyberSage Backend Server started successfully`);
  logger.info(`📡 Server running on port: ${PORT}`);
  logger.info(`🌍 Environment: ${NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
