/**
 * Session Manager Service
 * Handles Redis-based session management with automatic timeout,
 * concurrent session limits, and session revocation
 * 
 * **Validates: Requirements 5.8**
 */

const Redis = require('ioredis');

class SessionManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis Session Store Error:', err.message);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis Session Store connected');
    });

    // Configuration
    this.SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60') * 60; // seconds
    this.MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5');
    this.SESSION_PREFIX = 'session:';
    this.USER_SESSIONS_PREFIX = 'user_sessions:';
  }

  /**
   * Create a new session
   * @param {string} userId - User ID
   * @param {string} token - JWT token
   * @param {object} metadata - Session metadata (ip, userAgent, etc.)
   * @returns {Promise<string>} sessionId
   */
  async createSession(userId, token, metadata = {}) {
    const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionData = {
      userId,
      token,
      ipAddress: metadata.ipAddress || 'unknown',
      userAgent: metadata.userAgent || 'unknown',
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...metadata
    };

    // Store session data
    await this.redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_TIMEOUT,
      JSON.stringify(sessionData)
    );

    // Add to user's session list
    await this.redis.sadd(`${this.USER_SESSIONS_PREFIX}${userId}`, sessionId);

    // Enforce concurrent session limit
    await this.enforceConcurrentSessionLimit(userId);

    return sessionId;
  }

  /**
   * Get session data
   * @param {string} sessionId - Session ID
   * @returns {Promise<object|null>} Session data or null if not found
   */
  async getSession(sessionId) {
    const data = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (err) {
      console.error('Failed to parse session data:', err);
      return null;
    }
  }

  /**
   * Update session activity timestamp
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Success status
   */
  async updateActivity(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    session.lastActivity = new Date().toISOString();

    // Update session with extended TTL
    await this.redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_TIMEOUT,
      JSON.stringify(session)
    );

    return true;
  }

  /**
   * Revoke a specific session
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Success status
   */
  async revokeSession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    // Remove from user's session list
    await this.redis.srem(`${this.USER_SESSIONS_PREFIX}${session.userId}`, sessionId);

    // Delete session data
    await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);

    return true;
  }

  /**
   * Revoke all sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of sessions revoked
   */
  async revokeAllUserSessions(userId) {
    const sessionIds = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    
    if (sessionIds.length === 0) return 0;

    // Delete all session data
    const pipeline = this.redis.pipeline();
    sessionIds.forEach(sessionId => {
      pipeline.del(`${this.SESSION_PREFIX}${sessionId}`);
    });
    await pipeline.exec();

    // Clear user's session list
    await this.redis.del(`${this.USER_SESSIONS_PREFIX}${userId}`);

    return sessionIds.length;
  }

  /**
   * Get all active sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of session objects
   */
  async getUserSessions(userId) {
    const sessionIds = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    
    if (sessionIds.length === 0) return [];

    const sessions = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push({
          sessionId,
          ...session,
          token: undefined // Don't expose token in session list
        });
      } else {
        // Clean up stale session reference
        await this.redis.srem(`${this.USER_SESSIONS_PREFIX}${userId}`, sessionId);
      }
    }

    return sessions;
  }

  /**
   * Enforce concurrent session limit for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async enforceConcurrentSessionLimit(userId) {
    const sessionIds = await this.redis.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    
    if (sessionIds.length <= this.MAX_CONCURRENT_SESSIONS) return;

    // Get all sessions with their last activity times
    const sessionsWithActivity = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessionsWithActivity.push({
          sessionId,
          lastActivity: new Date(session.lastActivity).getTime()
        });
      }
    }

    // Sort by last activity (oldest first)
    sessionsWithActivity.sort((a, b) => a.lastActivity - b.lastActivity);

    // Revoke oldest sessions to get under the limit
    const sessionsToRevoke = sessionsWithActivity.length - this.MAX_CONCURRENT_SESSIONS;
    for (let i = 0; i < sessionsToRevoke; i++) {
      await this.revokeSession(sessionsWithActivity[i].sessionId);
    }
  }

  /**
   * Validate session and token
   * @param {string} sessionId - Session ID
   * @param {string} token - JWT token
   * @returns {Promise<object|null>} Session data if valid, null otherwise
   */
  async validateSession(sessionId, token) {
    const session = await this.getSession(sessionId);
    
    if (!session) return null;
    if (session.token !== token) return null;

    // Update activity timestamp
    await this.updateActivity(sessionId);

    return session;
  }

  /**
   * Clean up expired sessions (maintenance task)
   * @returns {Promise<number>} Number of sessions cleaned
   */
  async cleanupExpiredSessions() {
    // Redis automatically handles TTL expiration, but we need to clean up user session lists
    let cleaned = 0;
    
    const userKeys = await this.redis.keys(`${this.USER_SESSIONS_PREFIX}*`);
    
    for (const userKey of userKeys) {
      const sessionIds = await this.redis.smembers(userKey);
      
      for (const sessionId of sessionIds) {
        const exists = await this.redis.exists(`${this.SESSION_PREFIX}${sessionId}`);
        if (!exists) {
          await this.redis.srem(userKey, sessionId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * Get session statistics
   * @returns {Promise<object>} Session statistics
   */
  async getStats() {
    const sessionKeys = await this.redis.keys(`${this.SESSION_PREFIX}*`);
    const userSessionKeys = await this.redis.keys(`${this.USER_SESSIONS_PREFIX}*`);

    return {
      totalActiveSessions: sessionKeys.length,
      totalUsersWithSessions: userSessionKeys.length,
      sessionTimeout: this.SESSION_TIMEOUT,
      maxConcurrentSessions: this.MAX_CONCURRENT_SESSIONS
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    await this.redis.quit();
  }
}

// Singleton instance
let sessionManagerInstance = null;

function getSessionManager() {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

module.exports = { SessionManager, getSessionManager };
