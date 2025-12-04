/**
 * Auth Service Entry Point
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const config = require('./config');
const authRoutes = require('./routes/auth.routes');
const { connectMongoDB } = require('@medassist/shared/database/mongodb');
const { connectRedis } = require('@medassist/shared/database/redis');
const { createLogger, requestLoggerMiddleware } = require('@medassist/shared/logging/logger');
const { errorHandler } = require('@medassist/shared/errors/AppError');
const { metricsMiddleware, metricsHandler } = require('@medassist/shared/metrics/prometheus');
const { MEDICAL_DISCLAIMER } = require('@medassist/shared/constants');

const app = express();
const logger = createLogger('auth-service');

// Store logger in app
app.set('logger', logger);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(requestLoggerMiddleware(logger));
app.use(metricsMiddleware());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', metricsHandler);

// API routes
app.use('/api/v1/auth', authRoutes);

// Medical disclaimer endpoint
app.get('/api/v1/disclaimer', (req, res) => {
  res.json({ disclaimer: MEDICAL_DISCLAIMER });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error_code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to databases
    await connectMongoDB(config.mongodbUri);
    logger.info('MongoDB connected');
    
    await connectRedis(config.redisUri);
    logger.info('Redis connected');
    
    // Start server
    app.listen(config.port, () => {
      logger.info(`Auth service started on port ${config.port}`, {
        port: config.port,
        env: config.nodeEnv
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
