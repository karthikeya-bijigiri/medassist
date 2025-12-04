/**
 * Orders Controller
 */

const orderService = require('../services/order.service');
const { asyncHandler } = require('@medassist/shared/errors/AppError');
const { HTTP_STATUS } = require('@medassist/shared/constants');

/**
 * Create order
 * POST /api/v1/orders
 */
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(
    req.user.sub,
    req.body,
    req.idempotencyKey
  );

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: { order }
  });
});

/**
 * Get order by ID
 * GET /api/v1/orders/:id
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(
    req.params.id,
    req.user.sub,
    req.user.roles
  );

  res.json({
    success: true,
    data: { order }
  });
});

/**
 * Get user's orders
 * GET /api/v1/orders
 */
const getUserOrders = asyncHandler(async (req, res) => {
  const { page, size, status } = req.query;
  
  const result = await orderService.getUserOrders(req.user.sub, {
    page: parseInt(page, 10) || 1,
    size: parseInt(size, 10) || 20,
    status
  });

  res.json({
    success: true,
    data: result
  });
});

/**
 * Cancel order
 * POST /api/v1/orders/:id/cancel
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user.sub);

  res.json({
    success: true,
    data: { order },
    message: 'Order cancelled successfully'
  });
});

/**
 * Rate pharmacy
 * POST /api/v1/orders/:id/rate
 */
const rateOrder = asyncHandler(async (req, res) => {
  const { rating, review } = req.body;
  
  const result = await orderService.ratePharmacy(
    req.params.id,
    req.user.sub,
    rating,
    review
  );

  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  createOrder,
  getOrder,
  getUserOrders,
  cancelOrder,
  rateOrder
};
