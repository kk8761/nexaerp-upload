import cron from 'node-cron';
import { SessionService } from '../config/session';

/**
 * Session Cleanup Service
 * Automatically cleans up expired sessions from database
 */
export class SessionCleanupService {
  private static job: cron.ScheduledTask | null = null;

  /**
   * Start the session cleanup cron job
   * Runs every hour to clean up expired sessions
   */
  static start() {
    if (this.job) {
      console.log('⚠️ Session cleanup job already running');
      return;
    }

    // Run every hour at minute 0
    this.job = cron.schedule('0 * * * *', async () => {
      try {
        console.log('🧹 Running session cleanup...');
        const deletedCount = await SessionService.cleanupExpiredSessions();
        console.log(`✅ Cleaned up ${deletedCount} expired session(s)`);
      } catch (error) {
        console.error('❌ Session cleanup error:', error);
      }
    });

    console.log('✅ Session cleanup job started (runs hourly)');
  }

  /**
   * Stop the session cleanup cron job
   */
  static stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 Session cleanup job stopped');
    }
  }

  /**
   * Run cleanup immediately (for testing or manual trigger)
   */
  static async runNow(): Promise<number> {
    console.log('🧹 Running manual session cleanup...');
    const deletedCount = await SessionService.cleanupExpiredSessions();
    console.log(`✅ Cleaned up ${deletedCount} expired session(s)`);
    return deletedCount;
  }
}
