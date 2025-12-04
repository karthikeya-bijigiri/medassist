/**
 * Auth Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { loginRateLimiter, otpRateLimiter, registrationRateLimiter } = require('../middleware/rateLimit.middleware');
const { validateRegistration, validateLogin, validateOTPVerification, validateRefreshToken, validateCreatePharmacist, validateCreateDriver } = require('../validators/auth.validators');

// Public routes
router.post('/register', registrationRateLimiter, validateRegistration, authController.register);
router.post('/verify-otp', otpRateLimiter, validateOTPVerification, authController.verifyOtp);
router.post('/login', loginRateLimiter, validateLogin, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

// Admin routes
router.post('/admin/create-pharmacist', authenticate, requireAdmin, validateCreatePharmacist, authController.createPharmacist);
router.post('/admin/create-driver', authenticate, requireAdmin, validateCreateDriver, authController.createDriver);

module.exports = router;
