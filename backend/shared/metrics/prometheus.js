/**
 * Prometheus metrics module for MedAssist services
 */

const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// HTTP request counter
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// Orders created counter
const ordersCreatedTotal = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  registers: [register]
});

// Orders failed counter
const ordersFailedTotal = new promClient.Counter({
  name: 'orders_failed_total',
  help: 'Total number of orders failed',
  registers: [register]
});

// Inventory reserved counter
const inventoryReservedTotal = new promClient.Counter({
  name: 'inventory_reserved_total',
  help: 'Total number of inventory reservations',
  registers: [register]
});

// Active users gauge
const activeUsersGauge = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users',
  registers: [register]
});

// Database connection gauge
const dbConnectionsGauge = new promClient.Gauge({
  name: 'database_connections',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [register]
});

// RabbitMQ messages counter
const rabbitmqMessagesTotal = new promClient.Counter({
  name: 'rabbitmq_messages_total',
  help: 'Total number of RabbitMQ messages',
  labelNames: ['queue', 'action'],
  registers: [register]
});

// Search queries counter
const searchQueriesTotal = new promClient.Counter({
  name: 'search_queries_total',
  help: 'Total number of search queries',
  labelNames: ['type'],
  registers: [register]
});

// Authentication counter
const authAttemptsTotal = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status'],
  registers: [register]
});

/**
 * Express middleware to collect metrics
 * @returns {Function} - Express middleware
 */
function metricsMiddleware() {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route ? req.route.path : req.path;
      const labels = {
        method: req.method,
        route,
        status: res.statusCode
      };

      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(labels, duration);
    });

    next();
  };
}

/**
 * Express route handler for /metrics endpoint
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
}

/**
 * Increment orders created counter
 */
function incrementOrdersCreated() {
  ordersCreatedTotal.inc();
}

/**
 * Increment orders failed counter
 */
function incrementOrdersFailed() {
  ordersFailedTotal.inc();
}

/**
 * Increment inventory reserved counter
 */
function incrementInventoryReserved() {
  inventoryReservedTotal.inc();
}

/**
 * Set active users count
 * @param {number} count - Number of active users
 */
function setActiveUsers(count) {
  activeUsersGauge.set(count);
}

/**
 * Set database connections count
 * @param {string} database - Database name
 * @param {number} count - Number of connections
 */
function setDbConnections(database, count) {
  dbConnectionsGauge.labels(database).set(count);
}

/**
 * Increment RabbitMQ messages counter
 * @param {string} queue - Queue name
 * @param {string} action - Action (published, consumed, failed)
 */
function incrementRabbitMQMessages(queue, action) {
  rabbitmqMessagesTotal.labels(queue, action).inc();
}

/**
 * Increment search queries counter
 * @param {string} type - Search type (medicine, pharmacy, autocomplete)
 */
function incrementSearchQueries(type) {
  searchQueriesTotal.labels(type).inc();
}

/**
 * Increment auth attempts counter
 * @param {string} type - Auth type (login, register, refresh)
 * @param {string} status - Status (success, failure)
 */
function incrementAuthAttempts(type, status) {
  authAttemptsTotal.labels(type, status).inc();
}

/**
 * Reset all metrics
 */
function resetMetrics() {
  register.resetMetrics();
}

module.exports = {
  register,
  metricsMiddleware,
  metricsHandler,
  httpRequestsTotal,
  httpRequestDuration,
  ordersCreatedTotal,
  ordersFailedTotal,
  inventoryReservedTotal,
  activeUsersGauge,
  dbConnectionsGauge,
  rabbitmqMessagesTotal,
  searchQueriesTotal,
  authAttemptsTotal,
  incrementOrdersCreated,
  incrementOrdersFailed,
  incrementInventoryReserved,
  setActiveUsers,
  setDbConnections,
  incrementRabbitMQMessages,
  incrementSearchQueries,
  incrementAuthAttempts,
  resetMetrics
};
