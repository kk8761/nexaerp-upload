import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { MFAService } from '../services/mfa.service';
import { SessionService } from '../config/session';
import prisma from '../config/prisma';

export class AuthController {
  /**
   * Login using local strategy
   */
  static login = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return next(err);
      
      if (!user) {
        return res.status(401).json({ success: false, message: info?.message || 'Authentication failed' });
      }

      req.logIn(user, async (loginErr) => {
        if (loginErr) return next(loginErr);

        // Handle remember-me functionality
        const rememberMe = req.body.rememberMe === true || req.body.rememberMe === 'true';
        if (rememberMe && req.session.cookie) {
          // Extend session to 30 days for remember-me
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        // Check if MFA is required
        const mfaSettings = await prisma.mFA.findFirst({
          where: { 
            userId: user.id,
            enabled: true
          }
        });
        
        if (mfaSettings) {
          // Instead of fully logging in, mark session as pending MFA
          (req.session as any).mfaPending = true;
          (req.session as any).mfaUserId = user.id;
          return res.json({ 
            success: true, 
            requireMFA: true, 
            message: 'MFA token required' 
          });
        }

        // Create session record
        if (req.sessionID) {
          await SessionService.createSession(
            user.id,
            req.sessionID,
            req.ip,
            req.get('user-agent')
          );
          
          // Enforce concurrent session limit
          await SessionService.enforceConcurrentSessionLimit(user.id, 5);
        }

        return res.json({ 
          success: true, 
          message: 'Logged in successfully',
          user: req.user
        });
      });
    })(req, res, next);
  };

  /**
   * Verify MFA Token
   */
  static verifyMFA = async (req: Request, res: Response) => {
    try {
      const mfaPending = (req.session as any).mfaPending;
      const mfaUserId = (req.session as any).mfaUserId;

      if (!mfaPending || !mfaUserId) {
        return res.status(400).json({ success: false, message: 'No pending MFA verification' });
      }

      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      const mfaSettings = await prisma.mFA.findFirst({
        where: { 
          userId: mfaUserId,
          enabled: true
        }
      });

      if (!mfaSettings || !mfaSettings.secret) {
        return res.status(400).json({ success: false, message: 'MFA not configured' });
      }

      let isValid = false;

      // Check if it's a backup code (longer than 6 characters)
      if (token.length > 6) {
        isValid = await MFAService.verifyBackupCode(mfaUserId, token);
      } else {
        // Regular TOTP token
        isValid = MFAService.verifyToken(mfaSettings.secret, token);
      }

      if (isValid) {
        // Clear MFA pending state
        delete (req.session as any).mfaPending;
        delete (req.session as any).mfaUserId;
        
        // Fetch user for response
        const user = await prisma.user.findUnique({ where: { id: mfaUserId } });
        
        // Create session record
        if (req.sessionID) {
          await SessionService.createSession(
            mfaUserId,
            req.sessionID,
            req.ip,
            req.get('user-agent')
          );
          
          // Enforce concurrent session limit
          await SessionService.enforceConcurrentSessionLimit(mfaUserId, 5);
        }
        
        return res.json({ success: true, message: 'MFA verified successfully', user });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid MFA token or backup code' });
      }
    } catch (error) {
      console.error('MFA Verification Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Logout user
   */
  static logout = async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.sessionID;
    
    req.logout((err) => {
      if (err) return next(err);
      
      // Revoke session from database
      if (sessionId) {
        SessionService.revokeSession(sessionId).catch(console.error);
      }
      
      req.session.destroy(() => {
        res.clearCookie('nexa.sid');
        return res.json({ success: true, message: 'Logged out successfully' });
      });
    });
  };

  /**
   * Setup MFA
   */
  static setupMFA = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const mfaData = await MFAService.generateSecret(user.id, user.email);
      
      // Temporarily store secret in session until verified
      (req.session as any).tempMfaSecret = mfaData.secret;

      return res.json({
        success: true,
        qrCodeUrl: mfaData.qrCodeUrl,
        secret: mfaData.secret
      });
    } catch (error) {
      console.error('MFA Setup Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Confirm MFA Setup
   */
  static confirmMFA = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      const { token } = req.body;
      const secret = (req.session as any).tempMfaSecret;

      if (!user || !secret || !token) {
        return res.status(400).json({ success: false, message: 'Missing parameters' });
      }

      const success = await MFAService.enableMFA(user.id, secret, token);

      if (success) {
        delete (req.session as any).tempMfaSecret;
        return res.json({ success: true, message: 'MFA enabled successfully' });
      } else {
        return res.status(400).json({ success: false, message: 'Invalid token' });
      }
    } catch (error) {
      console.error('MFA Confirm Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Disable MFA
   */
  static disableMFA = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required to disable MFA' });
      }

      // Verify password before disabling MFA
      const bcrypt = require('bcryptjs');
      const userWithPassword = await prisma.user.findUnique({ where: { id: user.id } });
      
      if (!userWithPassword || !await bcrypt.compare(password, userWithPassword.password)) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }

      await MFAService.disableMFA(user.id);
      
      return res.json({ success: true, message: 'MFA disabled successfully' });
    } catch (error) {
      console.error('MFA Disable Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Send SMS verification code
   */
  static sendSMSCode = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }

      const result = await MFAService.sendSMSCode(phoneNumber, user.id);
      
      if (result.success) {
        return res.json({ success: true, message: result.message });
      } else {
        return res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error('Send SMS Code Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Verify SMS code
   */
  static verifySMSCode = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, message: 'Code is required' });
      }

      const isValid = await MFAService.verifySMSCode(user.id, code);
      
      if (isValid) {
        return res.json({ success: true, message: 'SMS code verified successfully' });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid or expired code' });
      }
    } catch (error) {
      console.error('Verify SMS Code Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Send email verification code
   */
  static sendEmailCode = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await MFAService.sendEmailCode(user.email, user.id);
      
      if (result.success) {
        return res.json({ success: true, message: result.message });
      } else {
        return res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error('Send Email Code Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Verify email code
   */
  static verifyEmailCode = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, message: 'Code is required' });
      }

      const isValid = await MFAService.verifyEmailCode(user.id, code);
      
      if (isValid) {
        return res.json({ success: true, message: 'Email code verified successfully' });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid or expired code' });
      }
    } catch (error) {
      console.error('Verify Email Code Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Get active sessions for current user
   */
  static getSessions = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const sessions = await SessionService.getUserSessions(user.id);
      
      return res.json({ success: true, sessions });
    } catch (error) {
      console.error('Get Sessions Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Revoke a specific session
   */
  static revokeSession = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { sessionToken } = req.params;
      
      // Verify session belongs to user
      const session = await prisma.session.findFirst({
        where: { sessionToken, userId: user.id }
      });

      if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
      }

      await SessionService.revokeSession(sessionToken);
      
      return res.json({ success: true, message: 'Session revoked successfully' });
    } catch (error) {
      console.error('Revoke Session Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Revoke all sessions except current
   */
  static revokeAllOtherSessions = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const currentSessionToken = req.sessionID;
      
      // Get all sessions except current
      const sessions = await prisma.session.findMany({
        where: { 
          userId: user.id,
          sessionToken: { not: currentSessionToken }
        }
      });

      // Revoke each session
      for (const session of sessions) {
        await SessionService.revokeSession(session.sessionToken);
      }
      
      return res.json({ 
        success: true, 
        message: `${sessions.length} session(s) revoked successfully` 
      });
    } catch (error) {
      console.error('Revoke All Sessions Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Get MFA status for current user
   */
  static getMFAStatus = async (req: Request, res: Response) => {
    try {
      const user: any = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const mfaSettings = await prisma.mFA.findFirst({
        where: { userId: user.id }
      });

      if (!mfaSettings) {
        return res.json({
          enabled: false,
          type: null,
          backupCodes: []
        });
      }

      return res.json({
        enabled: mfaSettings.enabled,
        type: mfaSettings.type,
        backupCodes: mfaSettings.enabled ? mfaSettings.backupCodes : []
      });
    } catch (error) {
      console.error('Get MFA Status Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
}
