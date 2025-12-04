# Snapify Microservices Architecture Design

## Current Architecture Analysis

The current Snapify application has a monolithic architecture with some microservices components partially implemented:

### Current Components:
- **Monolithic Server**: `server/index.js` with Express.js
- **API Gateway**: `services/api-gateway/index.js` (partially implemented)
- **Auth Service**: `services/auth-service/index.js` (mock implementation)
- **Media Service**: `services/media-service/index.js` (mock implementation)
- **Service Communication**: `services/service-communication/index.js` (REST + WebSocket)
- **Service Discovery**: `services/service-discovery/index.js` (Redis-based)

### Key Issues:
1. **Tight Coupling**: All services run within the same process
2. **Single Point of Failure**: No true service isolation
3. **Mock Implementations**: Services don't have real database connections
4. **No Service Discovery**: Services are hardcoded in environment variables
5. **Limited Error Handling**: Basic circuit breaker patterns exist but not fully implemented

## Target Microservices Architecture

### Service Boundaries:

1. **User Service** (New)
   - User management (CRUD)
   - Authentication & Authorization
   - User profiles & preferences
   - Role-based access control

2. **Event Service** (New)
   - Event creation & management
   - Event metadata & settings
   - Event access control (PIN validation)
   - Event statistics

3. **Media Service** (Enhanced)
   - Media upload & processing
   - Media storage & retrieval
   - Media metadata management
   - Media privacy & access control

4. **Notification Service** (New)
   - Real-time notifications
   - Email & push notifications
   - Notification preferences
   - Notification history

### Architecture Components:

1. **API Gateway** (Enhanced)
   - Request routing & load balancing
   - Authentication & authorization
   - Rate limiting & caching
   - Request/response transformation

2. **Service Discovery**
   - Dynamic service registration
   - Health monitoring
   - Load balancing
   - Circuit breaking

3. **Service Communication**
   - REST API communication
   - WebSocket communication
   - Event-driven messaging
   - Error handling & retries

## Implementation Plan

### Phase 1: Service Implementation
1. **Create User Service** - Extract user-related functionality
2. **Create Event Service** - Extract event-related functionality
3. **Enhance Media Service** - Complete media service implementation
4. **Create Notification Service** - Implement notification system

### Phase 2: Infrastructure
1. **Enhance API Gateway** - Complete routing and load balancing
2. **Implement Service Discovery** - Dynamic registration and health checks
3. **Set up Service Communication** - REST + WebSocket + Events

### Phase 3: Resilience
1. **Error Handling** - Comprehensive error handling
2. **Fallback Mechanisms** - Graceful degradation
3. **Circuit Breakers** - Service failure protection

## Service Contracts

### User Service API
- `POST /users` - Create user
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `POST /auth/login` - User login
- `POST /auth/google` - Google login
- `POST /auth/validate` - Token validation
- `POST /auth/refresh` - Token refresh

### Event Service API
- `POST /events` - Create event
- `GET /events/:id` - Get event by ID
- `PUT /events/:id` - Update event
- `DELETE /events/:id` - Delete event
- `POST /events/:id/validate-pin` - Validate event PIN
- `GET /events` - List all events

### Media Service API
- `POST /media` - Upload media
- `GET /media/:id` - Get media by ID
- `DELETE /media/:id` - Delete media
- `GET /media/event/:eventId` - Get media by event
- `POST /media/bulk-delete` - Bulk delete media

### Notification Service API
- `POST /notifications` - Create notification
- `GET /notifications/user/:userId` - Get user notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `POST /notifications/email` - Send email notification
- `POST /notifications/push` - Send push notification

## Technology Stack

- **Language**: Node.js/TypeScript
- **Framework**: Express.js
- **Database**: SQLite (per service) with potential PostgreSQL migration
- **Caching**: Redis
- **Messaging**: WebSocket + Redis Pub/Sub
- **Service Discovery**: Redis-based with health checks
- **Load Balancing**: Round-robin with health-based routing
- **Monitoring**: Built-in logging with health endpoints

## Deployment Strategy

1. **Development**: Run all services locally with different ports
2. **Staging**: Containerize services (though Docker is excluded per requirements)
3. **Production**: Deploy as separate processes with PM2
4. **Monitoring**: Health endpoints + logging

## Backward Compatibility

- Maintain existing API endpoints through gateway
- Implement progressive migration
- Support both old and new authentication methods
- Provide fallback mechanisms for service failures