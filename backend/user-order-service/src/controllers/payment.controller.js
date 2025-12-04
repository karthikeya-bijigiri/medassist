/**
 * Payment Controller
 */

const orderService = require('../services/order.service');
const { asyncHandler } = require('@medassist/shared/errors/AppError');

/**
 * Payment webhook (simulated)
 * POST /api/v1/payment/webhook
 */
const paymentWebhook = asyncHandler(async (req, res) => {
  const { order_id, payment_status, transaction_id, amount } = req.body;

  // Validate webhook payload
  if (!order_id || !payment_status) {
    return res.status(400).json({
      error_code: 'VALIDATION_ERROR',
      message: 'Missing required fields: order_id, payment_status'
    });
  }

  // Process payment
  const order = await orderService.processPaymentWebhook({
    order_id,
    payment_status,
    transaction_id
  });

  res.json({
    success: true,
    data: {
      order_id: order._id,
      status: order.status,
      payment_status: order.payment_status
    }
  });
});

/**
 * Simulate payment (for development/testing)
 * POST /api/v1/payment/simulate
 */
const simulatePayment = asyncHandler(async (req, res) => {
  const { order_id } = req.body;

  // Simulate successful payment
  const order = await orderService.processPaymentWebhook({
    order_id,
    payment_status: 'paid',
    transaction_id: `TXN_${Date.now()}`
  });

  res.json({
    success: true,
    data: {
      order_id: order._id,
      status: order.status,
      payment_status: order.payment_status,
      message: 'Payment simulated successfully'
    }
  });
});

module.exports = {
  paymentWebhook,
  simulatePayment
};
