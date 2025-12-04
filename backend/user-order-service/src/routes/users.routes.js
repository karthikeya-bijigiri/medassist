/**
 * Users Routes
 */

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateProfileUpdate, validateCartUpdate } = require('../validators/order.validators');

router.get('/profile', authenticate, usersController.getProfile);
router.put('/profile', authenticate, validateProfileUpdate, usersController.updateProfile);
router.get('/cart', authenticate, usersController.getCart);
router.put('/cart', authenticate, validateCartUpdate, usersController.updateCart);

module.exports = router;
