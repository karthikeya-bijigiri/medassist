/**
 * Order validators
 */

const { validate, formatErrors } = require('@medassist/shared/validation/schemas');
const { AppError } = require('@medassist/shared/errors/AppError');

/**
 * Validation middleware factory
 */
function validateRequest(schemaName) {
  return (req, res, next) => {
    const result = validate(schemaName, req.body);
    
    if (!result.valid) {
      const message = formatErrors(result.errors);
      return next(AppError.validationError(message, result.errors));
    }
    
    next();
  };
}

const validateCreateOrder = validateRequest('createOrder');
const validateCartUpdate = validateRequest('cartUpdate');
const validateRating = validateRequest('rating');
const validateProfileUpdate = validateRequest('profileUpdate');

/**
 * Validate idempotency key header
 */
function validateIdempotencyKey(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (idempotencyKey && idempotencyKey.length > 100) {
    return next(AppError.badRequest('Idempotency-Key header too long'));
  }
  
  req.idempotencyKey = idempotencyKey;
  next();
}

module.exports = {
  validateRequest,
  validateCreateOrder,
  validateCartUpdate,
  validateRating,
  validateProfileUpdate,
  validateIdempotencyKey
};
