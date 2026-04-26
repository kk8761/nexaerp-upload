# Session Management

This document describes the Redis-based session management system implemented for NexaERP.

**Validates: Requirements 5.8** - "THE System SHALL manage user sessions with automatic timeout and token refresh"

## Overview

The session management system provides:
- Redis-based session storage for high performance
- Automatic session timeout (configurable)
- Concurrent session limits per user (configurable)
- Session revocation capabilities (manual logout, admin revocation)
- Session metadata tracking (IP address, user agent, login time, last activity)
- Session management APIs for listing and revoking sessions

## Architecture

### Components

1. **SessionManager Service** (`server/services/sessionManager.js`)
   - Core session management logic
   - Redis integration
   - Session CRUD operations
   - Concurrent session limit enforcement
   - Automatic cleanup

2. **Auth Middleware** (`server/middleware/auth.js`)
   - Session validation on protected routes
   - Token and session verification
   - Automatic activity timestamp updates

3. **Session Routes** (`server/routes/sessions.js`)
   - User session management APIs
   - Admin session management APIs

4. **Auth Routes** (`server/routes/auth.js`)
   - Session creation on login
   - Session revocation on logout

## Configuration

Add the following environment variables to your `.env` file:

```env
# Redis connection
REDIS_URL=redis://localhost:6379

# Session configuration
SESSION_TIMEOUT_MINUTES=60        # Session timeout in minutes (default: 60)
MAX_CONCURRENT_SESSIONS=5         # Maximum concurrent sessions per user (default: 5)
```

## Session Flow

### Login Flow

1. User submits credentials to `/api/auth/login`
2. Server validates credentials
3. Server generates JWT token
4. Server creates session in Redis with metadata:
   - User ID
   - JWT token
   - IP address
   - User agent
   - Login timestamp
   - Last activity timestamp
5. Server returns token and session ID to client
6. Client stores both token and session ID

### Request Flow

1. Client sends request with:
   - `Authorization: Bearer <token>` header
   - `X-Session-Id: <sessionId>` header
2. Auth middleware validates:
   - JWT token signature and expiration
   - Session existence in Redis
   - Token matches session token
3. Middleware updates last activity timestamp
4. Request proceeds to route handler

### Logout Flow

1. Client sends logout request to `/api/auth/logout` or `/api/sessions/logout`
2. Server revokes session from Redis
3. Server removes session from user's session list
4. Client clears stored token and session ID

## API Endpoints

### User Endpoints

#### Get Active Sessions
```http
GET /api/sessions
Authorization: Bearer <token>
X-Session-Id: <sessionId>
```

Response:
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "user123_1234567890_abc123",
      "userId": "user123",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "loginTime": "2024-01-15T10:30:00.000Z",
      "lastActivity": "2024-01-15T11:45:00.000Z",
      "isCurrent": true
    }
  ],
  "count": 1
}
```

#### Revoke Specific Session
```http
DELETE /api/sessions/:sessionId
Authorization: Bearer <token>
X-Session-Id: <sessionId>
```

Response:
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

#### Revoke All Other Sessions
```http
DELETE /api/sessions
Authorization: Bearer <token>
X-Session-Id: <sessionId>
```

Response:
```json
{
  "success": true,
  "message": "Revoked 3 session(s)",
  "revokedCount": 3
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
X-Session-Id: <sessionId>
```

Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Admin Endpoints

#### Get Session Statistics
```http
GET /api/sessions/stats
Authorization: Bearer <token>
X-Session-Id: <sessionId>
```

Response:
```json
{
  "success": true,
  "stats": {
    "totalActiveSessions": 42,
    "totalUsersWithSessions": 15,
    "sessionTimeout": 3600,
    "maxConcurrentSessions": 5
  }
}
```

#### Revoke All User Sessions (Admin)
```http
DELETE /api/sessions/admin/:userId
Authorization: Bearer <token>
X-Session-Id: <sessionId>
```

Response:
```json
{
  "success": true,
  "message": "Revoked 4 session(s) for user user123",
  "revokedCount": 4
}
```

## Client Integration

### Login
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, sessionId, user } = await response.json();

// Store both token and session ID
localStorage.setItem('token', token);
localStorage.setItem('sessionId', sessionId);
```

### Authenticated Requests
```javascript
const token = localStorage.getItem('token');
const sessionId = localStorage.getItem('sessionId');

const response = await fetch('/api/protected-route', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Session-Id': sessionId
  }
});
```

### Logout
```javascript
const token = localStorage.getItem('token');
const sessionId = localStorage.getItem('sessionId');

await fetch('/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Session-Id': sessionId
  }
});

localStorage.removeItem('token');
localStorage.removeItem('sessionId');
```

## Features

### Automatic Session Timeout

Sessions automatically expire after the configured timeout period (default: 60 minutes). The timeout is reset on each authenticated request, providing a sliding window of inactivity.

### Concurrent Session Limits

Users are limited to a maximum number of concurrent sessions (default: 5). When this limit is exceeded, the oldest sessions are automatically revoked.

### Session Revocation

Sessions can be revoked in several ways:
- User logout (revokes current session)
- User revokes specific session (e.g., "logout from mobile device")
- User revokes all other sessions (e.g., "logout from all other devices")
- Admin revokes all user sessions (e.g., security incident)

### Session Metadata

Each session stores:
- User ID
- JWT token
- IP address
- User agent
- Login timestamp
- Last activity timestamp

This metadata enables:
- Session identification ("Chrome on Windows")
- Security auditing
- Suspicious activity detection

### Automatic Cleanup

A cron job runs hourly to clean up expired session references from user session lists. Redis automatically handles session data expiration via TTL.

## Security Considerations

1. **Token Storage**: Sessions store the JWT token for validation. Ensure Redis is properly secured.

2. **Session ID**: The session ID should be treated as sensitive. Use HTTPS to prevent interception.

3. **IP Address Tracking**: Session IP addresses can be used to detect suspicious activity (e.g., session used from different locations).

4. **Concurrent Session Limits**: Prevents session hijacking by limiting the number of active sessions.

5. **Automatic Timeout**: Reduces the window of opportunity for session hijacking.

## Monitoring

Monitor the following metrics:
- Total active sessions
- Sessions per user
- Session creation rate
- Session revocation rate
- Expired sessions cleaned up

Use the `/api/sessions/stats` endpoint (admin only) to retrieve current statistics.

## Troubleshooting

### Redis Connection Issues

If Redis is unavailable:
- Sessions will not be created/validated
- Users will receive "Session expired or invalid" errors
- Check Redis connection with: `redis-cli ping`

### Session Not Found

If a valid session is not found:
- Session may have expired (check `SESSION_TIMEOUT_MINUTES`)
- Session may have been revoked
- Redis may have been restarted (sessions are not persisted)

### Too Many Sessions

If users hit the concurrent session limit:
- Increase `MAX_CONCURRENT_SESSIONS`
- Or have users revoke old sessions via `/api/sessions`

## Testing

Run the session management tests:

```bash
npm test -- sessionManager.test.js
```

The test suite covers:
- Session creation
- Session retrieval
- Session validation
- Session revocation
- Concurrent session limits
- Session cleanup
- Session statistics

## Future Enhancements

Potential improvements:
- Session persistence (Redis persistence configuration)
- Suspicious activity detection (IP/location changes)
- Session refresh tokens
- Device fingerprinting
- Session activity logs
- WebSocket integration for real-time session updates
