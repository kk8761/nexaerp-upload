import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import prisma from '../config/prisma';
import twilio from 'twilio';
import nodemailer from 'nodemailer';

/**
 * Multi-Factor Authentication Service
 * Supports TOTP, SMS, and Email verification
 */
export class MFAService {
  private static twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

  private static emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  /**
   * Generate a new TOTP secret for a user
   */
  static async generateSecret(_userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `NexaERP (${email})`,
      issuer: 'NexaERP Enterprise'
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32,
      qrCodeUrl
    };
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 step (30 seconds) before or after current time
    });
  }

  /**
   * Enable MFA for user after verification
   */
  static async enableMFA(userId: string, secret: string, token: string, type: 'totp' | 'sms' | 'email' = 'totp'): Promise<boolean> {
    const isValid = this.verifyToken(secret, token);
    
    if (isValid) {
      // Generate backup codes
      const backupCodes = this.generateBackupCodes(10);

      // Create or update MFA record
      await prisma.mFA.upsert({
        where: { userId },
        create: {
          userId,
          type,
          secret,
          enabled: true,
          backupCodes
        },
        update: {
          type,
          secret,
          enabled: true,
          backupCodes
        }
      });

      return true;
    }
    
    return false;
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(userId: string): Promise<void> {
    await prisma.mFA.updateMany({
      where: { userId },
      data: { enabled: false }
    });
  }

  /**
   * Generate backup codes for MFA
   */
  static generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Send SMS verification code
   */
  static async sendSMSCode(phoneNumber: string, userId: string): Promise<{ success: boolean; message: string }> {
    if (!this.twilioClient) {
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in Redis with 5-minute expiry
      const { redis } = await import('../config/redis');
      await redis.setex(`mfa:sms:${userId}`, 300, code);

      // Send SMS
      await this.twilioClient.messages.create({
        body: `Your NexaERP verification code is: ${code}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      return { success: true, message: 'SMS sent successfully' };
    } catch (error) {
      console.error('SMS Send Error:', error);
      return { success: false, message: 'Failed to send SMS' };
    }
  }

  /**
   * Verify SMS code
   */
  static async verifySMSCode(userId: string, code: string): Promise<boolean> {
    try {
      const { redis } = await import('../config/redis');
      const storedCode = await redis.get(`mfa:sms:${userId}`);
      
      if (storedCode === code) {
        // Delete code after successful verification
        await redis.del(`mfa:sms:${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('SMS Verification Error:', error);
      return false;
    }
  }

  /**
   * Send email verification code
   */
  static async sendEmailCode(email: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in Redis with 5-minute expiry
      const { redis } = await import('../config/redis');
      await redis.setex(`mfa:email:${userId}`, 300, code);

      // Send email
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@nexaerp.com',
        to: email,
        subject: 'NexaERP Verification Code',
        html: `
          <h2>NexaERP Verification</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `
      });

      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Email Send Error:', error);
      return { success: false, message: 'Failed to send email' };
    }
  }

  /**
   * Verify email code
   */
  static async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    try {
      const { redis } = await import('../config/redis');
      const storedCode = await redis.get(`mfa:email:${userId}`);
      
      if (storedCode === code) {
        // Delete code after successful verification
        await redis.del(`mfa:email:${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Email Verification Error:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const mfaSettings = await prisma.mFA.findFirst({
        where: { userId, enabled: true }
      });

      if (!mfaSettings || !mfaSettings.backupCodes.includes(code)) {
        return false;
      }

      // Remove used backup code
      const updatedCodes = mfaSettings.backupCodes.filter(c => c !== code);
      await prisma.mFA.update({
        where: { id: mfaSettings.id },
        data: { backupCodes: updatedCodes }
      });

      return true;
    } catch (error) {
      console.error('Backup Code Verification Error:', error);
      return false;
    }
  }
}
