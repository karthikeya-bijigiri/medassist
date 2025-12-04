/**
 * OTP utility functions
 */

const crypto = require('crypto');
const config = require('../config');

/**
 * Generate a random OTP
 * @param {number} length - OTP length (default: 6)
 * @returns {string} - Generated OTP
 */
function generateOTP(length = config.otp.length) {
  // Generate cryptographically secure random digits
  const digits = '0123456789';
  let otp = '';
  
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  
  return otp;
}

/**
 * Generate OTP for phone verification
 * @param {string} phone - Phone number
 * @returns {object} - OTP and metadata
 */
function createPhoneOTP(phone) {
  const otp = generateOTP();
  const expiresAt = Date.now() + (config.otp.ttlSeconds * 1000);
  
  return {
    phone,
    otp,
    expiresAt,
    createdAt: Date.now()
  };
}

/**
 * Generate OTP for delivery confirmation
 * @returns {string} - 6-digit OTP
 */
function generateDeliveryOTP() {
  return generateOTP(6);
}

/**
 * Mask phone number for display
 * @param {string} phone - Phone number
 * @returns {string} - Masked phone number
 */
function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return `***${phone.slice(-4)}`;
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} - Is valid
 */
function isValidPhone(phone) {
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Normalize phone number
 * @param {string} phone - Phone number
 * @returns {string} - Normalized phone number
 */
function normalizePhone(phone) {
  // Remove spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-()]/g, '');
  
  // Add + prefix if not present and starts with country code
  if (!normalized.startsWith('+') && normalized.length > 10) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

module.exports = {
  generateOTP,
  createPhoneOTP,
  generateDeliveryOTP,
  maskPhone,
  isValidPhone,
  normalizePhone
};
