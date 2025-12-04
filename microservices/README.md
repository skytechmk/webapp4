# Snapify Microservices Architecture

## Overview

This directory contains the complete microservices architecture implementation for Snapify. The architecture transforms the monolithic application into a service-oriented architecture with proper service discovery, load balancing, and error handling.

## Architecture Components

### 1. Microservices

- **User Service** (`services/user-service/`) - Handles user management and authentication
- **Event Service** (`services/event-service/`) - Manages event creation and access control
- **Media Service** (`services/media-service/`) - Processes and stores media files
- **Notification Service** (`services/notification-service/`) - Manages real-time and email notifications

### 2. Infrastructure Services

- **API Gateway** (`services/api-gateway/`) - Routes requests and provides load balancing
- **Service Communication** (`services/service-communication/`) - Handles inter-service communication
- **Service Discovery** (`services/service-discovery/`) - Manages service registration and health checks

### 3. Management

- **Microservices Manager** (`microservices/index.js`) - Central manager for starting/stopping services
- **Test Suite** (`microservices/test-microservices.js`) - Comprehensive testing framework

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3001 | Main entry point for all requests |
| User Service | 3004 | User management and authentication |
| Event Service | 3005 | Event creation and management |
| Media Service | 3003 | Media upload and processing |
| Notification Service | 3006 | Real-time notifications |

## Key Features

### Service Discovery
- Dynamic service registration and deregistration
- Health monitoring with automatic failover
- Redis-based service registry

### Load Balancing
- Round-robin load balancing
- Health-based routing
- Circuit breaker pattern

### Error Handling
- Comprehensive error handling at all levels
- Graceful degradation with fallback mechanisms
- Circuit breaker pattern for service failures

### Caching
- Redis-based response caching
- Intelligent cache invalidation
- Cache performance optimization

## Running the Microservices

### Start All Services
```bash
node microservices/index.js
```

### Run Tests
```bash
node microservices/test-microservices.js
```

### Start Individual Services
```bash
# Start API Gateway
node services/api-gateway/index.js

# Start User Service
node services/user-service/index.js

# Start Event Service
node services/event-service/index.js

# Start Media Service
node services/media-service/index.js

# Start Notification Service
node services/notification-service/index.js
```

## API Endpoints

### User Service
- `POST /users` - Create user
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `POST /auth/login` - User login
- `POST /auth/google` - Google login
- `POST /auth/validate` - Token validation
- `POST /auth/refresh` - Token refresh

### Event Service
- `POST /events` - Create event
- `GET /events/:id` - Get event by ID
- `PUT /events/:id` - Update event
- `DELETE /events/:id` - Delete event
- `POST /events/:id/validate-pin` - Validate event PIN
- `GET /events` - List all events
- `GET /events/host/:hostId` - Get events by host

### Media Service
- `POST /media` - Upload media
- `GET /media/:id` - Get media by ID
- `DELETE /media/:id` - Delete media
- `GET /media/event/:eventId` - Get media by event
- `POST /media/bulk-delete` - Bulk delete media
- `PUT /media/:mediaId/like` - Like media

### Notification Service
- `POST /notifications` - Create notification
- `GET /notifications/user/:userId` - Get user notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `POST /notifications/email` - Send email notification
- `POST /notifications/push` - Send push notification

## Service Communication

### REST API
- All services communicate via REST APIs
- JSON payloads with proper error handling
- Standard HTTP status codes

### WebSocket
- Real-time notifications via WebSocket
- Service-to-service WebSocket communication
- Event-driven architecture

### Redis Pub/Sub
- Service event broadcasting
- Health status updates
- Service registry updates

## Error Handling & Fallback

### Circuit Breaker Pattern
- Automatic detection of service failures
- Graceful fallback to cached responses
- Automatic recovery when services become healthy

### Fallback Mechanisms
- Cached responses for read operations
- Graceful error messages for write operations
- Service-specific fallback strategies

### Health Monitoring
- Continuous health checks (every 30 seconds)
- Automatic service deregistration on failure
- Alerting and logging

## Performance Optimization

### Caching Strategy
- Redis-based response caching
- 5-minute cache TTL for most responses
- Intelligent cache invalidation

### Load Balancing
- Round-robin request distribution
- Health-based instance selection
- Automatic failover

### Rate Limiting
- 100 requests per 15 minutes per IP
- Redis-backed rate limiting
- Graceful 429 responses

## Backward Compatibility

### Legacy Endpoints
- `/api/legacy/auth/login` - Legacy auth endpoint
- `/api/legacy/media/upload` - Legacy media upload

### API Versioning
- Versioned API endpoints
- Graceful degradation
- Progressive enhancement

## Monitoring & Logging

### Health Endpoints
- `/api/health` - Gateway health
- `/api/services` - Service discovery status
- `/api/services/:serviceName` - Individual service health

### Logging
- Comprehensive request logging
- Error logging with stack traces
- Service-specific logging

## Deployment

### Environment Variables
```env
# Service URLs
USER_SERVICE_URL=http://localhost:3004
EVENT_SERVICE_URL=http://localhost:3005
MEDIA_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3006

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# API Gateway
API_GATEWAY_PORT=3001
```

### Production Deployment
- Use PM2 for process management
- Configure proper logging
- Set up monitoring and alerts
- Implement proper security measures

## Testing

### Test Coverage
- Service discovery tests
- Service communication tests
- Individual service tests
- API gateway tests
- Error handling tests
- Load balancing tests
- Circuit breaker tests
- Performance tests

### Running Tests
```bash
node microservices/test-microservices.js
```

## Architecture Benefits

1. **Scalability** - Independent scaling of services
2. **Resilience** - Service isolation prevents cascading failures
3. **Maintainability** - Clear service boundaries
4. **Performance** - Optimized caching and load balancing
5. **Flexibility** - Easy to add new services
6. **Backward Compatibility** - Supports legacy systems

## Future Enhancements

1. **Containerization** - Docker support for easy deployment
2. **Kubernetes** - Orchestration for production
3. **Service Mesh** - Advanced service-to-service communication
4. **Distributed Tracing** - End-to-end request tracing
5. **Advanced Monitoring** - Prometheus and Grafana integration
6. **Auto-scaling** - Dynamic scaling based on load