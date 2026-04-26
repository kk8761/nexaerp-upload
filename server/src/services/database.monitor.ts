/**
 * Database Monitoring Service
 * Monitors PostgreSQL connection health, pool statistics, and performance metrics
 */

import prisma, { pool } from '../config/prisma';

export interface DatabaseMetrics {
  timestamp: Date;
  connectionPool: {
    total: number;
    idle: number;
    waiting: number;
    maxConnections: number;
  };
  database: {
    size: string;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
    cacheHitRatio: number;
  };
}

export class DatabaseMonitor {
  private metricsHistory: DatabaseMetrics[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Get current database metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    try {
      // Get connection pool stats
      const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
      };

      // Get database size
      const dbSizeResult = await prisma.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;
      const dbSize = dbSizeResult[0]?.size || 'Unknown';

      // Get active connections
      const connectionStats = await prisma.$queryRaw<
        Array<{ active: bigint; idle: bigint; max: number }>
      >`
        SELECT 
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      const connStats = connectionStats[0] || { active: 0n, idle: 0n, max: 100 };

      // Get cache hit ratio
      const cacheHitResult = await prisma.$queryRaw<
        Array<{ cache_hit_ratio: number }>
      >`
        SELECT 
          ROUND(
            100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0),
            2
          ) as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `;

      const cacheHitRatio = cacheHitResult[0]?.cache_hit_ratio || 0;

      // Get slow query count (queries taking > 1 second)
      const slowQueryResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM pg_stat_statements
        WHERE mean_exec_time > 1000
      `;

      const slowQueries = Number(slowQueryResult[0]?.count || 0n);

      // Get average query time
      const avgQueryResult = await prisma.$queryRaw<
        Array<{ avg_time: number }>
      >`
        SELECT ROUND(AVG(mean_exec_time)::numeric, 2) as avg_time
        FROM pg_stat_statements
      `;

      const avgQueryTime = avgQueryResult[0]?.avg_time || 0;

      const metrics: DatabaseMetrics = {
        timestamp: new Date(),
        connectionPool: poolStats,
        database: {
          size: dbSize,
          activeConnections: Number(connStats.active),
          idleConnections: Number(connStats.idle),
          maxConnections: connStats.max,
        },
        performance: {
          avgQueryTime,
          slowQueries,
          cacheHitRatio,
        },
      };

      // Store in history
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      return metrics;
    } catch (error) {
      console.error('❌ Error collecting database metrics:', error);
      throw error;
    }
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): DatabaseMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: DatabaseMetrics;
  }> {
    const metrics = await this.getMetrics();
    const issues: string[] = [];

    // Check connection pool utilization
    const poolUtilization =
      (metrics.connectionPool.total / metrics.connectionPool.maxConnections) * 100;
    if (poolUtilization > 80) {
      issues.push(
        `High connection pool utilization: ${poolUtilization.toFixed(1)}%`
      );
    }

    // Check active connections
    const connUtilization =
      (metrics.database.activeConnections / metrics.database.maxConnections) * 100;
    if (connUtilization > 80) {
      issues.push(
        `High database connection utilization: ${connUtilization.toFixed(1)}%`
      );
    }

    // Check cache hit ratio
    if (metrics.performance.cacheHitRatio < 90) {
      issues.push(
        `Low cache hit ratio: ${metrics.performance.cacheHitRatio.toFixed(1)}%`
      );
    }

    // Check slow queries
    if (metrics.performance.slowQueries > 10) {
      issues.push(`High number of slow queries: ${metrics.performance.slowQueries}`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    tables: Array<{
      tableName: string;
      rowCount: bigint;
      totalSize: string;
      indexSize: string;
    }>;
    indexes: Array<{
      indexName: string;
      tableName: string;
      indexSize: string;
      indexScans: bigint;
    }>;
  }> {
    // Get table statistics
    const tables = await prisma.$queryRaw<
      Array<{
        table_name: string;
        row_count: bigint;
        total_size: string;
        index_size: string;
      }>
    >`
      SELECT 
        schemaname || '.' || tablename as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
      LIMIT 20
    `;

    // Get index statistics
    const indexes = await prisma.$queryRaw<
      Array<{
        index_name: string;
        table_name: string;
        index_size: string;
        index_scans: bigint;
      }>
    >`
      SELECT 
        indexrelname as index_name,
        schemaname || '.' || tablename as table_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as index_scans
      FROM pg_stat_user_indexes
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 20
    `;

    return {
      tables: tables.map((t) => ({
        tableName: t.table_name,
        rowCount: t.row_count,
        totalSize: t.total_size,
        indexSize: t.index_size,
      })),
      indexes: indexes.map((i) => ({
        indexName: i.index_name,
        tableName: i.table_name,
        indexSize: i.index_size,
        indexScans: i.index_scans,
      })),
    };
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    console.log(`📊 Starting database monitoring (interval: ${intervalMs}ms)`);
    return setInterval(async () => {
      try {
        const health = await this.checkHealth();
        if (!health.healthy) {
          console.warn('⚠️ Database health issues detected:', health.issues);
        }
      } catch (error) {
        console.error('❌ Error during monitoring:', error);
      }
    }, intervalMs);
  }
}

// Export singleton instance
export const databaseMonitor = new DatabaseMonitor();
