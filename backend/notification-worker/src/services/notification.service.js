/**
 * Notification Service
 */

const { createLogger } = require('@medassist/shared/logging/logger');

const logger = createLogger('notification-service');

class NotificationService {
  /**
   * Send push notification
   */
  async sendPush(userId, title, body, data = {}) {
    // In production, integrate with FCM/APNs
    logger.info('Push notification sent', {
      user_id: userId,
      title,
      body
    });
    
    return { success: true, type: 'push' };
  }

  /**
   * Send SMS notification
   */
  async sendSMS(phone, message) {
    // In production, integrate with SMS provider (Twilio, etc.)
    logger.info('SMS notification sent', {
      phone: `***${phone.slice(-4)}`,
      message_length: message.length
    });
    
    return { success: true, type: 'sms' };
  }

  /**
   * Send email notification
   */
  async sendEmail(email, subject, body, html = null) {
    // In production, integrate with email provider (SendGrid, etc.)
    logger.info('Email notification sent', {
      email: `***@${email.split('@')[1]}`,
      subject
    });
    
    return { success: true, type: 'email' };
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(order, user) {
    const message = `Your order #${order._id} has been placed successfully. Total: ₹${order.total_amount}`;
    
    await this.sendPush(user._id, 'Order Confirmed', message);
    await this.sendSMS(user.phone, message);
    
    logger.info('Order confirmation sent', { order_id: order._id });
  }

  /**
   * Notify pharmacy about new order
   */
  async notifyPharmacyNewOrder(order, pharmacy) {
    const message = `New order #${order._id} received. Total: ₹${order.total_amount}`;
    
    logger.info('Pharmacy notified of new order', {
      order_id: order._id,
      pharmacy_id: pharmacy._id
    });
    
    return { success: true };
  }

  /**
   * Notify drivers about new delivery
   */
  async notifyDriversNewDelivery(delivery, drivers) {
    const message = `New delivery available for order #${delivery.order_id}`;
    
    for (const driver of drivers) {
      await this.sendPush(driver._id, 'New Delivery', message);
    }
    
    logger.info('Drivers notified of new delivery', {
      delivery_id: delivery._id,
      drivers_count: drivers.length
    });
  }

  /**
   * Notify user about order status change
   */
  async notifyOrderStatusChange(order, user, newStatus) {
    const statusMessages = {
      'accepted_by_pharmacy': 'Your order has been accepted by the pharmacy',
      'prepared': 'Your order is ready for pickup',
      'driver_assigned': 'A driver has been assigned to your order',
      'in_transit': 'Your order is on the way',
      'delivered': 'Your order has been delivered',
      'cancelled': 'Your order has been cancelled'
    };
    
    const message = statusMessages[newStatus] || `Order status updated to ${newStatus}`;
    
    await this.sendPush(user._id, 'Order Update', message);
    
    logger.info('Order status notification sent', {
      order_id: order._id,
      status: newStatus
    });
  }
}

module.exports = new NotificationService();
