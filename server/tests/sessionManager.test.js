/**
 * Session Manager Tests
 * Tests for Redis-based session management
 * 
 * **Validates: Requirements 5.8**
 */

const { SessionManager } = require('../services/sessionManager');

describe('SessionManager', () => {
  let sessionManager;
  const testUserId = 'user123';
  const testToken = 'test-jwt-token';
  const testMetadata = {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  };

  beforeAll(() => {
    sessionManager = new SessionManager();
  });

  afterAll(async () => {
    await sessionManager.close();
  });

  afterEach(async () => {
    // Clean up test sessions
    await sessionManager.revokeAllUserSessions(testUserId);
  });

  describe('Session Creation', () => {
    test('should create a new session', async () => {
      const sessionId = await sessionManager.createSession(testUserId, testToken, testMetadata);
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toContain(testUserId);
      
      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.token).toBe(testToken);
      expect(session.ipAddress).toBe(testMetadata.ipAddress);
      expect(session.userAgent).toBe(testMetadata.userAgent);
    });

    test('should store session metadata', async () => {
      const sessionId = await sessionManager.createSession(testUserId, testToken, testMetadata);
      const session = await sessionManager.getSession(sessionId);
      
      expect(session.loginTime).toBeDefined();
      expect(session.lastActivity).toBeDefined();
      expect(new Date(session.loginTime)).toBeInstanceOf(Date);
    });
  });

  describe('Session Retrieval', () => {
    test('should retrieve existing session', async () => {
      const sessionId = await sessionManager.createSession(testUserId, testToken, testMetadata);
      const session = await sessionManager.getSession(sessionId);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
    });

    test('should return null for non-existent session', async () => {
      const session = await sessionManager.getSession('non-existent-session');
      expect(session).toBeNull();
    });
  });

  describe('Session Activity Update', () => {
    test('should update last activity timestamp', async () => {
      const sessionId = await sessionManager.createSession(testUserId, testToken, testMetadata);
      const originalSession = await sessionManager.getSession(sessionId);
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await sessionManager.updateActivity(sessionId);
      const updatedSession = await sessionManager.getSession(sessionId);
      
      expect(new Date(updatedSession.lastActivity).getTime())
        .toBeGreaterThan(new Date(originalSession.lastActivity).getTime());
    });

    test('should return false for non-existent session', async () => {
      const result = await sessionManager.updateActivity('non-existent-session');
      expect(result).toBe(false);
    });
  });

  describe('Session Validation', () => {
    test('should validate correct session and token', async () => {
      const sessionId = await sessionManager.createSession(testUserId, testToken, testMetadata);
      const session = await sessionManager.validateSession(sessionId, testToken);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
    });

    test('should reject invalid token', async () => {
      const sessionId = await sessionManager.createSession(testUserId, testToken, testMetadata);
      const session = await sessionManager.validateSession(sessionId, 'wrong-token');
      
      expect(session).toBeNull();
    });

    test('should reject non-existent session', async () => {
      const session = await sessionManager.validateSession('non-existent', testToken);
      expect(session).toBeNull();
    });
  });

  describe('Session Revocation', () => {
    test('should revoke a specific session', async () => {
      const sessionId = await sessionManager.createSession(testUserId, testToken, testMetadata);
      
      const revoked = await sessionManager.revokeSession(sessionId);
      expect(revoked).toBe(true);
      
      const session = await sessionManager.getSession(sessionId);
      expect(session).toBeNull();
    });

    test('should return false when revoking non-existent session', async () => {
      const revoked = await sessionManager.revokeSession('non-existent-session');
      expect(revoked).toBe(false);
    });

    test('should revoke all user sessions', async () => {
      // Create multiple sessions
      await sessionManager.createSession(testUserId, testToken + '1', testMetadata);
      await sessionManager.createSession(testUserId, testToken + '2', testMetadata);
      await sessionManager.createSession(testUserId, testToken + '3', testMetadata);
      
      const revokedCount = await sessionManager.revokeAllUserSessions(testUserId);
      expect(revokedCount).toBe(3);
      
      const sessions = await sessionManager.getUserSessions(testUserId);
      expect(sessions.length).toBe(0);
    });
  });

  describe('User Sessions', () => {
    test('should get all active sessions for a user', async () => {
      const sessionId1 = await sessionManager.createSession(testUserId, testToken + '1', testMetadata);
      const sessionId2 = await sessionManager.createSession(testUserId, testToken + '2', testMetadata);
      
      const sessions = await sessionManager.getUserSessions(testUserId);
      
      expect(sessions.length).toBe(2);
      expect(sessions.some(s => s.sessionId === sessionId1)).toBe(true);
      expect(sessions.some(s => s.sessionId === sessionId2)).toBe(true);
      
      // Tokens should not be exposed
      sessions.forEach(session => {
        expect(session.token).toBeUndefined();
      });
    });

    test('should return empty array for user with no sessions', async () => {
      const sessions = await sessionManager.getUserSessions('user-with-no-sessions');
      expect(sessions).toEqual([]);
    });
  });

  describe('Concurrent Session Limit', () => {
    test('should enforce maximum concurrent sessions', async () => {
      const maxSessions = sessionManager.MAX_CONCURRENT_SESSIONS;
      
      // Create more sessions than the limit
      for (let i = 0; i < maxSessions + 3; i++) {
        await sessionManager.createSession(testUserId, testToken + i, testMetadata);
      }
      
      const sessions = await sessionManager.getUserSessions(testUserId);
      expect(sessions.length).toBeLessThanOrEqual(maxSessions);
    });

    test('should revoke oldest sessions when limit exceeded', async () => {
      const maxSessions = sessionManager.MAX_CONCURRENT_SESSIONS;
      
      // Create sessions with delays to ensure different timestamps
      const sessionIds = [];
      for (let i = 0; i < maxSessions; i++) {
        const sessionId = await sessionManager.createSession(testUserId, testToken + i, testMetadata);
        sessionIds.push(sessionId);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Create one more session (should revoke the oldest)
      const newestSessionId = await sessionManager.createSession(
        testUserId,
        testToken + 'newest',
        testMetadata
      );
      
      const sessions = await sessionManager.getUserSessions(testUserId);
      expect(sessions.length).toBe(maxSessions);
      
      // Newest session should exist
      expect(sessions.some(s => s.sessionId === newestSessionId)).toBe(true);
      
      // Oldest session should be revoked
      const oldestSession = await sessionManager.getSession(sessionIds[0]);
      expect(oldestSession).toBeNull();
    });
  });

  describe('Session Timeout', () => {
    test('should have configurable timeout', () => {
      expect(sessionManager.SESSION_TIMEOUT).toBeGreaterThan(0);
    });

    // Note: Testing actual timeout would require waiting for the timeout period
    // In production, Redis handles TTL automatically
  });

  describe('Session Statistics', () => {
    test('should return session statistics', async () => {
      await sessionManager.createSession(testUserId, testToken, testMetadata);
      await sessionManager.createSession('user456', testToken, testMetadata);
      
      const stats = await sessionManager.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalActiveSessions).toBeGreaterThanOrEqual(2);
      expect(stats.totalUsersWithSessions).toBeGreaterThanOrEqual(2);
      expect(stats.sessionTimeout).toBe(sessionManager.SESSION_TIMEOUT);
      expect(stats.maxConcurrentSessions).toBe(sessionManager.MAX_CONCURRENT_SESSIONS);
      
      // Cleanup
      await sessionManager.revokeAllUserSessions('user456');
    });
  });

  describe('Session Cleanup', () => {
    test('should clean up expired session references', async () => {
      const sessionId = await sessionManager.createSession(testUserId, testToken, testMetadata);
      
      // Manually delete session data (simulating expiration)
      await sessionManager.redis.del(`${sessionManager.SESSION_PREFIX}${sessionId}`);
      
      const cleaned = await sessionManager.cleanupExpiredSessions();
      expect(cleaned).toBeGreaterThanOrEqual(1);
      
      // Session should be removed from user's session list
      const sessions = await sessionManager.getUserSessions(testUserId);
      expect(sessions.some(s => s.sessionId === sessionId)).toBe(false);
    });
  });
});
