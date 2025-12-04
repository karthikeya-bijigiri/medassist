# Auth Service

Authentication and authorization service for MedAssist platform.

## Features

- User registration with phone verification (OTP)
- JWT-based authentication (HS256)
- Access tokens (15m TTL) and refresh tokens (30d TTL)
- Rate limiting on login and OTP endpoints
- Admin endpoints for creating pharmacist and driver accounts
- Password hashing with bcrypt

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/verify-otp` | Verify phone OTP |
| POST | `/api/v1/auth/login` | Login with email/phone and password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout and revoke refresh token |
| GET | `/api/v1/auth/me` | Get current user (protected) |
| POST | `/api/v1/auth/admin/create-pharmacist` | Create pharmacist account (admin only) |
| POST | `/api/v1/auth/admin/create-driver` | Create driver account (admin only) |
| GET | `/metrics` | Prometheus metrics |
| GET | `/health` | Health check |

## Environment Variables

```bash
AUTH_SERVICE_PORT=3001
MONGODB_URI=mongodb://localhost:27017/medassist
REDIS_URI=redis://localhost:6379
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=30d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## Testing

```bash
npm test
```
