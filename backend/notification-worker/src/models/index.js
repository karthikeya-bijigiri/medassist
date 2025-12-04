/**
 * Register Mongoose models for notification worker
 */

const mongoose = require('mongoose');
const { ROLES } = require('@medassist/shared/constants');

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  phone: String,
  name: String,
  roles: [String],
  is_verified: Boolean
});

// Pharmacy Schema
const pharmacySchema = new mongoose.Schema({
  name: String,
  address: String,
  contact_phone: String
});

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  pharmacy_id: mongoose.Schema.Types.ObjectId,
  medicine_id: mongoose.Schema.Types.ObjectId,
  quantity_available: Number,
  expiry_date: Date
});

// Only register if not already registered
if (!mongoose.models.User) {
  mongoose.model('User', userSchema);
}

if (!mongoose.models.Pharmacy) {
  mongoose.model('Pharmacy', pharmacySchema);
}

if (!mongoose.models.Inventory) {
  mongoose.model('Inventory', inventorySchema);
}

module.exports = {
  User: mongoose.models.User,
  Pharmacy: mongoose.models.Pharmacy,
  Inventory: mongoose.models.Inventory
};
