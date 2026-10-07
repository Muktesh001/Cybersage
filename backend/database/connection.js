/**
 * CyberSage - MongoDB Database Connection
 *
 * Purpose:
 *   Establishes and manages the MongoDB connection via Mongoose.
 *   Includes retry logic, event listeners, and graceful disconnect.
 *
 * Flow:
 *   connectDB() called in server.js → connects to MongoDB →
 *   logs success/failure → attaches lifecycle event listeners
 */

const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../utils/logger');

// Mongoose global settings
mongoose.set('strictQuery', true); // Suppress deprecation warning

// Track retry count
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Establish MongoDB connection
 * Retries up to MAX_RETRIES times on failure
 */
const connectDB = async () => {
  try {
    const options = {
      // Use the new URL parser
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10,             // Maximum number of connections
      minPoolSize: 2,              // Minimum number of connections
      connectTimeoutMS: 10000
    };

    logger.info(`[DB] Connecting to MongoDB...`);

    const conn = await mongoose.connect(config.db.uri, options);

    retryCount = 0; // Reset retry count on success

    logger.info(`[DB] ✅ MongoDB connected successfully`);
    logger.info(`[DB] Host: ${conn.connection.host}`);
    logger.info(`[DB] Database: ${conn.connection.name}`);

    return conn;

  } catch (error) {
    retryCount++;
    logger.error(`[DB] ❌ MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES})`);
    logger.error(`[DB] Error: ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      logger.info(`[DB] Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(); // Recursive retry
    } else {
      logger.error(`[DB] Max retries reached. Could not connect to MongoDB.`);
      logger.error(`[DB] Please check your MONGO_URI in .env file`);
      process.exit(1);
    }
  }
};

// ---- Mongoose Connection Event Listeners ----

mongoose.connection.on('connected', () => {
  logger.info('[DB] Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error(`[DB] Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('[DB] Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  logger.info('[DB] Mongoose reconnected to MongoDB');
});

// ---- Graceful Disconnect on App Termination ----

const gracefulDisconnect = async (signal) => {
  try {
    await mongoose.connection.close();
    logger.info(`[DB] MongoDB connection closed due to ${signal}`);
  } catch (err) {
    logger.error(`[DB] Error closing MongoDB connection: ${err.message}`);
  }
};

process.on('SIGINT', () => gracefulDisconnect('SIGINT'));
process.on('SIGTERM', () => gracefulDisconnect('SIGTERM'));

module.exports = connectDB;
