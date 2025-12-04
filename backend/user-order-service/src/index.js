/**
 * User & Order Service Entry Point
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const config = require('./config');
const medicinesRoutes = require('./routes/medicines.routes');
const ordersRoutes = require('./routes/orders.routes');
const usersRoutes = require('./routes/users.routes');
const pharmaciesRoutes = require('./routes/pharmacies.routes');
const paymentRoutes = require('./routes/payment.routes');

const { connectMongoDB } = require('@medassist/shared/database/mongodb');
const { connectRedis } = require('@medassist/shared/database/redis');
const { connectRabbitMQ, createChannel, setupExchangesAndQueues } = require('@medassist/shared/messaging/rabbitmq');
const { createLogger, requestLoggerMiddleware } = require('@medassist/shared/logging/logger');
const { errorHandler } = require('@medassist/shared/errors/AppError');
const { metricsMiddleware, metricsHandler } = require('@medassist/shared/metrics/prometheus');
const { MEDICAL_DISCLAIMER } = require('@medassist/shared/constants');

const app = express();
const logger = createLogger('user-order-service');

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
    service: 'user-order-service',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', metricsHandler);

// API routes
app.use('/api/v1/medicines', medicinesRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/pharmacies', pharmaciesRoutes);
app.use('/api/v1/payment', paymentRoutes);

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

    // Connect to RabbitMQ
    try {
      await connectRabbitMQ(config.rabbitmqUri);
      await createChannel();
      await setupExchangesAndQueues();
      logger.info('RabbitMQ connected');
    } catch (error) {
      logger.warn('RabbitMQ connection failed, continuing without messaging', { error: error.message });
    }

    // Start server
    app.listen(config.port, () => {
      logger.info(`User & Order service started on port ${config.port}`, {
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

startServer();

module.exports = app;
