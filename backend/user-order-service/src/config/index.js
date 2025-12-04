/**
 * User & Order Service Configuration
 */

const config = {
  // Server configuration
  port: parseInt(process.env.USER_ORDER_SERVICE_PORT, 10) || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medassist',
  
  // Redis
  redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
  
  // RabbitMQ
  rabbitmqUri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-256-bit-secret-change-in-production',
    issuer: 'medassist-auth',
    audience: 'medassist-services'
  },
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Search service
  searchServiceUrl: process.env.SEARCH_SERVICE_URL || 'http://localhost:3003',
  
  // Inventory lock settings
  inventoryLockTTL: parseInt(process.env.INVENTORY_LOCK_TTL, 10) || 30
};

module.exports = config;
