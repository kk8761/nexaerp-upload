# Enterprise Authentication System

## Overview

This document describes the comprehensive enterprise authentication system implemented for NexaERP, including SSO integration, Multi-Factor Authentication (MFA), and session management.

## Features Implemented

### 1. Authentication Module with SSO Support (Task 5.1)

#### Local Authentication
- **Passport.js Local Strategy**: Username/password authentication with bcrypt password hashing
- **Remember-Me Functionality**: Extended session duration (30 days) when enabled
- **Session-Based Authentication**: Redis-backed sessions for scalability

#### Single Sign-On (SSO)
- **Google OAuth 2.0**: Integration with Google accounts
- **Microsoft OAuth 2.0**: Integration with Microsoft/Azure AD accounts
- **Auto-Provisioning**: Automatic user creation for new SSO users
- **Last Login Tracking**: Updates user's last login timestamp

#### API Endpoints
```
POST   /api/auth/login              - Local authentication with remember-me
POST   /api/auth/logout             - Logout and session cleanup
GET    /api/auth/me                 - Get current user info
GET    /api/auth/google             - Initiate Google SSO
GET    /api/auth/google/callback    - Google SSO callback
GET    /api/auth/microsoft          - Initiate Microsoft SSO
GET    /api/auth/microsoft/callback - Microsoft SSO callback
```

### 2. Multi-Factor Authentication (Task 5.2)

#### TOTP (Time-based One-Time Password)
- **Authenticator App Support**: Google Authenticator, Authy, Microsoft Authenticator
- **QR Code Generation**: Easy setup with QR code scanning
- **Manual Secret Entry**: Alternative setup method
- **Backup Codes**: 10 backup codes generated for account recovery

#### SMS Verification
- **Twilio Integration**: SMS delivery via Twilio API
- **6-Digit Codes**: Time-limited verification codes (5 minutes)
- **Redis Storage**: Temporary code storage with automatic expiry

#### Email Verification
- **SMTP Integration**: Email delivery via configured SMTP server
- **6-Digit Codes**: Time-limited verification codes (5 minutes)
- **HTML Email Templates**: Professional email formatting

#### MFA Enrollment Pages
- **Interactive Setup**: `/mfa/setup` - Choose and configure MFA method
- **Method Selection**: TOTP, SMS, or Email verification
- **Step-by-Step Wizard**: Guided setup process

#### API Endpoints
```
GET    /api/auth/mfa/setup          - Generate TOTP secret and QR code
POST   /api/auth/mfa/confirm        - Confirm and enable MFA
POST   /api/auth/mfa/verify         - Verify MFA token during login
POST   /api/auth/mfa/disable        - Disable MFA (requires password)
POST   /api/auth/mfa/sms/send       - Send SMS verification code
POST   /api/auth/mfa/sms/verify     - Verify SMS code
POST   /api/auth/mfa/email/send     - Send email verification code
POST   /api/auth/mfa/email/verify   - Verify email code
```

### 3. Session Management (Task 5.3)

#### Redis Session Store
- **Persistent Sessions**: Sessions stored in Redis for scalability
- **Automatic Timeout**: 7-day default session expiration
- **Activity-Based Renewal**: Rolling sessions extend on each request
- **Remember-Me Extension**: 30-day sessions when enabled

#### Session Tracking
- **Database Records**: Session metadata stored in PostgreSQL
- **IP Address Tracking**: Record IP address for each session
- **User Agent Tracking**: Record browser/device information
- **Last Activity Timestamp**: Track session activity

#### Concurrent Session Limits
- **Maximum 5 Sessions**: Automatic revocation of oldest sessions
- **Per-User Enforcement**: Limits applied per user account
- **Configurable Limits**: Easy to adjust in code

#### Session Revocation
- **Individual Revocation**: Revoke specific sessions
- **Bulk Revocation**: Revoke all other sessions except current
- **Automatic Cleanup**: Hourly cron job removes expired sessions

#### Session Management Page
- **Active Sessions View**: `/sessions` - View all active sessions
- **Device Information**: Display browser and device details
- **Session Actions**: Revoke individual or all other sessions
- **Current Session Indicator**: Highlight the current session

#### API Endpoints
```
GET    /api/auth/sessions           - Get all active sessions
DELETE /api/auth/sessions/:token    - Revoke specific session
POST   /api/auth/sessions/revoke-all - Revoke all other sessions
```

## Database Schema

### MFA Table
```prisma
model MFA {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  type            String   // totp, sms, email
  secret          String?  // For TOTP
  phoneNumber     String?  // For SMS
  emailAddress    String?  // For Email
  enabled         Boolean  @default(false)
  backupCodes     String[] // Array of backup codes
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Session Table
```prisma
model Session {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  sessionToken    String   @unique
  ipAddress       String?
  userAgent       String?
  expiresAt       DateTime
  lastActivity    DateTime @default(now())
  createdAt       DateTime @default(now())
}
```

## Configuration

### Environment Variables

```env
# Session Configuration
COOKIE_SECRET=your-secret-key-here
SESSION_TIMEOUT=604800000  # 7 days in milliseconds

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@nexaerp.com

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

## Security Features

### Password Security
- **bcrypt Hashing**: Industry-standard password hashing
- **Salt Rounds**: Configurable salt rounds (default: 10)
- **No Plain Text**: Passwords never stored in plain text

### Session Security
- **HTTP-Only Cookies**: Prevent XSS attacks
- **Secure Cookies**: HTTPS-only in production
- **SameSite Protection**: CSRF protection
- **Session Rotation**: New session ID after authentication

### MFA Security
- **Time-Window Validation**: TOTP tokens valid for 30-second window
- **Code Expiry**: SMS/Email codes expire after 5 minutes
- **One-Time Use**: Codes deleted after successful verification
- **Backup Codes**: Single-use backup codes for recovery

### Rate Limiting
- **Authentication Endpoints**: 30 requests per 15 minutes
- **General Endpoints**: 500 requests per 15 minutes
- **IP-Based Limiting**: Per-IP address tracking

## Usage Examples

### Login with Remember-Me
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    rememberMe: true
  })
});
```

### Setup TOTP MFA
```javascript
// 1. Get QR code
const setup = await fetch('/api/auth/mfa/setup', {
  credentials: 'include'
});
const { qrCodeUrl, secret } = await setup.json();

// 2. Confirm with token from authenticator app
const confirm = await fetch('/api/auth/mfa/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ token: '123456' })
});
```

### Verify MFA During Login
```javascript
// After login returns requireMFA: true
const verify = await fetch('/api/auth/mfa/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ token: '123456' })
});
```

### Manage Sessions
```javascript
// Get all active sessions
const sessions = await fetch('/api/auth/sessions', {
  credentials: 'include'
});

// Revoke a specific session
await fetch(`/api/auth/sessions/${sessionToken}`, {
  method: 'DELETE',
  credentials: 'include'
});

// Revoke all other sessions
await fetch('/api/auth/sessions/revoke-all', {
  method: 'POST',
  credentials: 'include'
});
```

## Automated Maintenance

### Session Cleanup
- **Cron Schedule**: Runs every hour (0 * * * *)
- **Automatic Start**: Starts with server
- **Graceful Shutdown**: Stops on server shutdown
- **Manual Trigger**: `SessionCleanupService.runNow()`

## Testing

### Manual Testing
1. **Local Login**: Test username/password authentication
2. **Remember-Me**: Verify extended session duration
3. **Google SSO**: Test Google OAuth flow
4. **Microsoft SSO**: Test Microsoft OAuth flow
5. **TOTP Setup**: Scan QR code and verify token
6. **SMS MFA**: Send and verify SMS code
7. **Email MFA**: Send and verify email code
8. **Session Management**: View and revoke sessions
9. **Concurrent Sessions**: Test session limit enforcement
10. **Session Cleanup**: Verify expired sessions are removed

### Security Testing
- Test rate limiting on auth endpoints
- Verify session expiration
- Test MFA bypass attempts
- Verify backup code usage
- Test session revocation
- Verify CSRF protection

## Troubleshooting

### Common Issues

**MFA QR Code Not Displaying**
- Check that QRCode library is installed
- Verify secret generation is working
- Check browser console for errors

**SMS Not Sending**
- Verify Twilio credentials in .env
- Check Twilio account balance
- Verify phone number format (+1234567890)

**Email Not Sending**
- Verify SMTP credentials in .env
- Check SMTP server connectivity
- Verify email address format

**Sessions Not Persisting**
- Verify Redis is running
- Check Redis connection in logs
- Verify cookie settings (secure flag in production)

**SSO Not Working**
- Verify OAuth credentials in .env
- Check callback URL configuration
- Verify OAuth app is enabled

## Future Enhancements

- [ ] SAML 2.0 integration
- [ ] OAuth 2.0 generic provider support
- [ ] Hardware security key (WebAuthn) support
- [ ] Biometric authentication
- [ ] Risk-based authentication
- [ ] Geolocation-based access control
- [ ] Device fingerprinting
- [ ] Anomaly detection
- [ ] Session recording and playback
- [ ] Advanced audit logging

## References

- [Passport.js Documentation](http://www.passportjs.org/)
- [Speakeasy (TOTP) Documentation](https://github.com/speakeasyjs/speakeasy)
- [Twilio API Documentation](https://www.twilio.com/docs)
- [Redis Session Store](https://github.com/tj/connect-redis)
- [OAuth 2.0 Specification](https://oauth.net/2/)
