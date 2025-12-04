/**
 * Delivery Consumer - Handles delivery-related messages
 */

const { consumeMessages } = require('@medassist/shared/messaging/rabbitmq');
const { QUEUES } = require('@medassist/shared/constants');
const notificationService = require('../services/notification.service');
const { createLogger } = require('@medassist/shared/logging/logger');
const mongoose = require('mongoose');

const logger = createLogger('delivery-consumer');

/**
 * Handle delivery created messages
 */
async function handleDeliveryCreated(message) {
  const { delivery_id, order_id, pharmacy_id } = message.payload;
  
  logger.info('Processing delivery.created', { delivery_id, order_id });
  
  try {
    const User = mongoose.model('User');
    
    // Find available drivers in the area
    const drivers = await User.find({
      roles: 'driver',
      is_verified: true
    }).limit(10);
    
    if (drivers.length > 0) {
      await notificationService.notifyDriversNewDelivery(
        { _id: delivery_id, order_id },
        drivers
      );
    }
    
    logger.info('Delivery notification sent to drivers', { 
      delivery_id, 
      drivers_count: drivers.length 
    });
  } catch (error) {
    logger.error('Error processing delivery.created', { 
      delivery_id, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Handle delivery updated messages
 */
async function handleDeliveryUpdated(message) {
  const { delivery_id, order_id, status, user_id } = message.payload;
  
  logger.info('Processing delivery.updated', { delivery_id, status });
  
  try {
    const User = mongoose.model('User');
    const user = await User.findById(user_id);
    
    if (user) {
      await notificationService.notifyOrderStatusChange(
        { _id: order_id },
        user,
        status
      );
    }
    
    logger.info('Delivery update notification sent', { delivery_id, status });
  } catch (error) {
    logger.error('Error processing delivery.updated', { 
      delivery_id, 
      error: error.message 
    });
    throw error;
  }
}

/**
 * Start consuming delivery messages
 */
async function startDeliveryConsumer() {
  await consumeMessages(QUEUES.DELIVERIES_CREATED, async (message) => {
    await handleDeliveryCreated(message);
  });
  
  await consumeMessages(QUEUES.DELIVERIES_UPDATED, async (message) => {
    await handleDeliveryUpdated(message);
  });
  
  logger.info('Delivery consumer started');
}

module.exports = {
  startDeliveryConsumer,
  handleDeliveryCreated,
  handleDeliveryUpdated
};
