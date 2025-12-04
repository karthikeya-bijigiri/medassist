/**
 * Inventory Consumer - Handles inventory-related messages
 */

const { consumeMessages } = require('@medassist/shared/messaging/rabbitmq');
const { QUEUES } = require('@medassist/shared/constants');
const stockService = require('../services/stock.service');
const { createLogger } = require('@medassist/shared/logging/logger');

const logger = createLogger('inventory-consumer');

/**
 * Handle inventory updated messages
 */
async function handleInventoryUpdated(message) {
  const { pharmacy_id, medicine_id } = message.payload;
  
  logger.info('Processing inventory.updated', { pharmacy_id, medicine_id });
  
  try {
    // Process the inventory update
    await stockService.processInventoryUpdate({ pharmacy_id, medicine_id });
    
    // In a real implementation, this would trigger ES reindexing
    logger.info('Inventory update processed', { pharmacy_id, medicine_id });
  } catch (error) {
    logger.error('Error processing inventory.updated', { 
      pharmacy_id, 
      medicine_id,
      error: error.message 
    });
    throw error;
  }
}

/**
 * Start consuming inventory messages
 */
async function startInventoryConsumer() {
  await consumeMessages(QUEUES.INVENTORY_UPDATED, async (message) => {
    await handleInventoryUpdated(message);
  });
  
  logger.info('Inventory consumer started');
}

module.exports = {
  startInventoryConsumer,
  handleInventoryUpdated
};
