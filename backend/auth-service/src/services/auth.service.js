/**
 * Authentication Service
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { generateTokenPair, verifyToken, parseDuration } = require('../utils/jwt.utils');
const { generateOTP, normalizePhone } = require('../utils/otp.utils');
const { storeOTP, verifyOTP, storeRefreshToken, isRefreshTokenValid, revokeRefreshToken } = require('@medassist/shared/database/redis');
const { AppError } = require('@medassist/shared/errors/AppError');
const { ROLES, TTL } = require('@medassist/shared/constants');
const config = require('../config');

// User Schema (defined here for auth service)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  password_hash: { type: String, required: true },
  roles: { type: [String], default: [ROLES.USER], enum: Object.values(ROLES) },
  is_verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  addresses: [{
    label: { type: String, enum: ['home', 'work', 'other'] },
    address_line: String,
    city: String,
    pincode: String,
    lat: Number,
    lon: Number
  }],
  cart: [{
    medicine_id: mongoose.Schema.Types.ObjectId,
    pharmacy_id: mongoose.Schema.Types.ObjectId,
    qty: Number,
    price_at_add: Number
  }],
  wallet_balance: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ roles: 1 });

const User = mongoose.model('User', userSchema);

// Pharmacy Schema (for pharmacist creation)
const pharmacySchema = new mongoose.Schema({
  pharmacist_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  geo: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [lon, lat]
  },
  opening_hours: String,
  is_active: { type: Boolean, default: true },
  contact_phone: String,
  rating: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

pharmacySchema.index({ geo: '2dsphere' });

const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);

class AuthService {
  /**
   * Register a new user
   * @param {object} userData - User registration data
   * @returns {Promise<object>} - Created user and OTP info
   */
  async register({ name, email, phone, password }) {
    // Normalize phone
    const normalizedPhone = normalizePhone(phone);
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: normalizedPhone }]
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw AppError.userExists('Email already registered');
      }
      throw AppError.userExists('Phone number already registered');
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, config.bcryptRounds);
    
    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: normalizedPhone,
      password_hash,
      roles: [ROLES.USER],
      is_verified: false
    });
    
    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(normalizedPhone, otp, config.otp.ttlSeconds);
    
    // In production, send OTP via SMS
    // For development, return OTP in response
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        is_verified: user.is_verified
      },
      message: 'Registration successful. Please verify your phone number.',
      // Only include OTP in development
      ...(config.nodeEnv === 'development' && { otp })
    };
  }

  /**
   * Verify OTP
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise<object>} - Verification result
   */
  async verifyOTP(phone, otp) {
    const normalizedPhone = normalizePhone(phone);
    
    const result = await verifyOTP(normalizedPhone, otp);
    
    if (!result.valid) {
      throw AppError.otpInvalid(result.message);
    }
    
    // Update user verification status
    const user = await User.findOneAndUpdate(
      { phone: normalizedPhone },
      { is_verified: true },
      { new: true }
    );
    
    if (!user) {
      throw AppError.userNotFound('User not found with this phone number');
    }
    
    // Generate tokens
    const tokens = generateTokenPair(user);
    
    // Store refresh token JTI
    await storeRefreshToken(tokens.refreshTokenJti, user._id.toString());
    
    return {
      message: 'Phone verified successfully',
      ...tokens
    };
  }

  /**
   * Login user
   * @param {string} email_or_phone - Email or phone
   * @param {string} password - Password
   * @returns {Promise<object>} - Login result with tokens
   */
  async login(email_or_phone, password) {
    // Find user by email or phone
    const isEmail = email_or_phone.includes('@');
    const query = isEmail 
      ? { email: email_or_phone.toLowerCase() }
      : { phone: normalizePhone(email_or_phone) };
    
    const user = await User.findOne(query);
    
    if (!user) {
      throw AppError.invalidCredentials();
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      throw AppError.invalidCredentials();
    }
    
    // Check if verified
    if (!user.is_verified) {
      // Generate new OTP
      const otp = generateOTP();
      await storeOTP(user.phone, otp, config.otp.ttlSeconds);
      
      return {
        verified: false,
        message: 'Please verify your phone number first',
        ...(config.nodeEnv === 'development' && { otp })
      };
    }
    
    // Generate tokens
    const tokens = generateTokenPair(user);
    
    // Store refresh token JTI
    await storeRefreshToken(tokens.refreshTokenJti, user._id.toString());
    
    return {
      ...tokens,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles
      }
    };
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} - New token pair
   */
  async refresh(refreshToken) {
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw AppError.tokenExpired('Refresh token has expired');
      }
      throw AppError.tokenInvalid('Invalid refresh token');
    }
    
    if (decoded.type !== 'refresh') {
      throw AppError.tokenInvalid('Invalid token type');
    }
    
    // Check if refresh token is still valid (not revoked)
    const isValid = await isRefreshTokenValid(decoded.jti);
    if (!isValid) {
      throw AppError.tokenInvalid('Refresh token has been revoked');
    }
    
    // Get user
    const user = await User.findById(decoded.sub);
    if (!user) {
      throw AppError.userNotFound();
    }
    
    // Revoke old refresh token
    await revokeRefreshToken(decoded.jti);
    
    // Generate new tokens
    const tokens = generateTokenPair(user);
    
    // Store new refresh token JTI
    await storeRefreshToken(tokens.refreshTokenJti, user._id.toString());
    
    return tokens;
  }

  /**
   * Logout user
   * @param {string} refreshToken - Refresh token to revoke
   */
  async logout(refreshToken) {
    if (!refreshToken) return;
    
    try {
      const decoded = verifyToken(refreshToken);
      if (decoded.jti) {
        await revokeRefreshToken(decoded.jti);
      }
    } catch (error) {
      // Ignore invalid token errors during logout
    }
  }

  /**
   * Create pharmacist account (admin only)
   * @param {object} data - Pharmacist data
   * @returns {Promise<object>} - Created pharmacist and pharmacy
   */
  async createPharmacist({ name, email, phone, password, pharmacy }) {
    const normalizedPhone = normalizePhone(phone);
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: normalizedPhone }]
    });
    
    if (existingUser) {
      throw AppError.userExists('User already exists with this email or phone');
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, config.bcryptRounds);
    
    // Create user with pharmacist role
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: normalizedPhone,
      password_hash,
      roles: [ROLES.PHARMACIST],
      is_verified: true // Admin-created accounts are pre-verified
    });
    
    // Create pharmacy
    const pharmacyDoc = await Pharmacy.create({
      pharmacist_user_id: user._id,
      name: pharmacy.name,
      address: pharmacy.address,
      geo: {
        type: 'Point',
        coordinates: [pharmacy.lon, pharmacy.lat]
      },
      opening_hours: pharmacy.opening_hours,
      contact_phone: pharmacy.contact_phone || normalizedPhone,
      is_active: true
    });
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles
      },
      pharmacy: {
        id: pharmacyDoc._id,
        name: pharmacyDoc.name,
        address: pharmacyDoc.address
      }
    };
  }

  /**
   * Create driver account (admin only)
   * @param {object} data - Driver data
   * @returns {Promise<object>} - Created driver
   */
  async createDriver({ name, phone, password, vehicle_type, vehicle_number }) {
    const normalizedPhone = normalizePhone(phone);
    
    // Generate unique driver ID
    const driverCount = await User.countDocuments({ roles: ROLES.DRIVER });
    const driverId = String(driverCount + 1).padStart(3, '0');
    const username = `driver_${driverId}`;
    
    // Check if phone already exists
    const existingUser = await User.findOne({ phone: normalizedPhone });
    if (existingUser) {
      throw AppError.userExists('Phone number already registered');
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, config.bcryptRounds);
    
    // Create user with driver role
    const user = await User.create({
      name,
      email: `${username}@driver.medassist.local`, // Generate email for driver
      phone: normalizedPhone,
      password_hash,
      roles: [ROLES.DRIVER],
      is_verified: true // Admin-created accounts are pre-verified
    });
    
    return {
      user: {
        id: user._id,
        username,
        name: user.name,
        phone: user.phone,
        roles: user.roles
      },
      credentials: {
        username,
        // Only show in development
        ...(config.nodeEnv === 'development' && { password })
      }
    };
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} - User data
   */
  async getUserById(userId) {
    const user = await User.findById(userId).select('-password_hash');
    if (!user) {
      throw AppError.userNotFound();
    }
    return user;
  }
}

module.exports = {
  AuthService: new AuthService(),
  User,
  Pharmacy
};
