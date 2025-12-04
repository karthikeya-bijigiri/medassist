/**
 * RabbitMQ messaging module for MedAssist services
 */

const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../logging/logger');
const { EXCHANGES, QUEUES } = require('../constants');

const logger = createLogger('rabbitmq');

let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ
 * @param {string} uri - RabbitMQ connection URI
 * @returns {Promise<amqp.Connection>}
 */
async function connectRabbitMQ(uri = process.env.RABBITMQ_URI) {
  try {
    connection = await amqp.connect(uri);
    
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

    logger.info('RabbitMQ connected successfully');
    return connection;
  } catch (error) {
    logger.error('RabbitMQ connection failed', { error: error.message });
    throw error;
  }
}

/**
 * Create a channel
 * @returns {Promise<amqp.Channel>}
 */
async function createChannel() {
  if (!connection) {
    throw new Error('RabbitMQ not connected. Call connectRabbitMQ first.');
  }

  channel = await connection.createChannel();
  
  channel.on('error', (err) => {
    logger.error('RabbitMQ channel error', { error: err.message });
  });

  channel.on('close', () => {
    logger.warn('RabbitMQ channel closed');
  });

  logger.info('RabbitMQ channel created');
  return channel;
}

/**
 * Get the current channel
 * @returns {amqp.Channel}
 */
function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel not created. Call createChannel first.');
  }
  return channel;
}

/**
 * Setup exchanges and queues
 * @param {amqp.Channel} ch - Channel to use
 */
async function setupExchangesAndQueues(ch = channel) {
  // Setup exchanges
  for (const [name, exchange] of Object.entries(EXCHANGES)) {
    await ch.assertExchange(exchange, 'topic', { durable: true });
    logger.info(`Exchange ${exchange} created`);
  }

  // Setup queues and bindings
  const queueBindings = {
    [QUEUES.ORDERS_CREATED]: { exchange: EXCHANGES.ORDERS, routingKey: 'created' },
    [QUEUES.ORDERS_PAID]: { exchange: EXCHANGES.ORDERS, routingKey: 'paid' },
    [QUEUES.ORDERS_CANCELLED]: { exchange: EXCHANGES.ORDERS, routingKey: 'cancelled' },
    [QUEUES.DELIVERIES_CREATED]: { exchange: EXCHANGES.DELIVERIES, routingKey: 'created' },
    [QUEUES.DELIVERIES_UPDATED]: { exchange: EXCHANGES.DELIVERIES, routingKey: 'updated' },
    [QUEUES.INVENTORY_UPDATED]: { exchange: EXCHANGES.INVENTORY, routingKey: 'updated' },
    [QUEUES.NOTIFICATIONS]: { exchange: EXCHANGES.NOTIFICATIONS, routingKey: '#' }
  };

  for (const [queueName, binding] of Object.entries(queueBindings)) {
    await ch.assertQueue(queueName, { durable: true });
    await ch.bindQueue(queueName, binding.exchange, binding.routingKey);
    logger.info(`Queue ${queueName} created and bound to ${binding.exchange}`);
  }
}

/**
 * Create a message with standard format
 * @param {string} type - Message type
 * @param {object} payload - Message payload
 * @param {object} meta - Additional metadata
 * @returns {object} - Formatted message
 */
function createMessage(type, payload, meta = {}) {
  return {
    message_id: uuidv4(),
    type,
    timestamp: new Date().toISOString(),
    retries: 0,
    payload,
    meta
  };
}

/**
 * Publish a message to an exchange
 * @param {string} exchange - Exchange name
 * @param {string} routingKey - Routing key
 * @param {object} message - Message to publish
 * @param {object} options - Publish options
 */
async function publishMessage(exchange, routingKey, message, options = {}) {
  const ch = getChannel();
  
  const defaultOptions = {
    persistent: true,
    messageId: message.message_id,
    timestamp: Date.now(),
    contentType: 'application/json'
  };

  const buffer = Buffer.from(JSON.stringify(message));
  
  ch.publish(exchange, routingKey, buffer, { ...defaultOptions, ...options });
  
  logger.info('Message published', {
    exchange,
    routingKey,
    message_id: message.message_id
  });
}

/**
 * Consume messages from a queue
 * @param {string} queueName - Queue name
 * @param {Function} handler - Message handler function
 * @param {object} options - Consumer options
 */
async function consumeMessages(queueName, handler, options = {}) {
  const ch = getChannel();
  
  const defaultOptions = {
    noAck: false
  };

  await ch.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString());
      
      logger.info('Message received', {
        queue: queueName,
        message_id: content.message_id
      });

      await handler(content, msg);
      ch.ack(msg);
      
      logger.info('Message processed', {
        queue: queueName,
        message_id: content.message_id
      });
    } catch (error) {
      logger.error('Message processing failed', {
        queue: queueName,
        error: error.message
      });

      // Requeue with limit
      const content = JSON.parse(msg.content.toString());
      if (content.retries < 3) {
        content.retries++;
        const buffer = Buffer.from(JSON.stringify(content));
        
        // Delay before requeue
        setTimeout(() => {
          ch.nack(msg, false, true);
        }, 1000 * content.retries);
      } else {
        // Move to dead letter queue or discard
        logger.warn('Message exceeded retry limit', {
          queue: queueName,
          message_id: content.message_id
        });
        ch.ack(msg);
      }
    }
  }, { ...defaultOptions, ...options });

  logger.info(`Consumer started for queue: ${queueName}`);
}

/**
 * Publish order created event
 * @param {object} order - Order data
 */
async function publishOrderCreated(order) {
  const message = createMessage('order.created', order);
  await publishMessage(EXCHANGES.ORDERS, 'created', message);
}

/**
 * Publish order paid event
 * @param {object} order - Order data
 */
async function publishOrderPaid(order) {
  const message = createMessage('order.paid', order);
  await publishMessage(EXCHANGES.ORDERS, 'paid', message);
}

/**
 * Publish order cancelled event
 * @param {object} order - Order data
 */
async function publishOrderCancelled(order) {
  const message = createMessage('order.cancelled', order);
  await publishMessage(EXCHANGES.ORDERS, 'cancelled', message);
}

/**
 * Publish delivery created event
 * @param {object} delivery - Delivery data
 */
async function publishDeliveryCreated(delivery) {
  const message = createMessage('delivery.created', delivery);
  await publishMessage(EXCHANGES.DELIVERIES, 'created', message);
}

/**
 * Publish delivery updated event
 * @param {object} delivery - Delivery data
 */
async function publishDeliveryUpdated(delivery) {
  const message = createMessage('delivery.updated', delivery);
  await publishMessage(EXCHANGES.DELIVERIES, 'updated', message);
}

/**
 * Publish inventory updated event
 * @param {object} inventory - Inventory data
 */
async function publishInventoryUpdated(inventory) {
  const message = createMessage('inventory.updated', inventory);
  await publishMessage(EXCHANGES.INVENTORY, 'updated', message);
}

/**
 * Disconnect from RabbitMQ
 */
async function disconnectRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('RabbitMQ disconnected');
  } catch (error) {
    logger.error('RabbitMQ disconnect error', { error: error.message });
    throw error;
  }
}

/**
 * Health check for RabbitMQ
 * @returns {Promise<object>}
 */
async function healthCheck() {
  try {
    if (!connection) {
      return { status: 'unhealthy', message: 'Not connected' };
    }
    
    // Check if connection is still open
    if (!connection.connection) {
      return { status: 'unhealthy', message: 'Connection closed' };
    }
    
    return { status: 'healthy', message: 'Connected' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

module.exports = {
  connectRabbitMQ,
  createChannel,
  getChannel,
  setupExchangesAndQueues,
  createMessage,
  publishMessage,
  consumeMessages,
  publishOrderCreated,
  publishOrderPaid,
  publishOrderCancelled,
  publishDeliveryCreated,
  publishDeliveryUpdated,
  publishInventoryUpdated,
  disconnectRabbitMQ,
  healthCheck
};
