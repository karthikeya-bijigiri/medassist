/**
 * MongoDB connection module for MedAssist services
 */

const mongoose = require('mongoose');
const { createLogger } = require('../logging/logger');

const logger = createLogger('mongodb');

/**
 * Connect to MongoDB
 * @param {string} uri - MongoDB connection URI
 * @param {object} options - Additional connection options
 * @returns {Promise<mongoose.Connection>}
 */
async function connectMongoDB(uri = process.env.MONGODB_URI, options = {}) {
  const defaultOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  };

  const connectionOptions = { ...defaultOptions, ...options };

  try {
    await mongoose.connect(uri, connectionOptions);
    logger.info('MongoDB connected successfully', { uri: uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') });
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
async function disconnectMongoDB() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('MongoDB disconnect error', { error: error.message });
    throw error;
  }
}

/**
 * Check if MongoDB is connected
 * @returns {boolean}
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Get the MongoDB connection
 * @returns {mongoose.Connection}
 */
function getConnection() {
  return mongoose.connection;
}

/**
 * Create a health check function for MongoDB
 * @returns {Promise<object>} - Health status
 */
async function healthCheck() {
  try {
    if (!isConnected()) {
      return { status: 'unhealthy', message: 'Not connected' };
    }
    
    await mongoose.connection.db.admin().ping();
    return { status: 'healthy', message: 'Connected' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
  isConnected,
  getConnection,
  healthCheck,
  mongoose
};
