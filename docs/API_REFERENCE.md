# Snapify API Reference Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [API Base URL](#api-base-url)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
   - [User Management](#user-management)
   - [Authentication](#authentication-1)
   - [Event Management](#event-management)
   - [Media Management](#media-management)
   - [Guestbook & Comments](#guestbook--comments)
   - [AI Services](#ai-services)
   - [System Management](#system-management)
   - [Support & Feedback](#support--feedback)
5. [WebSocket API](#websocket-api)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [API Versioning](#api-versioning)
9. [Code Examples](#code-examples)
10. [Interactive API Testing](#interactive-api-testing)

## Introduction

Welcome to the Snapify API Reference Documentation. This comprehensive guide provides detailed information about all available API endpoints, authentication methods, error handling, and best practices for integrating with the Snapify platform.

Snapify is a real-time event sharing platform that enables users to capture, share, and manage event memories with AI-enhanced organization and real-time sharing capabilities.

## API Base URL

The base URL for all API requests is:

```
https://api.snapify.com/v1
```

For development environments, you may use:

```
http://localhost:3001/api
```

## Authentication

### JWT Authentication

Snapify uses JSON Web Tokens (JWT) for authentication. All authenticated requests must include the Authorization header:

```http
Authorization: Bearer {your_jwt_token}
```

### Token Management

- **Token Expiration**: 24 hours
- **Token Refresh**: Use the `/api/auth/refresh` endpoint
- **Token Storage**: Store tokens securely in HTTP-only cookies or secure storage

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-123456789",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Google Login
```http
POST /api/auth/google
Content-Type: application/json

{
  "credential": "google_id_token"
}
```

#### Token Validation
```http
POST /api/auth/validate
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Token Refresh
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "token": "expired_or_expiring_token"
}
```

## API Endpoints

### User Management

#### Get All Users
```http
GET /api/users
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "user-123456789",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### Get User by ID
```http
GET /api/users/{userId}
Authorization: Bearer {token}
```

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "name": "New User",
  "role": "user"
}
```

#### Update User
```http
PUT /api/users/{userId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### Delete User
```http
DELETE /api/users/{userId}
Authorization: Bearer {token}
```

#### Upgrade User Tier
```http
PUT /api/users/{userId}/upgrade
Content-Type: application/json
Authorization: Bearer {token}

{
  "tier": "premium"
}
```

### Event Management

#### Get All Events
```http
GET /api/events
Authorization: Bearer {token}
```

#### Get Event by ID
```http
GET /api/events/{eventId}
```

#### Create Event
```http
POST /api/events
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Summer Party",
  "hostId": "user-123456789",
  "date": "2023-12-25",
  "description": "Annual summer celebration",
  "location": "Beach Club",
  "pin": "1234",
  "isPublic": true
}
```

#### Update Event
```http
PUT /api/events/{eventId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Updated Event Title",
  "description": "Updated event description"
}
```

#### Delete Event
```http
DELETE /api/events/{eventId}
Authorization: Bearer {token}
```

#### Validate Event PIN
```http
POST /api/events/{eventId}/validate-pin
Content-Type: application/json

{
  "pin": "1234"
}
```

#### Get Events by Host
```http
GET /api/events/host/{hostId}
Authorization: Bearer {token}
```

### Media Management

#### Upload Media
```http
POST /api/media
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- file: (binary file data)
- eventId: "event-123456789"
- metadata: '{"caption": "Party photo", "uploaderName": "John Doe"}'
```

#### Get Media by ID
```http
GET /api/media/{mediaId}
Authorization: Bearer {token}
```

#### Get Media by Event
```http
GET /api/media/event/{eventId}
Authorization: Bearer {token}
```

#### Delete Media
```http
DELETE /api/media/{mediaId}
Authorization: Bearer {token}
```

#### Bulk Delete Media
```http
POST /api/media/bulk-delete
Content-Type: application/json
Authorization: Bearer {token}

{
  "mediaIds": ["media-1", "media-2", "media-3"]
}
```

#### Like Media
```http
PUT /api/media/{mediaId}/like
Authorization: Bearer {token}
```

### Guestbook & Comments

#### Add Guestbook Entry
```http
POST /api/guestbook
Content-Type: application/json

{
  "eventId": "event-123456789",
  "senderName": "John Doe",
  "message": "Great event!"
}
```

#### Add Comment
```http
POST /api/comments
Content-Type: application/json

{
  "mediaId": "media-123456789",
  "text": "Nice photo!",
  "userId": "user-123456789"
}
```

### AI Services

#### Generate Image Caption
```http
POST /api/ai/generate-caption
Content-Type: application/json
Authorization: Bearer {token}

{
  "imageData": "base64_encoded_image_data"
}
```

#### Generate Event Description
```http
POST /api/ai/generate-event-description
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Summer Party",
  "date": "2023-12-25",
  "type": "social"
}
```

#### Generate Guest Reviews
```http
POST /api/ai/generate-guest-reviews
Content-Type: application/json
Authorization: Bearer {token}

{
  "country": "USA",
  "language": "English",
  "count": 6
}
```

### System Management

#### Get System Storage
```http
GET /api/system/storage
Authorization: Bearer {token}
```

#### Clean MinIO Bucket
```http
POST /api/system/clean-bucket
Authorization: Bearer {token}
```

#### Clear Users Database
```http
POST /api/system/clear-users
Authorization: Bearer {token}
```

### Support & Feedback

#### Get Support Messages
```http
GET /api/support/messages
Authorization: Bearer {token}
```

#### Send Admin Reply
```http
POST /api/support/admin-reply
Content-Type: application/json
Authorization: Bearer {token}

{
  "userId": "user-123456789",
  "message": "Thank you for your feedback!"
}
```

#### Mark Message as Read
```http
PUT /api/support/messages/{messageId}/read
Authorization: Bearer {token}
```

#### Submit Feedback
```http
POST /api/feedback
Content-Type: application/json
Authorization: Bearer {token}

{
  "userId": "user-123456789",
  "rating": 5,
  "comments": "Great platform!",
  "category": "general",
  "source": "landing-page",
  "version": "1.0.0"
}
```

#### Get All Feedback
```http
GET /api/feedback
Authorization: Bearer {token}
```

#### Update Feedback Status
```http
PUT /api/feedback/{feedbackId}/status
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "resolved"
}
```

## WebSocket API

Snapify provides real-time WebSocket connectivity for event updates and notifications.

### WebSocket Connection

```javascript
const socket = io('wss://api.snapify.com', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

### Authentication

```javascript
socket.emit('authenticate', 'your_jwt_token');
```

### Event Subscription

```javascript
// Join an event room
socket.emit('join_event', 'event-123456789');

// Leave an event room
socket.emit('leave_event');
```

### Real-time Events

#### Media Events
- `media_uploaded`: New media uploaded to event
- `media_processed`: Media processing completed
- `new_like`: Media received a new like
- `new_comment`: New comment added to media

#### Guestbook Events
- `new_message`: New guestbook message
- `guestbook_updated`: Guestbook updated

#### System Events
- `user_updated`: User profile updated
- `admin_status_update`: Admin status update
- `force_client_reload`: Force all clients to reload

### Event Handling

```javascript
// Media uploaded event
socket.on('media_uploaded', (mediaItem) => {
  console.log('New media uploaded:', mediaItem);
});

// Like event
socket.on('new_like', (data) => {
  console.log('Media liked:', data);
});

// Error handling
socket.on('connect_error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Error Handling

### HTTP Status Codes

| Status Code | Description | Example Response |
|-------------|-------------|-------------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error",
    "suggestion": "How to fix the error"
  }
}
```

### Common Error Types

- **Authentication Errors**: Invalid credentials, expired tokens
- **Validation Errors**: Missing required fields, invalid data formats
- **Authorization Errors**: Insufficient permissions
- **Rate Limit Errors**: Too many requests in a short period
- **Service Errors**: Service unavailable or degraded

## Rate Limiting

### Rate Limit Policy

- **Standard Users**: 100 requests per 15 minutes
- **Premium Users**: 500 requests per 15 minutes
- **Admin Users**: 1000 requests per 15 minutes

### Rate Limit Headers

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (UTC timestamp)

### Rate Limit Response

```json
{
  "error": "Too many requests",
  "retryAfter": 900,
  "limit": 100,
  "remaining": 0
}
```

## API Versioning

### Versioning Strategy

Snapify uses semantic versioning for its API:

- **Major Version**: Breaking changes (v1, v2, etc.)
- **Minor Version**: Backward-compatible features
- **Patch Version**: Bug fixes and minor improvements

### Versioning in URLs

```
https://api.snapify.com/v1/endpoint
```

### Deprecation Policy

- **Deprecation Notice**: 6 months before removal
- **Backward Compatibility**: Maintained for 12 months
- **Migration Guides**: Provided for major version changes

## Code Examples

### JavaScript Example

```javascript
const API_URL = 'https://api.snapify.com/v1';
const token = 'your_jwt_token';

async function getUserEvents() {
  const response = await fetch(`${API_URL}/api/events`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}

// Usage
getUserEvents()
  .then(events => console.log('User events:', events))
  .catch(error => console.error('Error:', error));
```

### Python Example

```python
import requests

API_URL = "https://api.snapify.com/v1"
TOKEN = "your_jwt_token"

def get_user_events():
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }

    response = requests.get(f"{API_URL}/api/events", headers=headers)

    if response.status_code != 200:
        raise Exception(f"API request failed: {response.status_code}")

    return response.json()

# Usage
try:
    events = get_user_events()
    print("User events:", events)
except Exception as e:
    print("Error:", str(e))
```

### cURL Example

```bash
# Get user events
curl -X GET "https://api.snapify.com/v1/api/events" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json"

# Upload media
curl -X POST "https://api.snapify.com/v1/api/media" \
  -H "Authorization: Bearer your_jwt_token" \
  -F "file=@/path/to/photo.jpg" \
  -F "eventId=event-123456789" \
  -F "metadata={\"caption\":\"Party photo\",\"uploaderName\":\"John Doe\"}"
```

## Interactive API Testing

### Postman Collection

Import our [Postman Collection](https://api.snapify.com/postman/snapify-api.postman_collection.json) to test all endpoints interactively.

### Swagger UI

Access our interactive API documentation at:

```
https://api.snapify.com/docs
```

### API Sandbox

Test our API in a safe sandbox environment:

```
https://sandbox.snapify.com/api
```

### Testing Best Practices

1. **Use Test Tokens**: Always use test authentication tokens
2. **Rate Limit Awareness**: Be mindful of rate limits
3. **Error Handling**: Test both success and error scenarios
4. **Data Validation**: Validate all input and output data
5. **Cleanup**: Remove test data after testing

## Best Practices

### Request Guidelines

- **Use HTTPS**: Always use secure connections
- **Authentication**: Include proper authentication headers
- **Content-Type**: Specify appropriate content types
- **Pagination**: Use pagination for large datasets
- **Caching**: Respect cache headers and implement client-side caching

### Response Handling

- **Error Handling**: Implement comprehensive error handling
- **Retry Logic**: Implement exponential backoff for failed requests
- **Data Validation**: Validate all API responses
- **Rate Limiting**: Handle rate limit responses gracefully
- **Logging**: Log API requests and responses for debugging

### Security

- **Token Storage**: Store tokens securely
- **Input Validation**: Validate all user inputs
- **HTTPS**: Always use encrypted connections
- **CORS**: Implement proper CORS policies
- **Rate Limiting**: Respect API rate limits

## Support

For API-related questions or issues, contact our developer support:

- **Email**: api-support@snapify.com
- **Documentation**: https://docs.snapify.com/api
- **Status Page**: https://status.snapify.com
- **Community Forum**: https://community.snapify.com

## Changelog

### v1.0.0 (Current)
- Initial API release
- Core user, event, and media management
- Real-time WebSocket support
- AI-powered features

### v1.1.0 (Planned)
- Enhanced analytics endpoints
- Advanced search capabilities
- Webhook support
- GraphQL API (beta)

## Appendix

### Data Types

| Type | Description |
|------|-------------|
| User | User account information |
| Event | Event details and metadata |
| MediaItem | Media file with metadata |
| Comment | User comment on media |
| GuestbookEntry | Guestbook message |

### Response Formats

All successful API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Pagination

For paginated endpoints:

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

This comprehensive API reference provides everything you need to integrate with the Snapify platform effectively. For the latest updates and additional resources, always refer to our official documentation portal.