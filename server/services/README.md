# Services

This directory contains core business logic services for NexaERP.

## Session Manager

The Session Manager service provides Redis-based session management with automatic timeout, concurrent session limits, and revocation capabilities.

### Quick Start

```javascript
const { getSessionManager } = require('./services/sessionManager');

const sessionManager = getSessionManager();

// Create a session
const sessionId = await sessionManager.createSession(userId, token, {
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});

// Validate a session
const session = await sessionManager.validateSession(sessionId, token);

// Revoke a session
await sessionManager.revokeSession(sessionId);
```

### Configuration

Set these environment variables:

```env
REDIS_URL=redis://localhost:6379
SESSION_TIMEOUT_MINUTES=60
MAX_CONCURRENT_SESSIONS=5
```

### Features

- **Automatic Timeout**: Sessions expire after configured inactivity period
- **Concurrent Limits**: Enforces maximum sessions per user
- **Session Revocation**: Manual logout and admin revocation
- **Activity Tracking**: Updates last activity on each request
- **Metadata Storage**: IP address, user agent, timestamps

### API Reference

See [SESSION_MANAGEMENT.md](../SESSION_MANAGEMENT.md) for complete documentation.

### Testing

```bash
npm test -- sessionManager.test.js
```

### Example

Run the example script:

```bash
node server/examples/sessionManagementExample.js
```
