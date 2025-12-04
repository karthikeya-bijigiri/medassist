/**
 * Pharmacy Model
 */

const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  pharmacist_user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  address: { 
    type: String, 
    required: true,
    trim: true
  },
  geo: {
    type: { 
      type: String, 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      required: true 
    } // [lon, lat]
  },
  opening_hours: {
    type: String,
    trim: true
  },
  is_active: { 
    type: Boolean, 
    default: true 
  },
  contact_phone: {
    type: String,
    trim: true
  },
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  rating_count: { 
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

// 2dsphere index for geo queries
pharmacySchema.index({ geo: '2dsphere' });
pharmacySchema.index({ is_active: 1 });
pharmacySchema.index({ pharmacist_user_id: 1 });

module.exports = mongoose.model('Pharmacy', pharmacySchema);
