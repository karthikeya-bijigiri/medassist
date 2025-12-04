/**
 * Orders Routes
 */

const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateCreateOrder, validateRating, validateIdempotencyKey } = require('../validators/order.validators');

router.post('/', authenticate, validateIdempotencyKey, validateCreateOrder, ordersController.createOrder);
router.get('/', authenticate, ordersController.getUserOrders);
router.get('/:id', authenticate, ordersController.getOrder);
router.post('/:id/cancel', authenticate, ordersController.cancelOrder);
router.post('/:id/rate', authenticate, validateRating, ordersController.rateOrder);

module.exports = router;
