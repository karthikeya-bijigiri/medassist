/**
 * Order Service
 */

const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const Pharmacy = require('../models/Pharmacy');
const inventoryService = require('./inventory.service');
const { publishOrderCreated, publishOrderPaid, publishOrderCancelled } = require('@medassist/shared/messaging/rabbitmq');
const { incrementOrdersCreated, incrementOrdersFailed } = require('@medassist/shared/metrics/prometheus');
const { AppError } = require('@medassist/shared/errors/AppError');
const { ORDER_STATUS, PAYMENT_STATUS } = require('@medassist/shared/constants');
const { generateOTP } = require('../../src/utils/otp.utils');

// OTP utility for delivery
function generateDeliveryOTP() {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

class OrderService {
  /**
   * Create a new order
   * @param {string} userId - User ID
   * @param {object} orderData - Order data
   * @param {string} idempotencyKey - Idempotency key for duplicate prevention
   * @returns {Promise<object>} - Created order
   */
  async createOrder(userId, orderData, idempotencyKey) {
    // Check for existing order with same idempotency key
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotency_key: idempotencyKey });
      if (existingOrder) {
        return existingOrder;
      }
    }
    
    const { items, shipping_address } = orderData;
    
    // Group items by pharmacy
    const pharmacyGroups = {};
    for (const item of items) {
      const pharmacyId = item.pharmacy_id;
      if (!pharmacyGroups[pharmacyId]) {
        pharmacyGroups[pharmacyId] = [];
      }
      pharmacyGroups[pharmacyId].push(item);
    }
    
    // For now, we only support single pharmacy orders
    const pharmacyIds = Object.keys(pharmacyGroups);
    if (pharmacyIds.length > 1) {
      throw AppError.badRequest('Orders must be from a single pharmacy');
    }
    
    const pharmacyId = pharmacyIds[0];
    const pharmacyItems = pharmacyGroups[pharmacyId];
    
    // Verify pharmacy exists and is active
    const pharmacy = await Pharmacy.findOne({ _id: pharmacyId, is_active: true });
    if (!pharmacy) {
      throw AppError.badRequest('Pharmacy not found or is inactive');
    }
    
    try {
      // Reserve inventory
      const reservedItems = await inventoryService.reserveInventory(pharmacyItems);
      
      // Calculate total
      const total = reservedItems.reduce((sum, item) => {
        return sum + (item.price * item.qty) + item.tax;
      }, 0);
      
      // Generate delivery OTP
      const deliveryOTP = generateDeliveryOTP();
      
      // Create order
      const order = await Order.create({
        user_id: userId,
        pharmacy_id: pharmacyId,
        items: reservedItems.map(item => ({
          medicine_id: item.medicine_id,
          batch_no: item.batch_no,
          qty: item.qty,
          price: item.price,
          tax: item.tax
        })),
        total_amount: total,
        status: ORDER_STATUS.CREATED,
        payment_status: PAYMENT_STATUS.PENDING,
        shipping_address,
        idempotency_key: idempotencyKey,
        otp_for_delivery: deliveryOTP
      });
      
      incrementOrdersCreated();
      
      // Publish order created event
      try {
        await publishOrderCreated({
          order_id: order._id,
          user_id: userId,
          pharmacy_id: pharmacyId,
          items: order.items,
          total: total
        });
      } catch (error) {
        console.error('Failed to publish order created event:', error.message);
      }
      
      return order;
    } catch (error) {
      incrementOrdersFailed();
      throw error;
    }
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID for authorization
   * @param {Array} userRoles - User roles
   * @returns {Promise<object>} - Order
   */
  async getOrder(orderId, userId, userRoles) {
    const order = await Order.findById(orderId)
      .populate('pharmacy_id', 'name address contact_phone')
      .populate('items.medicine_id', 'name brand');
    
    if (!order) {
      throw AppError.orderNotFound();
    }
    
    // Authorization check
    const isOwner = order.user_id.toString() === userId;
    const isAdmin = userRoles.includes('admin');
    const isPharmacist = userRoles.includes('pharmacist');
    const isDriver = userRoles.includes('driver');
    
    if (!isOwner && !isAdmin && !isPharmacist && !isDriver) {
      throw AppError.forbidden('Not authorized to view this order');
    }
    
    return order;
  }

  /**
   * Get user's orders
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<object>} - Orders with pagination
   */
  async getUserOrders(userId, options = {}) {
    const { page = 1, size = 20, status } = options;
    
    const query = { user_id: userId };
    if (status) {
      query.status = status;
    }
    
    const orders = await Order.find(query)
      .populate('pharmacy_id', 'name')
      .skip((page - 1) * size)
      .limit(size)
      .sort({ created_at: -1 });
    
    const total = await Order.countDocuments(query);
    
    return {
      orders,
      pagination: {
        page,
        size,
        total,
        pages: Math.ceil(total / size)
      }
    };
  }

  /**
   * Cancel an order
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Cancelled order
   */
  async cancelOrder(orderId, userId) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw AppError.orderNotFound();
    }
    
    if (order.user_id.toString() !== userId) {
      throw AppError.forbidden('Not authorized to cancel this order');
    }
    
    // Can only cancel before dispatch
    const cancellableStatuses = [
      ORDER_STATUS.CREATED,
      ORDER_STATUS.ACCEPTED_BY_PHARMACY,
      ORDER_STATUS.PREPARED
    ];
    
    if (!cancellableStatuses.includes(order.status)) {
      throw AppError.orderCannotCancel('Order cannot be cancelled at this stage');
    }
    
    // Release reserved inventory
    await inventoryService.releaseReservedInventory(
      order.items.map(item => ({
        pharmacy_id: order.pharmacy_id,
        medicine_id: item.medicine_id,
        batch_no: item.batch_no,
        qty: item.qty
      }))
    );
    
    // Update order status
    order.status = ORDER_STATUS.CANCELLED;
    order.updated_at = new Date();
    await order.save();
    
    // Publish cancellation event
    try {
      await publishOrderCancelled({
        order_id: order._id,
        user_id: userId,
        pharmacy_id: order.pharmacy_id
      });
    } catch (error) {
      console.error('Failed to publish order cancelled event:', error.message);
    }
    
    return order;
  }

  /**
   * Rate a pharmacy after delivery
   * @param {string} orderId - Order ID
   * @param {string} userId - User ID
   * @param {number} rating - Rating (1-5)
   * @param {string} review - Optional review
   * @returns {Promise<object>} - Updated order
   */
  async ratePharmacy(orderId, userId, rating, review) {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw AppError.orderNotFound();
    }
    
    if (order.user_id.toString() !== userId) {
      throw AppError.forbidden('Not authorized to rate this order');
    }
    
    if (order.status !== ORDER_STATUS.DELIVERED) {
      throw AppError.badRequest('Can only rate delivered orders');
    }
    
    // Update pharmacy rating
    const pharmacy = await Pharmacy.findById(order.pharmacy_id);
    if (pharmacy) {
      const newCount = pharmacy.rating_count + 1;
      const newRating = ((pharmacy.rating * pharmacy.rating_count) + rating) / newCount;
      
      pharmacy.rating = Math.round(newRating * 10) / 10;
      pharmacy.rating_count = newCount;
      await pharmacy.save();
    }
    
    return { message: 'Rating submitted successfully' };
  }

  /**
   * Process payment webhook
   * @param {object} paymentData - Payment data
   * @returns {Promise<object>} - Updated order
   */
  async processPaymentWebhook(paymentData) {
    const { order_id, payment_status, transaction_id } = paymentData;
    
    const order = await Order.findById(order_id);
    if (!order) {
      throw AppError.orderNotFound();
    }
    
    order.payment_status = payment_status;
    order.updated_at = new Date();
    await order.save();
    
    if (payment_status === PAYMENT_STATUS.PAID) {
      // Create delivery job
      const delivery = await Delivery.create({
        order_id: order._id,
        status: 'assigned',
        assigned_at: new Date()
      });
      
      order.delivery_id = delivery._id;
      await order.save();
      
      // Publish order paid event
      try {
        await publishOrderPaid({
          order_id: order._id,
          delivery_id: delivery._id,
          pharmacy_id: order.pharmacy_id,
          total: order.total_amount
        });
      } catch (error) {
        console.error('Failed to publish order paid event:', error.message);
      }
    }
    
    return order;
  }
}

module.exports = new OrderService();
