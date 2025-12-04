/**
 * Delivery Model
 */

const mongoose = require('mongoose');
const { DELIVERY_STATUS } = require('@medassist/shared/constants');

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true }
}, { _id: false });

const deliverySchema = new mongoose.Schema({
  order_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true,
    index: true
  },
  driver_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  assigned_at: { 
    type: Date 
  },
  pickup_at: { 
    type: Date 
  },
  delivered_at: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: Object.values(DELIVERY_STATUS),
    default: DELIVERY_STATUS.ASSIGNED,
    index: true
  },
  current_location: locationSchema,
  pickup_location: locationSchema,
  delivery_location: locationSchema,
  estimated_delivery_time: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// Indexes
deliverySchema.index({ driver_id: 1, status: 1 });
deliverySchema.index({ assigned_at: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);
