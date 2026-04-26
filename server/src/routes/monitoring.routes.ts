/**
 * Database Monitoring Routes
 * Provides endpoints for monitoring database health and performance
 */

import { Router, Request, Response } from 'express';
import { databaseMonitor } from '../services/database.monitor';
import { getRedisHealth, getCacheStats } from '../config/redis';
import { getCacheMetrics, resetCacheMetrics } from '../services/cache.service';

const router = Router();

/**
 * GET /api/monitoring/health
 * Check database health status
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await databaseMonitor.checkHealth();
    
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('Error checking database health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check database health',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/monitoring/metrics
 * Get current database metrics
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await databaseMonitor.getMetrics();
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error getting database metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/monitoring/metrics/history
 * Get metrics history
 */
router.get('/metrics/history', (_req: Request, res: Response) => {
  try {
    const history = databaseMonitor.getMetricsHistory();
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error getting metrics history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics history',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/monitoring/stats
 * Get detailed database statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await databaseMonitor.getDatabaseStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/monitoring/cache/health
 * Check Redis cache health status
 */
router.get('/cache/health', async (_req: Request, res: Response) => {
  try {
    const health = await getRedisHealth();
    
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('Error checking cache health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check cache health',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/monitoring/cache/stats
 * Get Redis cache statistics including hit rates
 */
router.get('/cache/stats', async (_req: Request, res: Response) => {
  try {
    const [redisStats, appMetrics] = await Promise.all([
      getCacheStats(),
      Promise.resolve(getCacheMetrics()),
    ]);
    
    res.json({
      success: true,
      data: {
        redis: redisStats,
        application: appMetrics,
      },
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/monitoring/cache/reset-metrics
 * Reset application cache metrics
 */
router.post('/cache/reset-metrics', (_req: Request, res: Response) => {
  try {
    resetCacheMetrics();
    
    res.json({
      success: true,
      message: 'Cache metrics reset successfully',
    });
  } catch (error) {
    console.error('Error resetting cache metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset cache metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
