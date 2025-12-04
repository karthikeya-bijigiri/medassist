/**
 * Auth Service Configuration
 */

const config = {
  // Server configuration
  port: parseInt(process.env.AUTH_SERVICE_PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medassist',
  
  // Redis
  redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-256-bit-secret-change-in-production',
    accessTokenTTL: process.env.JWT_ACCESS_TOKEN_TTL || '15m',
    refreshTokenTTL: process.env.JWT_REFRESH_TOKEN_TTL || '30d',
    issuer: 'medassist-auth',
    audience: 'medassist-services'
  },
  
  // Password hashing
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    loginMaxAttempts: 5,
    otpMaxAttempts: 3
  },
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // OTP configuration
  otp: {
    length: 6,
    ttlSeconds: 300 // 5 minutes
  }
};

module.exports = config;
