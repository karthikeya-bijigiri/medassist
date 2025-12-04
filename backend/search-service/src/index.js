/**
 * Search Service Entry Point
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const config = require('./config');
const searchRoutes = require('./routes/search.routes');
const searchController = require('./controllers/search.controller');
const elasticsearchService = require('./services/elasticsearch.service');

const { connectMongoDB } = require('@medassist/shared/database/mongodb');
const { connectRedis } = require('@medassist/shared/database/redis');
const { createLogger, requestLoggerMiddleware } = require('@medassist/shared/logging/logger');
const { errorHandler, AppError } = require('@medassist/shared/errors/AppError');
const { metricsMiddleware, metricsHandler } = require('@medassist/shared/metrics/prometheus');

const app = express();
const logger = createLogger('search-service');

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
app.get('/health', async (req, res) => {
  const esHealth = await elasticsearchService.healthCheck();
  res.json({
    status: esHealth.status === 'healthy' ? 'ok' : 'degraded',
    service: 'search-service',
    elasticsearch: esHealth,
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', metricsHandler);

// API routes
app.use('/api/v1/search', searchRoutes);

// Admin reindex route (protected)
app.post('/api/v1/admin/reindex', async (req, res, next) => {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('No token provided');
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: ['HS256']
    });
    
    if (!decoded.roles || !decoded.roles.includes('admin')) {
      throw AppError.forbidden('Admin access required');
    }
    
    await searchController.reindex(req, res);
  } catch (error) {
    next(error);
  }
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
    // Connect to MongoDB (for reindex functionality)
    await connectMongoDB(config.mongodbUri);
    logger.info('MongoDB connected');

    // Connect to Redis (for caching)
    await connectRedis(config.redisUri);
    logger.info('Redis connected');

    // Initialize Elasticsearch
    elasticsearchService.initElasticsearch();
    await elasticsearchService.setupIndices();
    logger.info('Elasticsearch initialized');

    // Start server
    app.listen(config.port, () => {
      logger.info(`Search service started on port ${config.port}`, {
        port: config.port,
        env: config.nodeEnv
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

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
