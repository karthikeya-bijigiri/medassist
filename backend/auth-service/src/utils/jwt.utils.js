/**
 * JWT utility functions
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Parse duration string to seconds
 * @param {string} duration - Duration string (e.g., '15m', '30d')
 * @returns {number} - Duration in seconds
 */
function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Generate access token
 * @param {object} user - User object
 * @returns {object} - Token and expiration info
 */
function generateAccessToken(user) {
  const jti = uuidv4();
  const expiresIn = parseDuration(config.jwt.accessTokenTTL);
  
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    roles: user.roles,
    jti,
    type: 'access'
  };
  
  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithm: 'HS256'
  });
  
  return {
    token,
    expiresIn,
    jti
  };
}

/**
 * Generate refresh token
 * @param {object} user - User object
 * @returns {object} - Token and expiration info
 */
function generateRefreshToken(user) {
  const jti = uuidv4();
  const expiresIn = parseDuration(config.jwt.refreshTokenTTL);
  
  const payload = {
    sub: user._id.toString(),
    jti,
    type: 'refresh'
  };
  
  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithm: 'HS256'
  });
  
  return {
    token,
    expiresIn,
    jti
  };
}

/**
 * Verify token
 * @param {string} token - JWT token
 * @returns {object} - Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithms: ['HS256']
  });
}

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Generate token pair (access + refresh)
 * @param {object} user - User object
 * @returns {object} - Both tokens with expiration info
 */
function generateTokenPair(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return {
    access_token: accessToken.token,
    refresh_token: refreshToken.token,
    expires_in: accessToken.expiresIn,
    token_type: 'Bearer',
    roles: user.roles,
    accessTokenJti: accessToken.jti,
    refreshTokenJti: refreshToken.jti
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  parseDuration
};
