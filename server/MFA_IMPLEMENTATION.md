# Multi-Factor Authentication (MFA) Implementation

## Overview

This document describes the complete Multi-Factor Authentication (MFA) implementation for NexaERP, supporting TOTP (Time-based One-Time Password), SMS, and Email verification methods.

## Features Implemented

### ✅ TOTP Support (Authenticator Apps)
- QR code generation for easy setup
- Support for Google Authenticator, Authy, Microsoft Authenticator, etc.
- Secret key manual entry option
- Time-based token verification with 30-second window

### ✅ SMS Verification
- Integration with Twilio for SMS delivery
- 6-digit verification codes
- 5-minute code expiration
- Redis-based code storage

### ✅ Email Verification
- SMTP-based email delivery
- 6-digit verification codes
- 5-minute code expiration
- Redis-based code storage

### ✅ Backup Codes
- 10 backup codes generated on MFA enablement
- Single-use codes for account recovery
- Downloadable as text file
- Automatic removal after use

### ✅ MFA Management
- Enable/disable MFA with password confirmation
- View and download backup codes
- Change MFA method
- Session-based MFA verification

## Architecture

### Database Schema

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

### Service Layer

**MFAService** (`server/src/services/mfa.service.ts`)
- `generateSecret()` - Generate TOTP secret and QR code
- `verifyToken()` - Verify TOTP token
- `enableMFA()` - Enable MFA after verification
- `disableMFA()` - Disable MFA for user
- `generateBackupCodes()` - Generate backup codes
- `sendSMSCode()` - Send SMS verification code
- `verifySMSCode()` - Verify SMS code
- `sendEmailCode()` - Send email verification code
- `verifyEmailCode()` - Verify email code
- `verifyBackupCode()` - Verify and consume backup code

### Controller Layer

**AuthController** (`server/src/controllers/auth.controller.ts`)
- `login()` - Login with MFA check
- `verifyMFA()` - Verify MFA token during login
- `setupMFA()` - Generate MFA secret for enrollment
- `confirmMFA()` - Confirm and enable MFA
- `disableMFA()` - Disable MFA with password
- `getMFAStatus()` - Get current MFA status
- `sendSMSCode()` / `verifySMSCode()` - SMS verification
- `sendEmailCode()` / `verifyEmailCode()` - Email verification

### View Layer

**Pages** (`server/src/views/pages/`)
1. **mfa-setup.ejs** - MFA enrollment page
   - Method selection (TOTP, SMS, Email)
   - QR code display for TOTP
   - Token verification
   - Phone/email input for SMS/Email

2. **mfa-verify.ejs** - MFA verification during login
   - Token input with auto-submit
   - Backup code support
   - Clean, focused UI

3. **mfa-manage.ejs** - MFA management dashboard
   - View MFA status
   - Enable/disable MFA
   - View and download backup codes
   - Password confirmation for disable

## API Endpoints

### Authentication Flow

```
POST /api/auth/login
  Body: { email, password, rememberMe }
  Response: { success, requireMFA?, user?, message }
  
POST /api/auth/mfa/verify
  Body: { token }
  Response: { success, user, message }
```

### MFA Setup

```
GET /api/auth/mfa/setup
  Response: { success, qrCodeUrl, secret }
  
POST /api/auth/mfa/confirm
  Body: { token }
  Response: { success, message }
  
POST /api/auth/mfa/disable
  Body: { password }
  Response: { success, message }
  
GET /api/auth/mfa/status
  Response: { enabled, type, backupCodes }
```

### SMS Verification

```
POST /api/auth/mfa/sms/send
  Body: { phoneNumber }
  Response: { success, message }
  
POST /api/auth/mfa/sms/verify
  Body: { code }
  Response: { success, message }
```

### Email Verification

```
POST /api/auth/mfa/email/send
  Response: { success, message }
  
POST /api/auth/mfa/email/verify
  Body: { code }
  Response: { success, message }
```

## User Flow

### Enrollment Flow

1. User navigates to `/mfa/setup` or `/mfa/manage`
2. Selects MFA method (TOTP, SMS, or Email)
3. For TOTP:
   - Scans QR code with authenticator app
   - Enters 6-digit code to verify
   - MFA enabled with 10 backup codes generated
4. For SMS/Email:
   - Enters phone number or uses registered email
   - Receives verification code
   - Enters code to verify
   - MFA enabled with backup codes

### Login Flow with MFA

1. User enters email and password
2. If MFA is enabled:
   - Redirected to `/mfa/verify`
   - Enters TOTP token or backup code
   - On success, redirected to dashboard
3. If MFA is not enabled:
   - Directly logged in to dashboard

### Management Flow

1. User navigates to `/mfa/manage`
2. Views current MFA status
3. Can:
   - Enable MFA (redirects to setup)
   - Disable MFA (requires password)
   - View backup codes
   - Download backup codes

## Configuration

### Environment Variables

```env
# Twilio (for SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# SMTP (for Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@nexaerp.com
```

### Dependencies

```json
{
  "speakeasy": "^2.0.0",    // TOTP generation
  "qrcode": "^1.5.4",       // QR code generation
  "twilio": "^6.0.0",       // SMS delivery
  "nodemailer": "^6.9.13",  // Email delivery
  "ioredis": "^5.10.1"      // Code storage
}
```

## Security Considerations

### ✅ Implemented

1. **Session-based MFA verification** - MFA state stored in session
2. **Backup codes** - Single-use recovery codes
3. **Password confirmation** - Required to disable MFA
4. **Time-based tokens** - 30-second validity window
5. **Code expiration** - SMS/Email codes expire in 5 minutes
6. **Redis storage** - Temporary code storage with TTL
7. **Automatic cleanup** - Used backup codes removed

### 🔒 Best Practices

1. Store MFA secrets encrypted in production
2. Use HTTPS for all MFA endpoints
3. Rate limit MFA verification attempts
4. Log all MFA events for audit
5. Implement account lockout after failed attempts
6. Require MFA for sensitive operations
7. Provide clear user guidance and support

## Testing

### Unit Tests

```bash
npm test -- mfa.test.ts
```

### Integration Tests

```bash
npx ts-node src/tests/mfa-integration.test.ts
```

### Test Coverage

- ✅ TOTP generation and verification
- ✅ MFA enablement with valid token
- ✅ MFA enablement rejection with invalid token
- ✅ Backup code generation
- ✅ Backup code verification and removal
- ✅ Invalid token rejection
- ✅ MFA disablement
- ✅ SMS/Email code handling

## Requirements Satisfied

### Requirement 5.4: Multi-Factor Authentication

✅ **WHEN MFA is enabled, THE System SHALL support TOTP, SMS, and email verification**
- TOTP implemented with speakeasy and QR code generation
- SMS implemented with Twilio integration
- Email implemented with nodemailer

✅ **Users should be able to enroll in MFA**
- `/mfa/setup` page with method selection
- QR code display for TOTP
- Phone/email input for SMS/Email
- Token verification before enablement

✅ **Users should be able to manage their MFA settings**
- `/mfa/manage` page with status display
- Enable/disable functionality
- Backup code viewing and download
- Password confirmation for disable

✅ **MFA should integrate seamlessly with the login flow**
- Login endpoint checks for MFA requirement
- Automatic redirect to `/mfa/verify`
- Session-based MFA state management
- Backup code support during login

## Future Enhancements

### Potential Improvements

1. **WebAuthn/FIDO2 Support** - Hardware security keys
2. **Push Notifications** - Mobile app push-based verification
3. **Biometric Authentication** - Fingerprint/Face ID
4. **Risk-based Authentication** - Adaptive MFA based on risk
5. **Remember Device** - Skip MFA on trusted devices
6. **MFA Recovery Flow** - Self-service recovery process
7. **Admin MFA Enforcement** - Force MFA for all users
8. **MFA Analytics** - Usage and security metrics

## Troubleshooting

### Common Issues

**QR Code not displaying**
- Check that QRCode library is installed
- Verify secret generation is working
- Check browser console for errors

**SMS not sending**
- Verify Twilio credentials in .env
- Check Twilio account balance
- Verify phone number format (+1234567890)

**Email not sending**
- Verify SMTP credentials in .env
- Check SMTP server connectivity
- Verify email address format

**Token verification failing**
- Check system time synchronization
- Verify secret is correctly stored
- Check token window setting (default: 1 step = 30s)

**Backup codes not working**
- Verify codes are stored in database
- Check code format (8 characters, uppercase)
- Ensure code hasn't been used already

## Support

For issues or questions:
1. Check this documentation
2. Review test files for examples
3. Check server logs for errors
4. Contact development team

---

**Implementation Date:** January 2025  
**Version:** 1.0  
**Status:** ✅ Complete and Tested
