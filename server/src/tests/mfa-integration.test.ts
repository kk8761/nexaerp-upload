/**
 * MFA Integration Test
 * Tests the complete MFA flow end-to-end
 */

import prisma from '../config/prisma';
import { MFAService } from '../services/mfa.service';
import bcrypt from 'bcryptjs';

async function testMFAFlow() {
  console.log('🧪 Starting MFA Integration Test...\n');

  const testEmail = 'mfa-test@nexaerp.com';
  const testPassword = 'TestPassword123!';
  let testUserId: string | undefined;

  try {
    // Step 1: Create test user
    console.log('1️⃣  Creating test user...');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'MFA Test User',
        password: hashedPassword,
        avatar: 'MT',
        storeId: 'test-store-mfa'
      }
    });
    testUserId = user.id;
    console.log('✅ Test user created:', user.email);

    // Step 2: Generate TOTP secret
    console.log('\n2️⃣  Generating TOTP secret...');
    const { secret, qrCodeUrl } = await MFAService.generateSecret(testUserId, testEmail);
    console.log('✅ TOTP secret generated');
    console.log('   Secret:', secret);
    console.log('   QR Code URL length:', qrCodeUrl.length);

    // Step 3: Generate and verify TOTP token
    console.log('\n3️⃣  Generating and verifying TOTP token...');
    const speakeasy = require('speakeasy');
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });
    console.log('   Generated token:', token);

    const isValid = MFAService.verifyToken(secret, token);
    console.log('✅ Token verification:', isValid ? 'PASSED' : 'FAILED');

    if (!isValid) {
      throw new Error('Token verification failed');
    }

    // Step 4: Enable MFA
    console.log('\n4️⃣  Enabling MFA...');
    const enableSuccess = await MFAService.enableMFA(testUserId, secret, token, 'totp');
    console.log('✅ MFA enabled:', enableSuccess ? 'SUCCESS' : 'FAILED');

    if (!enableSuccess) {
      throw new Error('MFA enablement failed');
    }

    // Step 5: Verify MFA record in database
    console.log('\n5️⃣  Verifying MFA record in database...');
    const mfaRecord = await prisma.mFA.findFirst({
      where: { userId: testUserId }
    });

    if (!mfaRecord) {
      throw new Error('MFA record not found in database');
    }

    console.log('✅ MFA record found:');
    console.log('   Type:', mfaRecord.type);
    console.log('   Enabled:', mfaRecord.enabled);
    console.log('   Backup codes count:', mfaRecord.backupCodes.length);

    // Step 6: Test backup code verification
    console.log('\n6️⃣  Testing backup code verification...');
    const backupCode = mfaRecord.backupCodes[0];
    console.log('   Testing backup code:', backupCode);

    const backupValid = await MFAService.verifyBackupCode(testUserId, backupCode);
    console.log('✅ Backup code verification:', backupValid ? 'PASSED' : 'FAILED');

    if (!backupValid) {
      throw new Error('Backup code verification failed');
    }

    // Step 7: Verify backup code was removed
    console.log('\n7️⃣  Verifying backup code was removed after use...');
    const updatedRecord = await prisma.mFA.findFirst({
      where: { userId: testUserId }
    });

    if (updatedRecord?.backupCodes.includes(backupCode)) {
      throw new Error('Backup code was not removed after use');
    }

    console.log('✅ Backup code removed successfully');
    console.log('   Remaining backup codes:', updatedRecord?.backupCodes.length);

    // Step 8: Test invalid token
    console.log('\n8️⃣  Testing invalid token rejection...');
    const invalidToken = '000000';
    const invalidResult = MFAService.verifyToken(secret, invalidToken);
    console.log('✅ Invalid token rejected:', !invalidResult ? 'PASSED' : 'FAILED');

    // Step 9: Disable MFA
    console.log('\n9️⃣  Disabling MFA...');
    await MFAService.disableMFA(testUserId);
    const disabledRecord = await prisma.mFA.findFirst({
      where: { userId: testUserId }
    });
    console.log('✅ MFA disabled:', !disabledRecord?.enabled ? 'SUCCESS' : 'FAILED');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.mFA.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    console.log('✅ Cleanup complete');

    console.log('\n✨ All MFA integration tests PASSED! ✨\n');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Cleanup on error
    if (testUserId) {
      try {
        await prisma.mFA.deleteMany({ where: { userId: testUserId } });
        await prisma.user.delete({ where: { id: testUserId } });
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
    
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testMFAFlow()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { testMFAFlow };
