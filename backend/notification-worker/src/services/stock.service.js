/**
 * Stock Service
 */

const { createLogger } = require('@medassist/shared/logging/logger');
const mongoose = require('mongoose');

const logger = createLogger('stock-service');

class StockService {
  /**
   * Check for low stock and trigger alerts
   */
  async checkLowStock(pharmacyId) {
    const Inventory = mongoose.model('Inventory');
    
    const lowStockItems = await Inventory.find({
      pharmacy_id: pharmacyId,
      quantity_available: { $lte: 10 }, // Low stock threshold
      expiry_date: { $gt: new Date() }
    }).populate('medicine_id', 'name');
    
    if (lowStockItems.length > 0) {
      logger.warn('Low stock detected', {
        pharmacy_id: pharmacyId,
        items_count: lowStockItems.length
      });
    }
    
    return lowStockItems;
  }

  /**
   * Check for expiring items
   */
  async checkExpiringItems(pharmacyId) {
    const Inventory = mongoose.model('Inventory');
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringItems = await Inventory.find({
      pharmacy_id: pharmacyId,
      expiry_date: { 
        $gt: new Date(),
        $lte: thirtyDaysFromNow 
      },
      quantity_available: { $gt: 0 }
    }).populate('medicine_id', 'name');
    
    if (expiringItems.length > 0) {
      logger.warn('Expiring items detected', {
        pharmacy_id: pharmacyId,
        items_count: expiringItems.length
      });
    }
    
    return expiringItems;
  }

  /**
   * Process inventory update
   */
  async processInventoryUpdate(data) {
    const { pharmacy_id, medicine_id } = data;
    
    logger.info('Processing inventory update', { pharmacy_id, medicine_id });
    
    // Check for low stock after update
    await this.checkLowStock(pharmacy_id);
    
    return { success: true };
  }
}

module.exports = new StockService();
