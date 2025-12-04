/**
 * Authentication middleware for User & Order Service
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('@medassist/shared/errors/AppError');
const { ROLES } = require('@medassist/shared/constants');

/**
 * Extract token from request
 * @param {Request} req - Express request
 * @returns {string|null} - Token or null
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  
  return null;
}

/**
 * Authenticate JWT token
 */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw AppError.unauthorized('No token provided');
    }
    
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: ['HS256']
    });
    
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
 * Optional authentication
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithms: ['HS256']
      });
      if (decoded.type === 'access') {
        req.user = decoded;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
}

/**
 * Require specific roles
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

const requireAdmin = requireRoles(ROLES.ADMIN);
const requirePharmacist = requireRoles(ROLES.PHARMACIST);
const requireDriver = requireRoles(ROLES.DRIVER);

module.exports = {
  extractToken,
  authenticate,
  optionalAuth,
  requireRoles,
  requireAdmin,
  requirePharmacist,
  requireDriver
};
