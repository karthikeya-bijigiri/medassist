# MedAssist Architecture

## Overview

MedAssist is a microservices-based medicine availability and delivery platform. The architecture follows domain-driven design principles with clear service boundaries and asynchronous communication patterns.

## ⚠️ Medical Disclaimer

MedAssist is a platform for purchasing OTC and prescription medicines. Always consult with a qualified healthcare professional before taking any medication. Prescription drugs require a valid prescription from a licensed medical practitioner. MedAssist does not provide medical advice, diagnosis, or treatment.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Static)                               │
│                     HTML/CSS/JavaScript (Mobile-First)                       │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / Load Balancer                        │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ Auth Service  │         │ User & Order    │         │ Search Service  │
│  (Node.js)    │         │   Service       │         │   (Node.js)     │
│  Port: 3001   │         │  (Node.js)      │         │   Port: 3003    │
└───────┬───────┘         │  Port: 3002     │         └────────┬────────┘
        │                 └────────┬────────┘                  │
        │                          │                           │
        │                          ▼                           │
        │                 ┌─────────────────┐                  │
        │                 │  Notification   │                  │
        │                 │    Worker       │                  │
        │                 │  Port: 3004     │                  │
        │                 └────────┬────────┘                  │
        │                          │                           │
        ▼                          ▼                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │  MongoDB    │  │   Redis     │  │  RabbitMQ   │  │ Elasticsearch   │   │
│  │  (Primary)  │  │  (Cache)    │  │  (Queue)    │  │    (Search)     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘

        ┌───────────────────────────────────────────────────┐
        │                  PYTHON SERVICES                   │
        │  ┌─────────────────┐       ┌─────────────────┐    │
        │  │ Pharmacist Svc  │       │  Driver Service │    │
        │  │  (FastAPI)      │       │   (FastAPI)     │    │
        │  │  Port: 8001     │       │   Port: 8002    │    │
        │  └─────────────────┘       └─────────────────┘    │
        └───────────────────────────────────────────────────┘
```

## Services

### 1. Auth Service (Node.js/Express) - Port 3001

**Responsibilities:**
- User registration and verification
- OTP generation and validation
- JWT token management (access + refresh)
- Role-based access control
- Admin operations (create pharmacist/driver)

**Key Features:**
- JWT with HS256 signing
- Access token TTL: 15 minutes
- Refresh token TTL: 30 days
- OTP stored in Redis with TTL
- Rate limiting on login/OTP endpoints
- bcrypt password hashing

**Endpoints:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/admin/create-pharmacist`
- `POST /api/v1/auth/admin/create-driver`

### 2. User & Order Service (Node.js/Express) - Port 3002

**Responsibilities:**
- Medicine search and listing
- Pharmacy discovery (geo-filtering)
- Order creation and management
- Cart management
- Payment processing (simulated)
- User profile management

**Key Features:**
- Idempotent order creation (Idempotency-Key header)
- Inventory reservation with Redis locks
- Atomic MongoDB updates
- Order lifecycle management
- Role-based order access

**Order Lifecycle:**
```
created → accepted_by_pharmacy → prepared → driver_assigned → in_transit → delivered
                                                                          ↓
                                                                    cancelled/failed
```

**Endpoints:**
- `GET /api/v1/medicines/search`
- `GET /api/v1/pharmacies`
- `GET /api/v1/pharmacies/:id/inventory`
- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `POST /api/v1/orders/:id/cancel`
- `POST /api/v1/orders/:id/rate`
- `GET /api/v1/users/profile`
- `PUT /api/v1/users/profile`
- `PUT /api/v1/users/cart`
- `POST /api/v1/payment/webhook`

### 3. Search Service (Node.js/Express) - Port 3003

**Responsibilities:**
- Full-text medicine search
- Autocomplete suggestions
- Pharmacy geo-search
- Elasticsearch index management

**Key Features:**
- Edge n-gram analyzer for autocomplete
- 300ms debounce on frontend
- Geo-distance filtering for pharmacies
- Cached search results in Redis

**Elasticsearch Indices:**
- `medicines` - name, synonyms, brand, generic, salt, tags
- `pharmacy_inventory` - with geo-point field

**Endpoints:**
- `GET /api/v1/search/medicines`
- `GET /api/v1/search/autocomplete`
- `GET /api/v1/search/pharmacies`
- `POST /api/v1/admin/reindex`

### 4. Notification Worker (Node.js) - Port 3004

**Responsibilities:**
- Consume RabbitMQ messages
- Stock reservation
- Delivery job creation
- Driver notifications
- Elasticsearch re-indexing

**RabbitMQ Queues:**
- `orders.created` → Reserve inventory, notify pharmacy
- `orders.paid` → Create delivery job
- `deliveries.created` → Notify available drivers
- `inventory.updated` → Re-index Elasticsearch

**Message Format:**
```json
{
  "message_id": "uuid",
  "timestamp": "ISO 8601",
  "retries": 0,
  "payload": {}
}
```

### 5. Pharmacist Service (FastAPI/Python) - Port 8001

**Responsibilities:**
- Inventory management (CRUD)
- Incoming order management
- Pharmacy profile management
- Order acceptance/decline/preparation

**Endpoints:**
- `GET/POST /api/v1/pharmacist/inventory`
- `PUT/DELETE /api/v1/pharmacist/inventory/{id}`
- `GET /api/v1/pharmacist/orders`
- `POST /api/v1/pharmacist/orders/{id}/accept`
- `POST /api/v1/pharmacist/orders/{id}/decline`
- `POST /api/v1/pharmacist/orders/{id}/prepared`
- `GET/PUT /api/v1/pharmacist/profile`

### 6. Driver Service (FastAPI/Python) - Port 8002

**Responsibilities:**
- Delivery management
- Location tracking
- Delivery confirmation (OTP)
- Driver profile management

**Endpoints:**
- `GET /api/v1/driver/deliveries`
- `GET /api/v1/driver/deliveries/{id}`
- `POST /api/v1/driver/deliveries/{id}/accept`
- `POST /api/v1/driver/deliveries/{id}/status`
- `POST /api/v1/driver/deliveries/{id}/confirm-delivery`
- `GET /api/v1/driver/profile`
- `PUT /api/v1/driver/location`

## Data Layer

### MongoDB Collections

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| users | User accounts | email (unique), phone (unique), roles |
| pharmacies | Pharmacy profiles | 2dsphere on geo |
| medicines | Medicine catalog | name, generic_name |
| inventory | Stock per pharmacy/medicine | compound (pharmacy_id, medicine_id, batch_no) |
| orders | Order records | user_id, pharmacy_id, status |
| deliveries | Delivery tracking | order_id, driver_id, status |
| audit_logs | Activity logging | service, user_id, timestamp |

### Redis Keys

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `otp:{phone}` | OTP storage | 5 min |
| `search:{hash}` | Cached results | 30s-5m |
| `rl:{ip}:{endpoint}` | Rate limiting | 1 min |
| `inventory_lock:{id}` | Distributed lock | 30s |
| `refresh_token:{jti}` | Token revocation | 30 days |

## Security

### Authentication Flow

```
1. User registers → OTP sent to phone
2. User verifies OTP → Account activated, tokens issued
3. Access token expires → Refresh token used to get new access token
4. User logs out → Refresh token revoked in Redis
```

### JWT Structure

```json
{
  "sub": "user_id",
  "iat": 1234567890,
  "exp": 1234567890,
  "jti": "unique_id",
  "roles": ["user"]
}
```

### Security Measures

- HTTP-only cookies for tokens
- SameSite=Strict cookie policy
- bcrypt password hashing (configurable rounds)
- Rate limiting on sensitive endpoints
- PII masking in logs
- Input validation with Ajv

## Observability

### Logging

All services use structured JSON logging:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "auth-service",
  "env": "production",
  "level": "info",
  "request_id": "uuid",
  "user_id": "masked",
  "route": "/api/v1/auth/login",
  "duration_ms": 45,
  "message": "Login successful"
}
```

### Prometheus Metrics

| Metric | Type | Labels |
|--------|------|--------|
| http_requests_total | Counter | method, route, status |
| http_request_duration_seconds | Histogram | method, route |
| orders_created_total | Counter | pharmacy_id |
| orders_failed_total | Counter | reason |
| inventory_reserved_total | Counter | pharmacy_id |

## Error Handling

All services return errors in a consistent format:

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Human readable message",
  "details": { "field": "email", "reason": "required" }
}
```

Common error codes:
- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (e.g., duplicate, out of stock)
- `INTERNAL_ERROR` - Server error

## Deployment Considerations

### Scaling

- All services are stateless and horizontally scalable
- Redis cluster for session and cache
- MongoDB replica set for high availability
- RabbitMQ cluster for message queue reliability
- Elasticsearch cluster for search resilience

### Configuration

All services use environment variables for configuration:

```env
MONGODB_URI=mongodb://localhost:27017/medassist
REDIS_URI=redis://localhost:6379
RABBITMQ_URI=amqp://localhost:5672
ELASTICSEARCH_URI=http://localhost:9200
JWT_SECRET=<strong-secret>
NODE_ENV=production
```

## Frontend Architecture

The frontend is a static single-page application:

- Mobile-first responsive design
- JWT stored in HTTP-only cookies
- 401 interceptor for token refresh
- 300ms debounce on search
- LocalStorage for cart persistence

Pages:
- Landing page with search
- Search results with filters
- Product detail
- Cart and checkout
- Order tracking
- User profile
- Pharmacist dashboard
- Admin dashboard
- Driver dashboard
