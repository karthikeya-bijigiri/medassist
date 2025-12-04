/**
 * Inventory Service
 */

const Inventory = require('../models/Inventory');
const Medicine = require('../models/Medicine');
const Pharmacy = require('../models/Pharmacy');
const { acquireLock, releaseLock } = require('@medassist/shared/database/redis');
const { publishInventoryUpdated } = require('@medassist/shared/messaging/rabbitmq');
const { incrementInventoryReserved } = require('@medassist/shared/metrics/prometheus');
const { AppError } = require('@medassist/shared/errors/AppError');
const config = require('../config');

class InventoryService {
  /**
   * Get inventory for a pharmacy
   * @param {string} pharmacyId - Pharmacy ID
   * @param {object} options - Query options
   * @returns {Promise<Array>} - Inventory items
   */
  async getPharmacyInventory(pharmacyId, options = {}) {
    const { page = 1, size = 20, includeExpired = false } = options;
    
    const query = { pharmacy_id: pharmacyId };
    
    if (!includeExpired) {
      query.expiry_date = { $gt: new Date() };
    }
    
    const inventory = await Inventory.find(query)
      .populate('medicine_id', 'name brand generic_name dosage_form strength prescription_required')
      .skip((page - 1) * size)
      .limit(size)
      .sort({ created_at: -1 });
    
    const total = await Inventory.countDocuments(query);
    
    return {
      items: inventory,
      pagination: {
        page,
        size,
        total,
        pages: Math.ceil(total / size)
      }
    };
  }

  /**
   * Reserve inventory for an order
   * @param {Array} items - Order items [{medicine_id, pharmacy_id, qty}]
   * @returns {Promise<object>} - Reserved items with prices
   */
  async reserveInventory(items) {
    const reservations = [];
    const lockedInventory = [];
    
    try {
      for (const item of items) {
        const lockId = `${item.pharmacy_id}_${item.medicine_id}`;
        
        // Acquire lock
        const locked = await acquireLock(lockId, config.inventoryLockTTL);
        if (!locked) {
          throw AppError.inventoryLocked('Unable to reserve inventory. Please try again.');
        }
        
        lockedInventory.push(lockId);
        
        // Find available inventory (FIFO by expiry date)
        const inventory = await Inventory.findOne({
          pharmacy_id: item.pharmacy_id,
          medicine_id: item.medicine_id,
          quantity_available: { $gte: item.qty },
          expiry_date: { $gt: new Date() }
        }).sort({ expiry_date: 1 });
        
        if (!inventory) {
          throw AppError.insufficientStock(
            `Insufficient stock for medicine ${item.medicine_id}`
          );
        }
        
        // Reserve inventory atomically
        const result = await Inventory.findOneAndUpdate(
          {
            _id: inventory._id,
            quantity_available: { $gte: item.qty }
          },
          {
            $inc: {
              quantity_available: -item.qty,
              reserved_qty: item.qty
            }
          },
          { new: true }
        );
        
        if (!result) {
          throw AppError.insufficientStock(
            `Stock was modified. Please try again.`
          );
        }
        
        incrementInventoryReserved();
        
        reservations.push({
          inventory_id: inventory._id,
          medicine_id: item.medicine_id,
          pharmacy_id: item.pharmacy_id,
          batch_no: inventory.batch_no,
          qty: item.qty,
          price: inventory.selling_price,
          tax: inventory.selling_price * 0.18 // 18% GST
        });
      }
      
      return reservations;
    } finally {
      // Release all locks
      for (const lockId of lockedInventory) {
        await releaseLock(lockId);
      }
    }
  }

  /**
   * Release reserved inventory (for order cancellation)
   * @param {Array} items - Reserved items to release
   */
  async releaseReservedInventory(items) {
    for (const item of items) {
      await Inventory.findOneAndUpdate(
        {
          pharmacy_id: item.pharmacy_id,
          medicine_id: item.medicine_id,
          batch_no: item.batch_no
        },
        {
          $inc: {
            quantity_available: item.qty,
            reserved_qty: -item.qty
          }
        }
      );
    }
  }

  /**
   * Confirm reserved inventory (order completed)
   * @param {Array} items - Reserved items to confirm
   */
  async confirmReservedInventory(items) {
    for (const item of items) {
      await Inventory.findOneAndUpdate(
        {
          pharmacy_id: item.pharmacy_id,
          medicine_id: item.medicine_id,
          batch_no: item.batch_no
        },
        {
          $inc: {
            reserved_qty: -item.qty
          }
        }
      );
      
      // Publish inventory update for reindexing
      try {
        await publishInventoryUpdated({
          pharmacy_id: item.pharmacy_id,
          medicine_id: item.medicine_id
        });
      } catch (error) {
        // Log but don't fail the operation
        console.error('Failed to publish inventory update:', error.message);
      }
    }
  }

  /**
   * Check availability of medicines at a pharmacy
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Array} medicineIds - Medicine IDs to check
   * @returns {Promise<object>} - Availability map
   */
  async checkAvailability(pharmacyId, medicineIds) {
    const inventory = await Inventory.find({
      pharmacy_id: pharmacyId,
      medicine_id: { $in: medicineIds },
      quantity_available: { $gt: 0 },
      expiry_date: { $gt: new Date() }
    });
    
    const availability = {};
    for (const item of inventory) {
      availability[item.medicine_id.toString()] = {
        available: true,
        quantity: item.quantity_available,
        price: item.selling_price,
        batch_no: item.batch_no,
        expiry_date: item.expiry_date
      };
    }
    
    // Mark unavailable medicines
    for (const id of medicineIds) {
      if (!availability[id]) {
        availability[id] = { available: false };
      }
    }
    
    return availability;
  }
}

module.exports = new InventoryService();
