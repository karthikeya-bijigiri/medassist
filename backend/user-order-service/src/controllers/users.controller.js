/**
 * Users Controller
 */

const User = require('../models/User');
const { asyncHandler } = require('@medassist/shared/errors/AppError');

/**
 * Get user profile
 * GET /api/v1/users/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).select('-password_hash');

  if (!user) {
    return res.status(404).json({
      error_code: 'NOT_FOUND',
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * Update user profile
 * PUT /api/v1/users/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, addresses } = req.body;
  
  const updateData = {};
  if (name) updateData.name = name;
  if (addresses) updateData.addresses = addresses;

  const user = await User.findByIdAndUpdate(
    req.user.sub,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password_hash');

  if (!user) {
    return res.status(404).json({
      error_code: 'NOT_FOUND',
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * Update user cart
 * PUT /api/v1/users/cart
 */
const updateCart = asyncHandler(async (req, res) => {
  const { cart } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.sub,
    { $set: { cart } },
    { new: true, runValidators: true }
  ).select('cart');

  if (!user) {
    return res.status(404).json({
      error_code: 'NOT_FOUND',
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { cart: user.cart }
  });
});

/**
 * Get user cart
 * GET /api/v1/users/cart
 */
const getCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub)
    .select('cart')
    .populate('cart.medicine_id', 'name brand prescription_required')
    .populate('cart.pharmacy_id', 'name');

  if (!user) {
    return res.status(404).json({
      error_code: 'NOT_FOUND',
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { cart: user.cart }
  });
});

module.exports = {
  getProfile,
  updateProfile,
  updateCart,
  getCart
};
