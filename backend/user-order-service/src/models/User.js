/**
 * User Model
 */

const mongoose = require('mongoose');
const { ROLES } = require('@medassist/shared/constants');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  password_hash: { 
    type: String, 
    required: true 
  },
  roles: { 
    type: [String], 
    default: [ROLES.USER], 
    enum: Object.values(ROLES) 
  },
  is_verified: { 
    type: Boolean, 
    default: false 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  addresses: [{
    label: { 
      type: String, 
      enum: ['home', 'work', 'other'] 
    },
    address_line: String,
    city: String,
    pincode: String,
    lat: Number,
    lon: Number
  }],
  cart: [{
    medicine_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Medicine' 
    },
    pharmacy_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Pharmacy' 
    },
    qty: Number,
    price_at_add: Number
  }],
  wallet_balance: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ roles: 1 });

module.exports = mongoose.model('User', userSchema);
