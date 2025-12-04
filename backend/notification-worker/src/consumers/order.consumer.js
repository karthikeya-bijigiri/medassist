/**
 * Order Consumer - Handles order-related messages
 */

const { consumeMessages } = require('@medassist/shared/messaging/rabbitmq');
const { QUEUES } = require('@medassist/shared/constants');
const notificationService = require('../services/notification.service');
const { createLogger } = require('@medassist/shared/logging/logger');
const mongoose = require('mongoose');

const logger = createLogger('order-consumer');

/**
 * Handle order created messages
 */
async function handleOrderCreated(message) {
  const { order_id, user_id, pharmacy_id, items, total } = message.payload;
  
  logger.info('Processing order.created', { order_id });
  
  try {
    const User = mongoose.model('User');
    const Pharmacy = mongoose.model('Pharmacy');
    
    const user = await User.findById(user_id);
    const pharmacy = await Pharmacy.findById(pharmacy_id);
    
    if (user && pharmacy) {
      // Send confirmation to user
      await notificationService.sendOrderConfirmation(
        { _id: order_id, total_amount: total },
        user
      );
      
      // Notify pharmacy
      await notificationService.notifyPharmacyNewOrder(
        { _id: order_id, total_amount: total },
        pharmacy
      );
    }
    
    logger.info('Order created notification sent', { order_id });
  } catch (error) {
    logger.error('Error processing order.created', { 
      order_id, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Handle order paid messages
 */
async function handleOrderPaid(message) {
  const { order_id, delivery_id, pharmacy_id } = message.payload;
  
  logger.info('Processing order.paid', { order_id, delivery_id });
  
  try {
    // In a real implementation, this would trigger delivery assignment
    logger.info('Order paid, delivery created', { order_id, delivery_id });
  } catch (error) {
    logger.error('Error processing order.paid', { 
      order_id, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Handle order cancelled messages
 */
async function handleOrderCancelled(message) {
  const { order_id, user_id, pharmacy_id } = message.payload;
  
  logger.info('Processing order.cancelled', { order_id });
  
  try {
    const User = mongoose.model('User');
    const user = await User.findById(user_id);
    
    if (user) {
      await notificationService.notifyOrderStatusChange(
        { _id: order_id },
        user,
        'cancelled'
      );
    }
    
    logger.info('Order cancelled notification sent', { order_id });
  } catch (error) {
    logger.error('Error processing order.cancelled', { 
      order_id, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Start consuming order messages
 */
async function startOrderConsumer() {
  await consumeMessages(QUEUES.ORDERS_CREATED, async (message) => {
    await handleOrderCreated(message);
  });
  
  await consumeMessages(QUEUES.ORDERS_PAID, async (message) => {
    await handleOrderPaid(message);
  });
  
  await consumeMessages(QUEUES.ORDERS_CANCELLED, async (message) => {
    await handleOrderCancelled(message);
  });
  
  logger.info('Order consumer started');
}

module.exports = {
  startOrderConsumer,
  handleOrderCreated,
  handleOrderPaid,
  handleOrderCancelled
};
