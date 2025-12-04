# Notification Worker

Background worker service that processes RabbitMQ messages for notifications.

## Features

- Consumes order, delivery, and inventory events
- Sends push notifications, SMS, and emails
- Monitors stock levels and expiry dates
- Triggers Elasticsearch reindexing

## Message Queues

| Queue | Description |
|-------|-------------|
| `orders.created` | Reserve stock, notify pharmacy |
| `orders.paid` | Create delivery job |
| `orders.cancelled` | Release stock, notify user |
| `deliveries.created` | Notify available drivers |
| `deliveries.updated` | Update order status, notify user |
| `inventory.updated` | Trigger ES reindex |

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

## Environment Variables

```bash
NOTIFICATION_WORKER_PORT=3004
MONGODB_URI=mongodb://localhost:27017/medassist
REDIS_URI=redis://localhost:6379
RABBITMQ_URI=amqp://localhost:5672
ELASTICSEARCH_URI=http://localhost:9200
NODE_ENV=development
```

## Running

```bash
npm run dev   # Development
npm start     # Production
```
