/**
 * CyberSage - Winston Logger Utility
 *
 * Purpose:
 *   Provides a centralized, structured logging system.
 *   - Console output (colored in dev, JSON in prod)
 *   - File output: logs/error.log (errors only)
 *   - File output: logs/combined.log (all levels)
 *
 * Log Levels (lowest to highest severity):
 *   silly → debug → verbose → http → info → warn → error
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('Server started');
 *   logger.error('Something failed', { error: err.message });
 *   logger.warn('Config missing');
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ---- Custom Log Format ----

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

// Development format: colored, human-readable
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
  })
);

// Production format: JSON for log aggregation tools
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const isProduction = process.env.NODE_ENV === 'production';

// ---- Transports ----

const transports = [
  // Console transport
  new winston.transports.Console({
    format: isProduction ? prodFormat : devFormat,
    level: isProduction ? 'warn' : 'debug'
  }),

  // Error log file — only error level and above
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: combine(timestamp(), errors({ stack: true }), json()),
    maxsize: 5 * 1024 * 1024,  // 5 MB max per file
    maxFiles: 5,                 // Keep 5 rotated files
    tailable: true
  }),

  // Combined log file — all levels
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    level: 'info',
    format: combine(timestamp(), errors({ stack: true }), json()),
    maxsize: 10 * 1024 * 1024, // 10 MB max per file
    maxFiles: 5,
    tailable: true
  })
];

// ---- Create Logger Instance ----

const logger = winston.createLogger({
  level: isProduction ? 'warn' : 'debug',
  transports,
  exitOnError: false // Do not crash on handled exceptions
});

// Handle Winston internal errors
logger.on('error', (err) => {
  console.error('Logger internal error:', err);
});

module.exports = logger;
