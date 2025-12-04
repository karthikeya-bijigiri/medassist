# User & Order Service

User management and order processing service for MedAssist platform.

## Features

- Medicine search with geo-filtering
- Order creation with idempotency support
- Inventory reservation with distributed locking
- User profile and cart management
- Pharmacy listing with geo-search
- Payment webhook processing

## Endpoints

### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/medicines/search` | Search medicines |
| GET | `/api/v1/medicines/:id` | Get medicine details |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create order (requires Idempotency-Key header) |
| GET | `/api/v1/orders` | List user's orders |
| GET | `/api/v1/orders/:id` | Get order details |
| POST | `/api/v1/orders/:id/cancel` | Cancel order |
| POST | `/api/v1/orders/:id/rate` | Rate pharmacy |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/profile` | Get user profile |
| PUT | `/api/v1/users/profile` | Update user profile |
| GET | `/api/v1/users/cart` | Get user cart |
| PUT | `/api/v1/users/cart` | Update user cart |

### Pharmacies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pharmacies` | List pharmacies (with geo-filter) |
| GET | `/api/v1/pharmacies/:id` | Get pharmacy details |
| GET | `/api/v1/pharmacies/:id/inventory` | Get pharmacy inventory |

### Payment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payment/webhook` | Payment webhook |
| POST | `/api/v1/payment/simulate` | Simulate payment (dev only) |

## Order Lifecycle

1. `created` - Order created, inventory reserved
2. `accepted_by_pharmacy` - Pharmacy accepts order
3. `prepared` - Order prepared for pickup
4. `driver_assigned` - Driver assigned for delivery
5. `in_transit` - Order in transit
6. `delivered` - Order delivered
7. `cancelled` - Order cancelled
8. `failed` - Order failed

## Environment Variables

```bash
USER_ORDER_SERVICE_PORT=3002
MONGODB_URI=mongodb://localhost:27017/medassist
REDIS_URI=redis://localhost:6379
RABBITMQ_URI=amqp://localhost:5672
JWT_SECRET=your-256-bit-secret
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

## Running

```bash
npm run dev   # Development
npm start     # Production
```
