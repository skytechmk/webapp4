# Hack Backend Services for Snapify

This directory contains type-safe backend services built with Hack (HHVM) for the Snapify application, providing enterprise-grade APIs for event management, user authentication, and analytics.

## Architecture Overview

The Hack services are designed as microservices that run alongside the existing Node.js/TypeScript stack:

- **Event Management Service** (Port 8081): Type-safe CRUD operations for events
- **User Authentication Service** (Port 8082): Secure user registration, login, and token validation
- **Analytics Service** (Port 8083): Event analytics and user behavior tracking

## Directory Structure

```
hack/
├── hhvm-config/           # HHVM configuration files
│   └── server.ini         # HHVM server configuration
├── services/              # Individual Hack microservices
│   ├── event-management/  # Event CRUD operations
│   ├── user-auth/         # User authentication & authorization
│   └── analytics/         # Event analytics & reporting
├── shared/                # Shared utilities and types
│   ├── types/            # Common type definitions
│   └── utils/            # Shared utilities (error handling, async)
├── docker/               # Docker configuration
│   ├── Dockerfile        # HHVM container setup
│   └── docker-compose.yml # Multi-service orchestration
├── test_hack_services.js # Comprehensive test suite
└── README.md             # This file
```

## Key Features

### Type Safety
- Compile-time type checking prevents runtime errors
- Strongly typed APIs with guaranteed data integrity
- Type-safe async operations and error handling

### Performance
- HHVM's JIT compilation for near-native performance
- Optimized memory management
- Efficient database operations with prepared statements

### Reliability
- Comprehensive error handling with custom exception types
- Circuit breaker patterns for fault tolerance
- Graceful fallback to Node.js services when Hack services are unavailable

### Scalability
- Microservices architecture for independent scaling
- Async operations with concurrency control
- Caching layers for performance optimization

## Getting Started

### Prerequisites
- HHVM 4.0+
- Docker & Docker Compose
- Node.js (for integration testing)

### Running the Services

1. **Using Docker Compose** (Recommended):
   ```bash
   cd hack
   docker-compose up --build
   ```

2. **Manual Setup**:
   ```bash
   # Install HHVM
   # Configure HHVM with hhvm-config/server.ini
   # Start each service
   hhvm -c hhvm-config/server.ini services/event-management/index.php
   hhvm -c hhvm-config/server.ini services/user-auth/index.php
   hhvm -c hhvm-config/server.ini services/analytics/index.php
   ```

### Environment Variables

Set these environment variables for each service:

```bash
# Database paths
DATABASE_URL=sqlite:///var/www/snapify/hack/services/*/data/*.db

# JWT configuration (for auth service)
JWT_SECRET=your-super-secret-jwt-key

# Node.js service URLs (for integration)
NODEJS_SERVICE_URL=http://localhost:3000
```

### Testing

Run the comprehensive test suite:

```bash
cd hack
node test_hack_services.js
```

## API Endpoints

### Event Management Service (Port 8081)

- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event by ID
- `GET /api/events` - List events with filtering
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### User Authentication Service (Port 8082)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/validate` - Validate JWT token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/users/:id` - Get user by ID

### Analytics Service (Port 8083)

- `GET /api/analytics/events` - Get event analytics
- `GET /api/analytics/users` - Get user analytics
- `POST /api/analytics/views` - Record event view

## Integration with Node.js

The Hack services integrate seamlessly with the existing Node.js application through REST APIs with automatic fallback:

```javascript
// Example usage in Node.js
import { api } from './services/api';

// Use Hack services with fallback to Node.js
const event = await api.hackCreateEvent(eventData);
const analytics = await api.hackGetEventAnalytics(eventId);
const user = await api.hackGetUser(userId);
```

## Development

### Adding New Services

1. Create service directory under `services/`
2. Implement types, repositories, services, and controllers
3. Add routing in `index.php`
4. Update Docker configuration
5. Add tests and integration points

### Best Practices

- Use strict mode (`<?hh // strict`) for all Hack files
- Implement comprehensive error handling
- Use async/await for all I/O operations
- Follow the repository-service-controller pattern
- Add type annotations for all function parameters and return types

## Monitoring & Debugging

- Health check endpoints: `GET /health` on each service
- HHVM logs: `/var/log/hhvm/`
- Use `hh_client` for type checking during development
- Enable XDebug for step-through debugging

## Production Deployment

1. Configure production HHVM settings
2. Set up proper logging and monitoring
3. Configure load balancing across service instances
4. Set up database backups and replication
5. Implement proper secrets management

## Troubleshooting

### Common Issues

- **HHVM not starting**: Check `server.ini` configuration
- **Database connection errors**: Verify SQLite file permissions
- **Type errors**: Run `hh_client` to check for type issues
- **Service unavailable**: Check Docker container logs

### Performance Tuning

- Adjust HHVM JIT settings for production
- Configure appropriate memory limits
- Set up connection pooling for databases
- Implement proper caching strategies

## Contributing

1. Follow the established patterns and type safety requirements
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure backward compatibility with existing Node.js integration

## License

This project follows the same license as the main Snapify application.