import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redis } from './redis';

/**
 * Configure Redis session store for enterprise session management
 * Implements Task 5.3: Session management with automatic timeout
 */
export const sessionConfig = session({
  store: new (RedisStore as any)({
    client: redis as any,
    prefix: 'nexaerp:sess:',
    ttl: 60 * 60 * 24 * 7, // 7 days default TTL
  }),
  secret: process.env.COOKIE_SECRET || 'nexaerp-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'nexa.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true if using HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (session timeout)
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
  rolling: true, // Reset expiration on every request (activity-based timeout)
});

/**
 * Session Service for managing user sessions
 */
export class SessionService {
  /**
   * Create a new session record in database
   */
  static async createSession(userId: string, sessionToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const prisma = (await import('./prisma')).default;
    
    await prisma.session.create({
      data: {
        userId,
        sessionToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });
  }

  /**
   * Update session last activity
   */
  static async updateSessionActivity(sessionToken: string): Promise<void> {
    const prisma = (await import('./prisma')).default;
    
    await prisma.session.updateMany({
      where: { sessionToken },
      data: { lastActivity: new Date() }
    });
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(sessionToken: string): Promise<void> {
    const prisma = (await import('./prisma')).default;
    
    await prisma.session.deleteMany({
      where: { sessionToken }
    });
    
    // Also remove from Redis
    await redis.del(`nexaerp:sess:${sessionToken}`);
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    const prisma = (await import('./prisma')).default;
    
    // Get all session tokens for user
    const sessions = await prisma.session.findMany({
      where: { userId },
      select: { sessionToken: true }
    });

    // Delete from database
    await prisma.session.deleteMany({
      where: { userId }
    });

    // Delete from Redis
    for (const session of sessions) {
      await redis.del(`nexaerp:sess:${session.sessionToken}`);
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getUserSessions(userId: string) {
    const prisma = (await import('./prisma')).default;
    
    return await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActivity: 'desc' }
    });
  }

  /**
   * Enforce concurrent session limit
   */
  static async enforceConcurrentSessionLimit(userId: string, limit: number = 5): Promise<void> {
    const prisma = (await import('./prisma')).default;
    
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { lastActivity: 'desc' }
    });

    // If user has more sessions than limit, revoke oldest ones
    if (sessions.length > limit) {
      const sessionsToRevoke = sessions.slice(limit);
      
      for (const session of sessionsToRevoke) {
        await this.revokeSession(session.sessionToken);
      }
    }
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const prisma = (await import('./prisma')).default;
    
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    return result.count;
  }
}
