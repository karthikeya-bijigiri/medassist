/**
 * Search Service Configuration
 */

const config = {
  port: parseInt(process.env.SEARCH_SERVICE_PORT, 10) || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medassist',
  redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
  elasticsearchUri: process.env.ELASTICSEARCH_URI || 'http://localhost:9200',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-256-bit-secret-change-in-production',
    issuer: 'medassist-auth',
    audience: 'medassist-services'
  },
  
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  elasticsearch: {
    medicineIndex: 'medicines',
    pharmacyIndex: 'pharmacies',
    inventoryIndex: 'pharmacy_inventory'
  }
};

module.exports = config;
