/**
 * Order Model
 */

const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS } = require('@medassist/shared/constants');

const orderItemSchema = new mongoose.Schema({
  medicine_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Medicine', 
    required: true 
  },
  batch_no: { 
    type: String, 
    required: true 
  },
  qty: { 
    type: Number, 
    required: true,
    min: 1
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  tax: { 
    type: Number, 
    default: 0,
    min: 0
  }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  label: { 
    type: String, 
    enum: ['home', 'work', 'other'] 
  },
  address_line: String,
  city: String,
  pincode: String,
  lat: Number,
  lon: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  pharmacy_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Pharmacy', 
    required: true,
    index: true
  },
  items: [orderItemSchema],
  total_amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  status: { 
    type: String, 
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.CREATED,
    index: true
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  },
  payment_status: { 
    type: String, 
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
    index: true
  },
  delivery_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Delivery' 
  },
  otp_for_delivery: { 
    type: String 
  },
  shipping_address: addressSchema,
  idempotency_key: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Indexes
orderSchema.index({ created_at: -1 });
orderSchema.index({ idempotency_key: 1 }, { unique: true, sparse: true });
orderSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Order', orderSchema);
