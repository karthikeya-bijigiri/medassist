/**
 * Notification Worker Configuration
 */

const config = {
  port: parseInt(process.env.NOTIFICATION_WORKER_PORT, 10) || 3004,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medassist',
  redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
  rabbitmqUri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
  elasticsearchUri: process.env.ELASTICSEARCH_URI || 'http://localhost:9200'
};

module.exports = config;
