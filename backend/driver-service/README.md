# Driver Service

FastAPI-based service for driver operations in MedAssist platform.

## Features

- View and accept available deliveries
- Update delivery status with location tracking
- Confirm delivery with OTP
- Profile and location management

## Endpoints

### Deliveries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/driver/deliveries` | List deliveries |
| GET | `/api/v1/driver/deliveries?available=true` | List available deliveries |
| GET | `/api/v1/driver/deliveries/{id}` | Get delivery details |
| POST | `/api/v1/driver/deliveries/{id}/accept` | Accept delivery |
| POST | `/api/v1/driver/deliveries/{id}/status` | Update status & location |
| POST | `/api/v1/driver/deliveries/{id}/confirm-delivery` | Confirm with OTP |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/driver/profile` | Get profile |
| PUT | `/api/v1/driver/location` | Update location |

## Environment Variables

```bash
DRIVER_SERVICE_PORT=8002
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
uvicorn main:app --reload --port 8002

# Production
uvicorn main:app --host 0.0.0.0 --port 8002
```
