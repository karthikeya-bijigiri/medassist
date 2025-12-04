/**
 * Shared constants for MedAssist services
 */

// Order status lifecycle
const ORDER_STATUS = {
  CREATED: 'created',
  ACCEPTED_BY_PHARMACY: 'accepted_by_pharmacy',
  PREPARED: 'prepared',
  DRIVER_ASSIGNED: 'driver_assigned',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

// Payment status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Delivery status
const DELIVERY_STATUS = {
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed'
};

// User roles
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  PHARMACIST: 'pharmacist',
  DRIVER: 'driver'
};

// RabbitMQ queue names
const QUEUES = {
  ORDERS_CREATED: 'orders.created',
  ORDERS_PAID: 'orders.paid',
  ORDERS_CANCELLED: 'orders.cancelled',
  DELIVERIES_CREATED: 'deliveries.created',
  DELIVERIES_UPDATED: 'deliveries.updated',
  INVENTORY_UPDATED: 'inventory.updated',
  NOTIFICATIONS: 'notifications'
};

// Exchange names
const EXCHANGES = {
  ORDERS: 'orders',
  DELIVERIES: 'deliveries',
  INVENTORY: 'inventory',
  NOTIFICATIONS: 'notifications'
};

// Redis key prefixes
const REDIS_KEYS = {
  OTP: 'otp:',
  SEARCH_CACHE: 'search:',
  RATE_LIMIT: 'rl:',
  INVENTORY_LOCK: 'inventory_lock:',
  REFRESH_TOKEN: 'refresh_token:',
  SESSION: 'session:'
};

// TTL values in seconds
const TTL = {
  OTP: 300, // 5 minutes
  SEARCH_CACHE: 180, // 3 minutes
  RATE_LIMIT_WINDOW: 60, // 1 minute
  INVENTORY_LOCK: 30, // 30 seconds
  REFRESH_TOKEN: 30 * 24 * 60 * 60, // 30 days
  ACCESS_TOKEN: 15 * 60 // 15 minutes
};

// Error codes
const ERROR_CODES = {
  // Auth errors (1xxx)
  INVALID_CREDENTIALS: 'AUTH_1001',
  TOKEN_EXPIRED: 'AUTH_1002',
  TOKEN_INVALID: 'AUTH_1003',
  UNAUTHORIZED: 'AUTH_1004',
  FORBIDDEN: 'AUTH_1005',
  USER_EXISTS: 'AUTH_1006',
  USER_NOT_FOUND: 'AUTH_1007',
  OTP_INVALID: 'AUTH_1008',
  OTP_EXPIRED: 'AUTH_1009',
  RATE_LIMITED: 'AUTH_1010',
  
  // Validation errors (2xxx)
  VALIDATION_ERROR: 'VAL_2001',
  INVALID_INPUT: 'VAL_2002',
  MISSING_FIELD: 'VAL_2003',
  
  // Order errors (3xxx)
  ORDER_NOT_FOUND: 'ORD_3001',
  ORDER_CANNOT_CANCEL: 'ORD_3002',
  INSUFFICIENT_STOCK: 'ORD_3003',
  INVENTORY_LOCKED: 'ORD_3004',
  IDEMPOTENCY_CONFLICT: 'ORD_3005',
  
  // Inventory errors (4xxx)
  INVENTORY_NOT_FOUND: 'INV_4001',
  BATCH_EXISTS: 'INV_4002',
  
  // Delivery errors (5xxx)
  DELIVERY_NOT_FOUND: 'DEL_5001',
  DELIVERY_OTP_INVALID: 'DEL_5002',
  DRIVER_NOT_AVAILABLE: 'DEL_5003',
  
  // Search errors (6xxx)
  SEARCH_ERROR: 'SRH_6001',
  INDEX_ERROR: 'SRH_6002',
  
  // General errors (9xxx)
  INTERNAL_ERROR: 'GEN_9001',
  SERVICE_UNAVAILABLE: 'GEN_9002',
  DATABASE_ERROR: 'GEN_9003',
  EXTERNAL_SERVICE_ERROR: 'GEN_9004'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_SIZE: 20,
  MAX_SIZE: 100
};

// Geo search defaults (in kilometers)
const GEO = {
  DEFAULT_RADIUS: 10,
  MAX_RADIUS: 50,
  MIN_RADIUS: 0.1
};

// Service ports
const PORTS = {
  AUTH_SERVICE: 3001,
  USER_ORDER_SERVICE: 3002,
  SEARCH_SERVICE: 3003,
  NOTIFICATION_WORKER: 3004,
  PHARMACIST_SERVICE: 8001,
  DRIVER_SERVICE: 8002
};

// Medical disclaimer
const MEDICAL_DISCLAIMER = 
  'MEDICAL DISCLAIMER: MedAssist is a platform for purchasing OTC and prescription medicines. ' +
  'Always consult with a qualified healthcare professional before taking any medication. ' +
  'Prescription drugs require a valid prescription from a licensed medical practitioner. ' +
  'MedAssist does not provide medical advice, diagnosis, or treatment.';

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_STATUS,
  ROLES,
  QUEUES,
  EXCHANGES,
  REDIS_KEYS,
  TTL,
  ERROR_CODES,
  HTTP_STATUS,
  PAGINATION,
  GEO,
  PORTS,
  MEDICAL_DISCLAIMER
};
