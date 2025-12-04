/**
 * Medicine Model
 */

const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  brand: { 
    type: String,
    trim: true
  },
  generic_name: { 
    type: String,
    trim: true
  },
  salt: { 
    type: String,
    trim: true
  },
  dosage_form: { 
    type: String,
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'powder', 'inhaler', 'other'],
    default: 'tablet'
  },
  strength: { 
    type: String,
    trim: true
  },
  prescription_required: { 
    type: Boolean, 
    default: false 
  },
  hsn_code: { 
    type: String,
    trim: true
  },
  tags: [{ 
    type: String,
    trim: true
  }],
  search_synonyms: [{ 
    type: String,
    trim: true
  }],
  manufacturer: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Text index for search
medicineSchema.index({ 
  name: 'text', 
  brand: 'text', 
  generic_name: 'text', 
  salt: 'text', 
  tags: 'text',
  search_synonyms: 'text'
});

module.exports = mongoose.model('Medicine', medicineSchema);
