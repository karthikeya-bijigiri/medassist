/**
 * Auth validators using Ajv
 */

const { validate, formatErrors } = require('@medassist/shared/validation/schemas');
const { AppError } = require('@medassist/shared/errors/AppError');

/**
 * Validation middleware factory
 * @param {string} schemaName - Name of the schema to validate against
 * @returns {Function} - Express middleware
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

/**
 * Validate registration request
 */
const validateRegistration = validateRequest('userRegistration');

/**
 * Validate login request
 */
const validateLogin = validateRequest('login');

/**
 * Validate OTP verification request
 */
const validateOTPVerification = validateRequest('otpVerification');

/**
 * Validate refresh token request
 */
const validateRefreshToken = validateRequest('refreshToken');

/**
 * Validate create pharmacist request
 */
const validateCreatePharmacist = validateRequest('createPharmacist');

/**
 * Validate create driver request
 */
const validateCreateDriver = validateRequest('createDriver');

module.exports = {
  validateRequest,
  validateRegistration,
  validateLogin,
  validateOTPVerification,
  validateRefreshToken,
  validateCreatePharmacist,
  validateCreateDriver
};
