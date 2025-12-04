/**
 * Structured JSON logger for MedAssist services
 * Uses Winston for logging with Logstash-compatible format
 */

const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// PII fields that should be masked in logs
const PII_FIELDS = ['password', 'password_hash', 'otp', 'refresh_token', 'access_token', 'phone', 'email'];

/**
 * Mask sensitive PII data in objects
 * @param {any} data - Data to mask
 * @returns {any} - Masked data
 */
function maskPII(data) {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(maskPII);
  }
  
  const masked = {};
  for (const [key, value] of Object.entries(data)) {
    if (PII_FIELDS.includes(key.toLowerCase())) {
      if (typeof value === 'string') {
        masked[key] = value.length > 4 ? `***${value.slice(-4)}` : '****';
      } else {
        masked[key] = '****';
      }
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskPII(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * Create a logger instance for a service
 * @param {string} serviceName - Name of the service
 * @param {object} options - Additional options
 * @returns {winston.Logger} - Configured logger instance
 */
function createLogger(serviceName, options = {}) {
  const {
    level = process.env.LOG_LEVEL || 'info',
    logstashHost = process.env.LOGSTASH_HOST,
    logstashPort = process.env.LOGSTASH_PORT
  } = options;

  const env = process.env.NODE_ENV || 'development';

  // Custom format for structured JSON logging
  const structuredFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const logEntry = {
        timestamp,
        service: serviceName,
        env,
        level,
        message,
        ...maskPII(meta)
      };
      return JSON.stringify(logEntry);
    })
  );

  const transports = [
    new winston.transports.Console({
      format: env === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : structuredFormat
    })
  ];

  // Add file transport for production
  if (env === 'production') {
    transports.push(
      new winston.transports.File({
        filename: `logs/${serviceName}-error.log`,
        level: 'error',
        format: structuredFormat
      }),
      new winston.transports.File({
        filename: `logs/${serviceName}-combined.log`,
        format: structuredFormat
      })
    );
  }

  const logger = winston.createLogger({
    level,
    format: structuredFormat,
    transports,
    defaultMeta: { service: serviceName, env }
  });

  return logger;
}

/**
 * Request logging middleware for Express
 * @param {winston.Logger} logger - Logger instance
 * @returns {Function} - Express middleware
 */
function requestLoggerMiddleware(logger) {
  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    // Attach request ID to request object
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        request_id: requestId,
        method: req.method,
        route: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration,
        user_id: req.user?.sub || null,
        ip: req.ip || req.connection.remoteAddress
      };

      if (res.statusCode >= 500) {
        logger.error('Request completed with error', logData);
      } else if (res.statusCode >= 400) {
        logger.warn('Request completed with client error', logData);
      } else {
        logger.info('Request completed', logData);
      }
    });

    next();
  };
}

/**
 * Generate a unique request ID
 * @returns {string} - UUID v4
 */
function generateRequestId() {
  return uuidv4();
}

module.exports = {
  createLogger,
  requestLoggerMiddleware,
  generateRequestId,
  maskPII
};
