/**
 * Session Management Integration Example
 * Demonstrates how to use the session management system
 * 
 * **Validates: Requirements 5.8**
 */

const { getSessionManager } = require('../services/sessionManager');

async function demonstrateSessionManagement() {
  const sessionManager = getSessionManager();
  
  console.log('=== Session Management Demo ===\n');

  // 1. Create a session (simulating user login)
  console.log('1. Creating session for user...');
  const userId = 'demo-user-123';
  const token = 'demo-jwt-token-abc123';
  const metadata = {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
  };

  const sessionId = await sessionManager.createSession(userId, token, metadata);
  console.log(`   ✓ Session created: ${sessionId}\n`);

  // 2. Retrieve session data
  console.log('2. Retrieving session data...');
  const session = await sessionManager.getSession(sessionId);
  console.log('   ✓ Session data:', {
    userId: session.userId,
    ipAddress: session.ipAddress,
    loginTime: session.loginTime,
    lastActivity: session.lastActivity
  });
  console.log();

  // 3. Validate session
  console.log('3. Validating session...');
  const validSession = await sessionManager.validateSession(sessionId, token);
  console.log(`   ✓ Session valid: ${validSession !== null}\n`);

  // 4. Create multiple sessions for the same user
  console.log('4. Creating additional sessions...');
  const sessionId2 = await sessionManager.createSession(userId, token + '-2', {
    ipAddress: '192.168.1.101',
    userAgent: 'Mobile Safari'
  });
  const sessionId3 = await sessionManager.createSession(userId, token + '-3', {
    ipAddress: '192.168.1.102',
    userAgent: 'Firefox'
  });
  console.log(`   ✓ Created sessions: ${sessionId2}, ${sessionId3}\n`);

  // 5. List all user sessions
  console.log('5. Listing all user sessions...');
  const userSessions = await sessionManager.getUserSessions(userId);
  console.log(`   ✓ Total sessions: ${userSessions.length}`);
  userSessions.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.sessionId.substring(0, 30)}... (${s.ipAddress})`);
  });
  console.log();

  // 6. Update session activity
  console.log('6. Updating session activity...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  await sessionManager.updateActivity(sessionId);
  const updatedSession = await sessionManager.getSession(sessionId);
  console.log(`   ✓ Last activity updated: ${updatedSession.lastActivity}\n`);

  // 7. Test concurrent session limit
  console.log('7. Testing concurrent session limit...');
  const maxSessions = sessionManager.MAX_CONCURRENT_SESSIONS;
  console.log(`   Max concurrent sessions: ${maxSessions}`);
  
  // Create sessions up to the limit
  for (let i = 4; i <= maxSessions + 2; i++) {
    await sessionManager.createSession(userId, token + `-${i}`, {
      ipAddress: `192.168.1.${100 + i}`,
      userAgent: `Device ${i}`
    });
  }
  
  const sessionsAfterLimit = await sessionManager.getUserSessions(userId);
  console.log(`   ✓ Sessions after limit enforcement: ${sessionsAfterLimit.length}`);
  console.log(`   ✓ Oldest sessions were automatically revoked\n`);

  // 8. Revoke a specific session
  console.log('8. Revoking a specific session...');
  const sessionToRevoke = sessionsAfterLimit[0].sessionId;
  await sessionManager.revokeSession(sessionToRevoke);
  console.log(`   ✓ Session revoked: ${sessionToRevoke.substring(0, 30)}...\n`);

  // 9. Get session statistics
  console.log('9. Getting session statistics...');
  const stats = await sessionManager.getStats();
  console.log('   ✓ Statistics:', stats);
  console.log();

  // 10. Revoke all user sessions
  console.log('10. Revoking all user sessions...');
  const revokedCount = await sessionManager.revokeAllUserSessions(userId);
  console.log(`   ✓ Revoked ${revokedCount} session(s)\n`);

  // 11. Verify sessions are gone
  console.log('11. Verifying sessions are revoked...');
  const remainingSessions = await sessionManager.getUserSessions(userId);
  console.log(`   ✓ Remaining sessions: ${remainingSessions.length}\n`);

  console.log('=== Demo Complete ===');
}

// Run the demo if executed directly
if (require.main === module) {
  demonstrateSessionManagement()
    .then(() => {
      console.log('\n✅ Demo completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Demo failed:', err);
      process.exit(1);
    });
}

module.exports = { demonstrateSessionManagement };
