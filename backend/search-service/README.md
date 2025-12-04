# Search Service

Full-text search service using Elasticsearch for MedAssist platform.

## Features

- Medicine search with fuzzy matching
- Autocomplete with edge n-gram
- Pharmacy search with geo-filtering
- Search result caching with Redis
- Admin reindex functionality

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/search/medicines?q=` | Search medicines |
| GET | `/api/v1/search/autocomplete?q=` | Autocomplete suggestions |
| GET | `/api/v1/search/pharmacies?lat=&lon=&radius=` | Search nearby pharmacies |
| POST | `/api/v1/admin/reindex` | Reindex all data (admin only) |
| GET | `/metrics` | Prometheus metrics |
| GET | `/health` | Health check |

## Elasticsearch Indices

- `medicines` - Medicine catalog with edge n-gram for autocomplete
- `pharmacies` - Pharmacy data with geo-point for location queries
- `pharmacy_inventory` - Combined inventory for product-location search

## Environment Variables

```bash
SEARCH_SERVICE_PORT=3003
MONGODB_URI=mongodb://localhost:27017/medassist
REDIS_URI=redis://localhost:6379
ELASTICSEARCH_URI=http://localhost:9200
JWT_SECRET=your-256-bit-secret
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

## Running

```bash
npm run dev   # Development
npm start     # Production
```
