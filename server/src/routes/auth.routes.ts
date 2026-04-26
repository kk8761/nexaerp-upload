import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../server'; // Import rate limiter
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// Ensure user is authenticated middleware
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && !req.session.mfaPending) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized' });
};

// Standard Login
router.post('/login', authLimiter, AuthController.login);

// MFA Verification
router.post('/mfa/verify', authLimiter, AuthController.verifyMFA);

// MFA Setup
router.get('/mfa/setup', isAuthenticated, AuthController.setupMFA);
router.post('/mfa/confirm', isAuthenticated, AuthController.confirmMFA);
router.post('/mfa/disable', isAuthenticated, AuthController.disableMFA);
router.get('/mfa/status', isAuthenticated, AuthController.getMFAStatus);

// MFA SMS Verification
router.post('/mfa/sms/send', isAuthenticated, AuthController.sendSMSCode);
router.post('/mfa/sms/verify', isAuthenticated, AuthController.verifySMSCode);

// MFA Email Verification
router.post('/mfa/email/send', isAuthenticated, AuthController.sendEmailCode);
router.post('/mfa/email/verify', isAuthenticated, AuthController.verifyEmailCode);

// Logout
router.post('/logout', AuthController.logout);

// Google SSO
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=sso_failed' }),
  (_req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  }
);

// Microsoft SSO
router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));
router.get('/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/login?error=sso_failed' }),
  (_req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/dashboard');
  }
);

// Session Management
router.get('/sessions', isAuthenticated, AuthController.getSessions);
router.delete('/sessions/:sessionToken', 
  isAuthenticated, 
  auditLog('DELETE', 'session'),
  AuthController.revokeSession
);
router.post('/sessions/revoke-all', 
  isAuthenticated, 
  auditLog('DELETE', 'session'),
  AuthController.revokeAllOtherSessions
);

// Current User Info
router.get('/me', isAuthenticated, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;
