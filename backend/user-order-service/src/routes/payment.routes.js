/**
 * Payment Routes
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Webhook endpoint (typically called by payment provider)
router.post('/webhook', paymentController.paymentWebhook);

// Simulate payment (development only)
router.post('/simulate', authenticate, paymentController.simulatePayment);

module.exports = router;
