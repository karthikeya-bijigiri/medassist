/**
 * Notification Worker Entry Point
 */

const express = require('express');
const config = require('./config');
const { startOrderConsumer } = require('./consumers/order.consumer');
const { startDeliveryConsumer } = require('./consumers/delivery.consumer');
const { startInventoryConsumer } = require('./consumers/inventory.consumer');

const { connectMongoDB } = require('@medassist/shared/database/mongodb');
const { connectRedis } = require('@medassist/shared/database/redis');
const { connectRabbitMQ, createChannel, setupExchangesAndQueues } = require('@medassist/shared/messaging/rabbitmq');
const { createLogger } = require('@medassist/shared/logging/logger');
const { metricsHandler } = require('@medassist/shared/metrics/prometheus');

// Register models
require('./models');

const logger = createLogger('notification-worker');

// Simple Express server for health checks and metrics
const app = express();

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'notification-worker',
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', metricsHandler);

/**
 * Start all consumers
 */
async function startConsumers() {
  try {
    await startOrderConsumer();
    await startDeliveryConsumer();
    await startInventoryConsumer();
    
    logger.info('All consumers started successfully');
  } catch (error) {
    logger.error('Failed to start consumers', { error: error.message });
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Connect to databases
    await connectMongoDB(config.mongodbUri);
    logger.info('MongoDB connected');

    await connectRedis(config.redisUri);
    logger.info('Redis connected');

    // Connect to RabbitMQ
    await connectRabbitMQ(config.rabbitmqUri);
    await createChannel();
    await setupExchangesAndQueues();
    logger.info('RabbitMQ connected');

    // Start consumers
    await startConsumers();

    // Start health check server
    app.listen(config.port, () => {
      logger.info(`Notification worker started on port ${config.port}`, {
        port: config.port,
        env: config.nodeEnv
      });
    });
  } catch (error) {
    logger.error('Failed to start notification worker', { error: error.message });
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

main();

module.exports = app;
