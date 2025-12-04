/**
 * Authentication middleware
 */

const { verifyToken } = require('../utils/jwt.utils');
const { isRefreshTokenValid } = require('@medassist/shared/database/redis');
const { AppError } = require('@medassist/shared/errors/AppError');
const { ROLES } = require('@medassist/shared/constants');

/**
 * Extract token from request
 * @param {Request} req - Express request
 * @returns {string|null} - Token or null
 */
function extractToken(req) {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookie
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  
  return null;
}

/**
 * Authenticate JWT token
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw AppError.unauthorized('No token provided');
    }
    
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'access') {
      throw AppError.tokenInvalid('Invalid token type');
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(AppError.tokenExpired());
    }
    if (error.name === 'JsonWebTokenError') {
      return next(AppError.tokenInvalid());
    }
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded.type === 'access') {
        req.user = decoded;
      }
    }
    
    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
}

/**
 * Require specific roles
 * @param {...string} roles - Required roles
 * @returns {Function} - Express middleware
 */
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    
    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return next(AppError.forbidden(`Required roles: ${roles.join(', ')}`));
    }
    
    next();
  };
}

/**
 * Require admin role
 */
const requireAdmin = requireRoles(ROLES.ADMIN);

/**
 * Require pharmacist role
 */
const requirePharmacist = requireRoles(ROLES.PHARMACIST);

/**
 * Require driver role
 */
const requireDriver = requireRoles(ROLES.DRIVER);

/**
 * Require user or admin role
 */
const requireUserOrAdmin = requireRoles(ROLES.USER, ROLES.ADMIN);

module.exports = {
  extractToken,
  authenticate,
  optionalAuth,
  requireRoles,
  requireAdmin,
  requirePharmacist,
  requireDriver,
  requireUserOrAdmin
};
