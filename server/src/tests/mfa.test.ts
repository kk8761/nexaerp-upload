/**
 * MFA Service Tests
 * Tests for Multi-Factor Authentication functionality
 */

import { MFAService } from '../services/mfa.service';
import prisma from '../config/prisma';

describe('MFA Service', () => {
  const testUserId = 'test-user-mfa-001';
  const testEmail = 'test@nexaerp.com';

  beforeAll(async () => {
    // Create test user if not exists
    await prisma.user.upsert({
      where: { id: testUserId },
      create: {
        id: testUserId,
        email: testEmail,
        name: 'Test User',
        password: 'hashed_password',
        avatar: 'TU',
        storeId: 'test-store'
      },
      update: {}
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.mFA.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('TOTP Generation and Verification', () => {
    test('should generate TOTP secret and QR code', async () => {
      const result = await MFAService.generateSecret(testUserId, testEmail);
      
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result.secret).toBeTruthy();
      expect(result.qrCodeUrl).toContain('data:image/png;base64');
    });

    test('should verify valid TOTP token', () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const isValid = MFAService.verifyToken(secret.base32, token);
      expect(isValid).toBe(true);
    });

    test('should reject invalid TOTP token', () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();
      const invalidToken = '000000';

      const isValid = MFAService.verifyToken(secret.base32, invalidToken);
      expect(isValid).toBe(false);
    });
  });

  describe('MFA Enablement', () => {
    test('should enable MFA with valid token', async () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      const success = await MFAService.enableMFA(
        testUserId,
        secret.base32,
        token,
        'totp'
      );

      expect(success).toBe(true);

      // Verify MFA record was created
      const mfaRecord = await prisma.mFA.findFirst({
        where: { userId: testUserId }
      });

      expect(mfaRecord).toBeTruthy();
      expect(mfaRecord?.enabled).toBe(true);
      expect(mfaRecord?.type).toBe('totp');
      expect(mfaRecord?.backupCodes).toHaveLength(10);
    });

    test('should not enable MFA with invalid token', async () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();
      const invalidToken = '000000';

      const success = await MFAService.enableMFA(
        testUserId,
        secret.base32,
        invalidToken,
        'totp'
      );

      expect(success).toBe(false);
    });
  });

  describe('Backup Codes', () => {
    test('should generate backup codes', () => {
      const codes = MFAService.generateBackupCodes(10);
      
      expect(codes).toHaveLength(10);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });

    test('should verify valid backup code', async () => {
      // First enable MFA to get backup codes
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });

      await MFAService.enableMFA(testUserId, secret.base32, token, 'totp');

      // Get the backup codes
      const mfaRecord = await prisma.mFA.findFirst({
        where: { userId: testUserId }
      });

      const backupCode = mfaRecord?.backupCodes[0];
      expect(backupCode).toBeTruthy();

      // Verify the backup code
      const isValid = await MFAService.verifyBackupCode(testUserId, backupCode!);
      expect(isValid).toBe(true);

      // Verify the code was removed after use
      const updatedRecord = await prisma.mFA.findFirst({
        where: { userId: testUserId }
      });
      expect(updatedRecord?.backupCodes).not.toContain(backupCode);
    });

    test('should reject invalid backup code', async () => {
      const isValid = await MFAService.verifyBackupCode(testUserId, 'INVALID1');
      expect(isValid).toBe(false);
    });
  });

  describe('MFA Disablement', () => {
    test('should disable MFA', async () => {
      await MFAService.disableMFA(testUserId);

      const mfaRecord = await prisma.mFA.findFirst({
        where: { userId: testUserId }
      });

      expect(mfaRecord?.enabled).toBe(false);
    });
  });

  describe('SMS Verification', () => {
    test('should handle SMS code sending gracefully when not configured', async () => {
      const result = await MFAService.sendSMSCode('+1234567890', testUserId);
      
      // Should return error if Twilio not configured
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });

  describe('Email Verification', () => {
    test('should send email verification code', async () => {
      const result = await MFAService.sendEmailCode(testEmail, testUserId);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Running MFA tests...');
  // Note: Actual test execution would be done via Jest or similar test runner
}
