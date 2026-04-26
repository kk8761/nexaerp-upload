/**
 * Inventory Management Scheduled Jobs
 * - Check reorder points and generate purchase requisitions
 * - Mark expired batches
 * - Alert on expiring batches
 */

import cron from 'node-cron';
import inventoryService from './inventory.service';

export class InventoryScheduler {
  /**
   * Start all inventory-related scheduled jobs
   */
  start() {
    // Check reorder points every hour
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('[Inventory Scheduler] Checking reorder points...');
        const requisitions = await inventoryService.checkReorderPoints();
        if (requisitions.length > 0) {
          console.log(`[Inventory Scheduler] Generated ${requisitions.length} purchase requisitions`);
        }
      } catch (error: any) {
        console.error('[Inventory Scheduler] Error checking reorder points:', error.message);
      }
    });

    // Mark expired batches daily at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('[Inventory Scheduler] Marking expired batches...');
        const result = await inventoryService.markExpiredBatches();
        if (result.count > 0) {
          console.log(`[Inventory Scheduler] Marked ${result.count} batches as expired`);
        }
      } catch (error: any) {
        console.error('[Inventory Scheduler] Error marking expired batches:', error.message);
      }
    });

    // Check for expiring batches daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      try {
        console.log('[Inventory Scheduler] Checking for expiring batches...');
        const batches = await inventoryService.getExpiringBatches(30);
        if (batches.length > 0) {
          console.log(`[Inventory Scheduler] Found ${batches.length} batches expiring in next 30 days`);
          // TODO: Send notifications to warehouse managers
        }
      } catch (error: any) {
        console.error('[Inventory Scheduler] Error checking expiring batches:', error.message);
      }
    });

    console.log('✅ Inventory scheduler started');
  }
}

export default new InventoryScheduler();
