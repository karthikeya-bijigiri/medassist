# MedAssist Backend Services

This directory contains all backend microservices for the MedAssist medicine availability and delivery platform.

## ⚠️ Medical Disclaimer

MedAssist is a platform for purchasing OTC and prescription medicines. Always consult with a qualified healthcare professional before taking any medication. Prescription drugs require a valid prescription from a licensed medical practitioner. MedAssist does not provide medical advice, diagnosis, or treatment.

## Services Overview

| Service | Technology | Port | Description |
|---------|------------|------|-------------|
| Auth Service | Node.js/Express | 3001 | Authentication, JWT, OTP verification |
| User & Order Service | Node.js/Express | 3002 | Users, medicines, orders, payments |
| Search Service | Node.js/Express | 3003 | Elasticsearch integration, autocomplete |
| Notification Worker | Node.js | 3004 | RabbitMQ consumers for async jobs |
| Pharmacist Service | FastAPI/Python | 8001 | Inventory and order management for pharmacists |
| Driver Service | FastAPI/Python | 8002 | Delivery management for drivers |

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+ and pip
- MongoDB 6.0+
- Redis 7.0+
- RabbitMQ 3.12+
- Elasticsearch 8.x

## Quick Start

1. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies for all Node.js services:
   ```bash
   cd shared && npm install && cd ..
   cd auth-service && npm install && cd ..
   cd user-order-service && npm install && cd ..
   cd search-service && npm install && cd ..
   cd notification-worker && npm install && cd ..
   ```

3. Install dependencies for Python services:
   ```bash
   cd pharmacist-service && pip install -r requirements.txt && cd ..
   cd driver-service && pip install -r requirements.txt && cd ..
   ```

4. Start services (from project root):
   ```bash
   ../scripts/run_local.sh
   ```

## Project Structure

```
/backend
├── auth-service/           # Authentication microservice
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, rate limiting
│   │   ├── routes/         # API routes
│   │   ├── utils/          # JWT, OTP utilities
│   │   └── validators/     # Input validation
│   └── package.json
│
├── user-order-service/     # User and order microservice
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   └── validators/     # Input validation
│   └── package.json
│
├── search-service/         # Search microservice
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Elasticsearch service
│   │   ├── routes/         # API routes
│   │   └── utils/          # Analyzers
│   └── package.json
│
├── notification-worker/    # Background worker
│   ├── src/
│   │   ├── consumers/      # RabbitMQ consumers
│   │   └── services/       # Notification, stock services
│   └── package.json
│
├── pharmacist-service/     # FastAPI pharmacist service
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── models/         # Pydantic models
│   │   └── services/       # Business logic
│   ├── main.py
│   └── requirements.txt
│
├── driver-service/         # FastAPI driver service
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── models/         # Pydantic models
│   │   └── services/       # Business logic
│   ├── main.py
│   └── requirements.txt
│
├── shared/                 # Shared utilities
│   ├── constants/          # Application constants
│   ├── database/           # MongoDB, Redis connections
│   ├── errors/             # Error handling
│   ├── logging/            # Winston logger
│   ├── messaging/          # RabbitMQ setup
│   ├── metrics/            # Prometheus metrics
│   └── validation/         # Ajv schemas
│
├── .env.example            # Environment template
└── README.md               # This file
```

## API Documentation

See `/docs/api-specs/` for OpenAPI specifications of each service.

## Configuration

All services use environment variables for configuration. Key settings:

### Database
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URI` - Redis connection string

### Messaging
- `RABBITMQ_URI` - RabbitMQ connection string
- `ELASTICSEARCH_URI` - Elasticsearch connection string

### Security
- `JWT_SECRET` - Secret for signing JWT tokens (use strong random value in production)
- `BCRYPT_ROUNDS` - Password hashing work factor

### Rate Limiting
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## Logging

All services use structured JSON logging compatible with Logstash:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "auth-service",
  "env": "development",
  "level": "info",
  "request_id": "uuid",
  "user_id": "user-id",
  "route": "/api/v1/auth/login",
  "duration_ms": 100,
  "message": "Login successful"
}
```

PII is automatically masked in logs.

## Metrics

All services expose Prometheus metrics at `/metrics`:

- `http_requests_total{method,route,status}` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `orders_created_total` - Total orders created
- `orders_failed_total` - Total failed orders
- `inventory_reserved_total` - Inventory reservations

## Error Format

All services return errors in a consistent format:

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Email is required",
  "details": { "field": "email" }
}
```

## Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## License

MIT
