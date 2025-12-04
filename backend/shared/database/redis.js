/**
 * Redis connection module for MedAssist services
 */

const Redis = require('ioredis');
const { createLogger } = require('../logging/logger');
const { REDIS_KEYS, TTL } = require('../constants');

const logger = createLogger('redis');

let redisClient = null;

/**
 * Create a Redis connection
 * @param {string} uri - Redis connection URI
 * @param {object} options - Additional options
 * @returns {Redis} - Redis client instance
 */
function createRedisClient(uri = process.env.REDIS_URI, options = {}) {
  const defaultOptions = {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    lazyConnect: true
  };

  const client = new Redis(uri, { ...defaultOptions, ...options });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  client.on('ready', () => {
    logger.info('Redis ready');
  });

  client.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  client.on('reconnecting', () => {
    logger.info('Redis reconnecting');
  });

  return client;
}

/**
 * Connect to Redis
 * @param {string} uri - Redis connection URI
 * @returns {Promise<Redis>}
 */
async function connectRedis(uri = process.env.REDIS_URI) {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  redisClient = createRedisClient(uri);
  await redisClient.connect();
  return redisClient;
}

/**
 * Get the Redis client
 * @returns {Redis}
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis not connected. Call connectRedis first.');
  }
  return redisClient;
}

/**
 * Disconnect from Redis
 * @returns {Promise<void>}
 */
async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
}

/**
 * Store OTP in Redis
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @param {number} ttl - Time to live in seconds
 */
async function storeOTP(phone, otp, ttl = TTL.OTP) {
  const key = `${REDIS_KEYS.OTP}${phone}`;
  const data = JSON.stringify({ otp, created_at: Date.now(), used: false });
  await getRedisClient().setex(key, ttl, data);
}

/**
 * Verify OTP from Redis
 * @param {string} phone - Phone number
 * @param {string} otp - OTP to verify
 * @returns {Promise<{ valid: boolean, message: string }>}
 */
async function verifyOTP(phone, otp) {
  const key = `${REDIS_KEYS.OTP}${phone}`;
  const data = await getRedisClient().get(key);
  
  if (!data) {
    return { valid: false, message: 'OTP not found or expired' };
  }
  
  const otpData = JSON.parse(data);
  
  if (otpData.used) {
    return { valid: false, message: 'OTP already used' };
  }
  
  if (otpData.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // Mark as used
  otpData.used = true;
  await getRedisClient().setex(key, 60, JSON.stringify(otpData)); // Keep for 1 minute after use
  
  return { valid: true, message: 'OTP verified' };
}

/**
 * Store refresh token JTI for revocation tracking
 * @param {string} jti - JWT ID
 * @param {string} userId - User ID
 * @param {number} ttl - Time to live in seconds
 */
async function storeRefreshToken(jti, userId, ttl = TTL.REFRESH_TOKEN) {
  const key = `${REDIS_KEYS.REFRESH_TOKEN}${jti}`;
  const data = JSON.stringify({ user_id: userId, created_at: Date.now() });
  await getRedisClient().setex(key, ttl, data);
}

/**
 * Check if refresh token is valid (not revoked)
 * @param {string} jti - JWT ID
 * @returns {Promise<boolean>}
 */
async function isRefreshTokenValid(jti) {
  const key = `${REDIS_KEYS.REFRESH_TOKEN}${jti}`;
  const exists = await getRedisClient().exists(key);
  return exists === 1;
}

/**
 * Revoke refresh token
 * @param {string} jti - JWT ID
 */
async function revokeRefreshToken(jti) {
  const key = `${REDIS_KEYS.REFRESH_TOKEN}${jti}`;
  await getRedisClient().del(key);
}

/**
 * Acquire a distributed lock
 * @param {string} lockId - Lock identifier
 * @param {number} ttl - Lock TTL in seconds
 * @returns {Promise<boolean>} - True if lock acquired
 */
async function acquireLock(lockId, ttl = TTL.INVENTORY_LOCK) {
  const key = `${REDIS_KEYS.INVENTORY_LOCK}${lockId}`;
  const result = await getRedisClient().set(key, '1', 'EX', ttl, 'NX');
  return result === 'OK';
}

/**
 * Release a distributed lock
 * @param {string} lockId - Lock identifier
 */
async function releaseLock(lockId) {
  const key = `${REDIS_KEYS.INVENTORY_LOCK}${lockId}`;
  await getRedisClient().del(key);
}

/**
 * Rate limiting check
 * @param {string} identifier - Rate limit identifier (IP:endpoint)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: number }>}
 */
async function checkRateLimit(identifier, maxRequests, windowSeconds = TTL.RATE_LIMIT_WINDOW) {
  const key = `${REDIS_KEYS.RATE_LIMIT}${identifier}`;
  const client = getRedisClient();
  
  const multi = client.multi();
  multi.incr(key);
  multi.ttl(key);
  const results = await multi.exec();
  
  const count = results[0][1];
  let ttl = results[1][1];
  
  // Set TTL if this is the first request
  if (ttl === -1) {
    await client.expire(key, windowSeconds);
    ttl = windowSeconds;
  }
  
  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const resetAt = Date.now() + (ttl * 1000);
  
  return { allowed, remaining, resetAt };
}

/**
 * Cache search results
 * @param {string} hash - Search query hash
 * @param {any} data - Data to cache
 * @param {number} ttl - Cache TTL in seconds
 */
async function cacheSearchResults(hash, data, ttl = TTL.SEARCH_CACHE) {
  const key = `${REDIS_KEYS.SEARCH_CACHE}${hash}`;
  await getRedisClient().setex(key, ttl, JSON.stringify(data));
}

/**
 * Get cached search results
 * @param {string} hash - Search query hash
 * @returns {Promise<any|null>}
 */
async function getCachedSearchResults(hash) {
  const key = `${REDIS_KEYS.SEARCH_CACHE}${hash}`;
  const data = await getRedisClient().get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Health check for Redis
 * @returns {Promise<object>}
 */
async function healthCheck() {
  try {
    if (!redisClient) {
      return { status: 'unhealthy', message: 'Not connected' };
    }
    
    const pong = await redisClient.ping();
    return { status: 'healthy', message: pong };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

module.exports = {
  createRedisClient,
  connectRedis,
  getRedisClient,
  disconnectRedis,
  storeOTP,
  verifyOTP,
  storeRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  acquireLock,
  releaseLock,
  checkRateLimit,
  cacheSearchResults,
  getCachedSearchResults,
  healthCheck
};
