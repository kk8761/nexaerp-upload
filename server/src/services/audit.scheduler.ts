import cron from 'node-cron';
import { AuditService } from './audit.service';

/**
 * Audit Log Scheduler
 * Automatically runs retention policy to maintain 7-year retention
 * Requirements: 24.4
 */

export class AuditScheduler {
  private static retentionTask: cron.ScheduledTask | null = null;

  /**
   * Start the audit retention scheduler
   * Runs daily at 2:00 AM to apply 7-year retention policy
   */
  static start(): void {
    if (this.retentionTask) {
      console.log('⚠️ Audit retention scheduler already running');
      return;
    }

    // Schedule to run daily at 2:00 AM
    this.retentionTask = cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Running scheduled audit log retention policy...');
      try {
        await AuditService.applyRetentionPolicy();
        console.log('✅ Audit retention policy completed successfully');
      } catch (error: any) {
        console.error('❌ Audit retention policy failed:', error.message);
      }
    });

    console.log('✅ Audit retention scheduler started (runs daily at 2:00 AM)');
  }

  /**
   * Stop the audit retention scheduler
   */
  static stop(): void {
    if (this.retentionTask) {
      this.retentionTask.stop();
      this.retentionTask = null;
      console.log('🛑 Audit retention scheduler stopped');
    }
  }

  /**
   * Check if scheduler is running
   */
  static isRunning(): boolean {
    return this.retentionTask !== null;
  }
}
