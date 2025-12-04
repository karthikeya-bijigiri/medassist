# Pharmacist Service

FastAPI-based service for pharmacist operations in MedAssist platform.

## Features

- Inventory management (add, update, delete items)
- Order management (accept, decline, mark prepared)
- Profile management

## Endpoints

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pharmacist/inventory` | List inventory items |
| POST | `/api/v1/pharmacist/inventory` | Add inventory item |
| PUT | `/api/v1/pharmacist/inventory/{id}` | Update inventory item |
| DELETE | `/api/v1/pharmacist/inventory/{id}` | Delete inventory item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pharmacist/orders` | List orders |
| GET | `/api/v1/pharmacist/orders/{id}` | Get order details |
| POST | `/api/v1/pharmacist/orders/{id}/accept` | Accept order |
| POST | `/api/v1/pharmacist/orders/{id}/decline` | Decline order |
| POST | `/api/v1/pharmacist/orders/{id}/prepared` | Mark order prepared |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pharmacist/profile` | Get profile |
| PUT | `/api/v1/pharmacist/profile` | Update profile |

## Environment Variables

```bash
PHARMACIST_SERVICE_PORT=8001
MONGODB_URI=mongodb://localhost:27017/medassist
REDIS_URI=redis://localhost:6379
JWT_SECRET=your-256-bit-secret
CORS_ORIGIN=http://localhost:3000
```

## Running

```bash
# Install dependencies
pip install -r requirements.txt

# Development
uvicorn main:app --reload --port 8001

# Production
uvicorn main:app --host 0.0.0.0 --port 8001
```
