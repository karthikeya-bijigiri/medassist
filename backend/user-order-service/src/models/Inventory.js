/**
 * Inventory Model
 */

const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  pharmacy_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Pharmacy', 
    required: true,
    index: true
  },
  medicine_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Medicine', 
    required: true,
    index: true
  },
  batch_no: { 
    type: String, 
    required: true,
    trim: true
  },
  expiry_date: { 
    type: Date, 
    required: true 
  },
  quantity_available: { 
    type: Number, 
    required: true,
    min: 0
  },
  mrp: { 
    type: Number, 
    required: true,
    min: 0
  },
  selling_price: { 
    type: Number, 
    required: true,
    min: 0
  },
  reserved_qty: { 
    type: Number, 
    default: 0,
    min: 0
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Compound unique index
inventorySchema.index(
  { pharmacy_id: 1, medicine_id: 1, batch_no: 1 }, 
  { unique: true }
);

// Index for checking availability
inventorySchema.index({ quantity_available: 1 });
inventorySchema.index({ expiry_date: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
