/**
 * Custom application error class for MedAssist services
 */

const { HTTP_STATUS, ERROR_CODES } = require('../constants');

class AppError extends Error {
  /**
   * Create an AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application error code
   * @param {any} details - Additional error details
   */
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_ERROR, errorCode = ERROR_CODES.INTERNAL_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   * @returns {object} - Error response object
   */
  toJSON() {
    const response = {
      error_code: this.errorCode,
      message: this.message
    };
    
    if (this.details) {
      response.details = this.details;
    }
    
    return response;
  }

  // Static factory methods for common errors

  static badRequest(message, details = null) {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.ORDER_NOT_FOUND);
  }

  static conflict(message, errorCode = ERROR_CODES.IDEMPOTENCY_CONFLICT, details = null) {
    return new AppError(message, HTTP_STATUS.CONFLICT, errorCode, details);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMITED);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.INTERNAL_ERROR);
  }

  static validationError(message, details = null) {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static invalidCredentials(message = 'Invalid credentials') {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
  }

  static tokenExpired(message = 'Token has expired') {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED);
  }

  static tokenInvalid(message = 'Invalid token') {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }

  static userExists(message = 'User already exists') {
    return new AppError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.USER_EXISTS);
  }

  static userNotFound(message = 'User not found') {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND);
  }

  static otpInvalid(message = 'Invalid OTP') {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_INVALID);
  }

  static otpExpired(message = 'OTP has expired') {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_EXPIRED);
  }

  static insufficientStock(message = 'Insufficient stock') {
    return new AppError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.INSUFFICIENT_STOCK);
  }

  static inventoryLocked(message = 'Inventory is currently locked') {
    return new AppError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.INVENTORY_LOCKED);
  }

  static orderNotFound(message = 'Order not found') {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.ORDER_NOT_FOUND);
  }

  static orderCannotCancel(message = 'Order cannot be cancelled') {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.ORDER_CANNOT_CANCEL);
  }

  static deliveryNotFound(message = 'Delivery not found') {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.DELIVERY_NOT_FOUND);
  }

  static databaseError(message = 'Database operation failed') {
    return new AppError(message, HTTP_STATUS.INTERNAL_ERROR, ERROR_CODES.DATABASE_ERROR);
  }
}

/**
 * Express error handling middleware
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
function errorHandler(err, req, res, next) {
  // Log error
  const logger = req.app.get('logger');
  if (logger) {
    logger.error('Error occurred', {
      error: err.message,
      stack: err.stack,
      request_id: req.requestId,
      route: req.originalUrl,
      method: req.method
    });
  }

  // Handle AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error_code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error_code: ERROR_CODES.VALIDATION_ERROR,
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  // Handle duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(HTTP_STATUS.CONFLICT).json({
      error_code: ERROR_CODES.USER_EXISTS,
      message: `${field} already exists`
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error_code: ERROR_CODES.TOKEN_INVALID,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error_code: ERROR_CODES.TOKEN_EXPIRED,
      message: 'Token has expired'
    });
  }

  // Default error response
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_ERROR;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred' 
    : err.message;

  res.status(statusCode).json({
    error_code: ERROR_CODES.INTERNAL_ERROR,
    message
  });
}

/**
 * Async handler wrapper to catch async errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  errorHandler,
  asyncHandler
};
