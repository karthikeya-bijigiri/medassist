/**
 * Shared validation schemas for MedAssist services
 * Uses Ajv for JSON schema validation
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, coerceTypes: true });
addFormats(ajv);

// Common patterns
const patterns = {
  phone: '^\\+?[1-9]\\d{9,14}$',
  otp: '^\\d{6}$',
  objectId: '^[a-fA-F0-9]{24}$',
  pincode: '^\\d{6}$'
};

// User registration schema
const userRegistrationSchema = {
  type: 'object',
  required: ['name', 'email', 'phone', 'password'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string', pattern: patterns.phone },
    password: { type: 'string', minLength: 8, maxLength: 128 }
  },
  additionalProperties: false
};

// Login schema
const loginSchema = {
  type: 'object',
  required: ['email_or_phone', 'password'],
  properties: {
    email_or_phone: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
};

// OTP verification schema
const otpVerificationSchema = {
  type: 'object',
  required: ['phone', 'otp'],
  properties: {
    phone: { type: 'string', pattern: patterns.phone },
    otp: { type: 'string', pattern: patterns.otp }
  },
  additionalProperties: false
};

// Refresh token schema
const refreshTokenSchema = {
  type: 'object',
  required: ['refresh_token'],
  properties: {
    refresh_token: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
};

// Address schema
const addressSchema = {
  type: 'object',
  required: ['label', 'address_line', 'city', 'pincode', 'lat', 'lon'],
  properties: {
    label: { type: 'string', enum: ['home', 'work', 'other'] },
    address_line: { type: 'string', minLength: 5, maxLength: 500 },
    city: { type: 'string', minLength: 2, maxLength: 100 },
    pincode: { type: 'string', pattern: patterns.pincode },
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lon: { type: 'number', minimum: -180, maximum: 180 }
  },
  additionalProperties: false
};

// Order item schema
const orderItemSchema = {
  type: 'object',
  required: ['medicine_id', 'pharmacy_id', 'qty'],
  properties: {
    medicine_id: { type: 'string', pattern: patterns.objectId },
    pharmacy_id: { type: 'string', pattern: patterns.objectId },
    qty: { type: 'integer', minimum: 1, maximum: 100 }
  },
  additionalProperties: false
};

// Create order schema
const createOrderSchema = {
  type: 'object',
  required: ['items', 'shipping_address'],
  properties: {
    items: {
      type: 'array',
      items: orderItemSchema,
      minItems: 1,
      maxItems: 50
    },
    shipping_address: addressSchema
  },
  additionalProperties: false
};

// Cart update schema
const cartUpdateSchema = {
  type: 'object',
  required: ['cart'],
  properties: {
    cart: {
      type: 'array',
      items: {
        type: 'object',
        required: ['medicine_id', 'pharmacy_id', 'qty'],
        properties: {
          medicine_id: { type: 'string', pattern: patterns.objectId },
          pharmacy_id: { type: 'string', pattern: patterns.objectId },
          qty: { type: 'integer', minimum: 1, maximum: 100 },
          price_at_add: { type: 'number', minimum: 0 }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
};

// Inventory item schema
const inventoryItemSchema = {
  type: 'object',
  required: ['medicine_id', 'batch_no', 'expiry_date', 'quantity_available', 'mrp', 'selling_price'],
  properties: {
    medicine_id: { type: 'string', pattern: patterns.objectId },
    batch_no: { type: 'string', minLength: 1, maxLength: 50 },
    expiry_date: { type: 'string', format: 'date' },
    quantity_available: { type: 'integer', minimum: 0 },
    mrp: { type: 'number', minimum: 0 },
    selling_price: { type: 'number', minimum: 0 }
  },
  additionalProperties: false
};

// Location update schema
const locationUpdateSchema = {
  type: 'object',
  required: ['lat', 'lon'],
  properties: {
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lon: { type: 'number', minimum: -180, maximum: 180 }
  },
  additionalProperties: false
};

// Search query schema
const searchQuerySchema = {
  type: 'object',
  properties: {
    q: { type: 'string', minLength: 1, maxLength: 100 },
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lon: { type: 'number', minimum: -180, maximum: 180 },
    radius: { type: 'number', minimum: 0.1, maximum: 50, default: 10 },
    page: { type: 'integer', minimum: 1, default: 1 },
    size: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
  },
  additionalProperties: false
};

// Rating schema
const ratingSchema = {
  type: 'object',
  required: ['rating'],
  properties: {
    rating: { type: 'integer', minimum: 1, maximum: 5 },
    review: { type: 'string', maxLength: 1000 }
  },
  additionalProperties: false
};

// Profile update schema
const profileUpdateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    addresses: { type: 'array', items: addressSchema }
  },
  additionalProperties: false
};

// Pharmacy profile update schema
const pharmacyProfileUpdateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 200 },
    address: { type: 'string', minLength: 5, maxLength: 500 },
    opening_hours: { type: 'string', maxLength: 100 },
    contact_phone: { type: 'string', pattern: patterns.phone }
  },
  additionalProperties: false
};

// Create pharmacist schema
const createPharmacistSchema = {
  type: 'object',
  required: ['name', 'email', 'phone', 'password', 'pharmacy'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string', pattern: patterns.phone },
    password: { type: 'string', minLength: 8, maxLength: 128 },
    pharmacy: {
      type: 'object',
      required: ['name', 'address', 'lat', 'lon'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 200 },
        address: { type: 'string', minLength: 5, maxLength: 500 },
        lat: { type: 'number', minimum: -90, maximum: 90 },
        lon: { type: 'number', minimum: -180, maximum: 180 },
        opening_hours: { type: 'string', maxLength: 100 },
        contact_phone: { type: 'string', pattern: patterns.phone }
      }
    }
  },
  additionalProperties: false
};

// Create driver schema
const createDriverSchema = {
  type: 'object',
  required: ['name', 'phone', 'password'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    phone: { type: 'string', pattern: patterns.phone },
    password: { type: 'string', minLength: 8, maxLength: 128 },
    vehicle_type: { type: 'string', enum: ['bike', 'scooter', 'car'] },
    vehicle_number: { type: 'string', maxLength: 20 }
  },
  additionalProperties: false
};

// Delivery status update schema
const deliveryStatusSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { 
      type: 'string', 
      enum: ['picked_up', 'in_transit', 'delivered', 'failed'] 
    },
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lon: { type: 'number', minimum: -180, maximum: 180 },
    notes: { type: 'string', maxLength: 500 }
  },
  additionalProperties: false
};

// Delivery OTP confirmation schema
const deliveryOtpSchema = {
  type: 'object',
  required: ['otp'],
  properties: {
    otp: { type: 'string', pattern: patterns.otp }
  },
  additionalProperties: false
};

// Compile validators
const validators = {
  userRegistration: ajv.compile(userRegistrationSchema),
  login: ajv.compile(loginSchema),
  otpVerification: ajv.compile(otpVerificationSchema),
  refreshToken: ajv.compile(refreshTokenSchema),
  address: ajv.compile(addressSchema),
  createOrder: ajv.compile(createOrderSchema),
  cartUpdate: ajv.compile(cartUpdateSchema),
  inventoryItem: ajv.compile(inventoryItemSchema),
  locationUpdate: ajv.compile(locationUpdateSchema),
  searchQuery: ajv.compile(searchQuerySchema),
  rating: ajv.compile(ratingSchema),
  profileUpdate: ajv.compile(profileUpdateSchema),
  pharmacyProfileUpdate: ajv.compile(pharmacyProfileUpdateSchema),
  createPharmacist: ajv.compile(createPharmacistSchema),
  createDriver: ajv.compile(createDriverSchema),
  deliveryStatus: ajv.compile(deliveryStatusSchema),
  deliveryOtp: ajv.compile(deliveryOtpSchema)
};

/**
 * Validate data against a schema
 * @param {string} schemaName - Name of the schema to use
 * @param {object} data - Data to validate
 * @returns {{ valid: boolean, errors: array|null }}
 */
function validate(schemaName, data) {
  const validator = validators[schemaName];
  if (!validator) {
    throw new Error(`Unknown schema: ${schemaName}`);
  }
  
  const valid = validator(data);
  return {
    valid,
    errors: valid ? null : validator.errors
  };
}

/**
 * Format Ajv errors into user-friendly messages
 * @param {array} errors - Ajv error array
 * @returns {string}
 */
function formatErrors(errors) {
  if (!errors || errors.length === 0) return '';
  
  return errors.map(err => {
    const field = err.instancePath.replace('/', '') || err.params.missingProperty || 'input';
    switch (err.keyword) {
      case 'required':
        return `${err.params.missingProperty} is required`;
      case 'minLength':
        return `${field} must be at least ${err.params.limit} characters`;
      case 'maxLength':
        return `${field} must not exceed ${err.params.limit} characters`;
      case 'pattern':
        return `${field} has invalid format`;
      case 'format':
        return `${field} must be a valid ${err.params.format}`;
      case 'minimum':
        return `${field} must be at least ${err.params.limit}`;
      case 'maximum':
        return `${field} must not exceed ${err.params.limit}`;
      case 'enum':
        return `${field} must be one of: ${err.params.allowedValues.join(', ')}`;
      default:
        return `${field}: ${err.message}`;
    }
  }).join('; ');
}

module.exports = {
  validate,
  formatErrors,
  validators,
  patterns,
  schemas: {
    userRegistrationSchema,
    loginSchema,
    otpVerificationSchema,
    refreshTokenSchema,
    addressSchema,
    createOrderSchema,
    cartUpdateSchema,
    inventoryItemSchema,
    locationUpdateSchema,
    searchQuerySchema,
    ratingSchema,
    profileUpdateSchema,
    pharmacyProfileUpdateSchema,
    createPharmacistSchema,
    createDriverSchema,
    deliveryStatusSchema,
    deliveryOtpSchema
  }
};
