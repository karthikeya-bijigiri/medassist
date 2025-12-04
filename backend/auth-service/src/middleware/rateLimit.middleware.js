/**
 * Rate limiting middleware using Redis
 */

const { checkRateLimit } = require('@medassist/shared/database/redis');
const { AppError } = require('@medassist/shared/errors/AppError');
const config = require('../config');

/**
 * Rate limiter middleware factory
 * @param {object} options - Rate limit options
 * @returns {Function} - Express middleware
 */
function rateLimiter(options = {}) {
  const {
    maxRequests = config.rateLimit.maxRequests,
    windowSeconds = Math.floor(config.rateLimit.windowMs / 1000),
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later'
  } = options;

  return async (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const endpoint = req.path;
      const identifier = `${key}:${endpoint}`;
      
      const result = await checkRateLimit(identifier, maxRequests, windowSeconds);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);
      
      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
        return next(AppError.tooManyRequests(message));
      }
      
      next();
    } catch (error) {
      // If Redis fails, allow the request but log the error
      const logger = req.app.get('logger');
      if (logger) {
        logger.error('Rate limit check failed', { error: error.message });
      }
      next();
    }
  };
}

/**
 * Rate limiter for login attempts
 */
const loginRateLimiter = rateLimiter({
  maxRequests: 5,
  windowSeconds: 60,
  keyGenerator: (req) => `${req.ip}:login`,
  message: 'Too many login attempts. Please try again in a minute.'
});

/**
 * Rate limiter for OTP requests
 */
const otpRateLimiter = rateLimiter({
  maxRequests: 3,
  windowSeconds: 60,
  keyGenerator: (req) => `${req.ip}:otp`,
  message: 'Too many OTP requests. Please try again in a minute.'
});

/**
 * Rate limiter for registration
 */
const registrationRateLimiter = rateLimiter({
  maxRequests: 5,
  windowSeconds: 300, // 5 minutes
  keyGenerator: (req) => `${req.ip}:register`,
  message: 'Too many registration attempts. Please try again later.'
});

/**
 * General API rate limiter
 */
const apiRateLimiter = rateLimiter({
  maxRequests: config.rateLimit.maxRequests,
  windowSeconds: Math.floor(config.rateLimit.windowMs / 1000)
});

module.exports = {
  rateLimiter,
  loginRateLimiter,
  otpRateLimiter,
  registrationRateLimiter,
  apiRateLimiter
};
