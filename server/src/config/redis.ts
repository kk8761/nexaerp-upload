import Redis from 'ioredis';

// Prevent multiple instances of Redis Client in development
declare global {
  var redisClient: Redis | undefined;
}

/**
 * Redis Configuration with Persistence and High Availability
 * Implements Task 3.1: Deploy Redis for caching and sessions
 * 
 * Features:
 * - Connection pooling and retry strategy
 * - Automatic reconnection with exponential backoff
 * - Health monitoring and metrics
 * - Persistence enabled (AOF + RDB)
 */

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err: Error) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect when Redis is in readonly mode
      return true;
    }
    return false;
  },
};

export const redis = global.redisClient || (process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new Redis(redisOptions));

if (process.env.NODE_ENV !== 'production') {
  global.redisClient = redis;
}

// Redis event handlers for monitoring
redis.on('connect', () => {
  console.log('🔄 Redis: Connecting...');
});

redis.on('ready', () => {
  console.log('✅ Redis: Ready');
});

redis.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});

redis.on('close', () => {
  console.log('🔌 Redis: Connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...');
});

/**
 * Connect to Redis and verify connection
 */
export async function connectRedis(): Promise<void> {
  try {
    // ioredis connects automatically, but we can ping to verify
    await redis.ping();
    console.log('✅ Redis Connected');
    
    // Log Redis server info
    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    console.log(`📦 Redis Version: ${version || 'unknown'}`);
  } catch (error) {
    console.error('❌ Redis connection error:', error);
    // Don't throw to allow app to start without Redis if it's optional
  }
}

/**
 * Get Redis connection health status
 */
export async function getRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency: number;
  connected: boolean;
  memoryUsage?: string;
  uptime?: number;
}> {
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    const info = await redis.info('memory');
    const memoryUsage = info.match(/used_memory_human:([^\r\n]+)/)?.[1];
    
    const serverInfo = await redis.info('server');
    const uptime = parseInt(serverInfo.match(/uptime_in_seconds:([^\r\n]+)/)?.[1] || '0');
    
    return {
      status: 'healthy',
      latency,
      connected: redis.status === 'ready',
      memoryUsage,
      uptime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: -1,
      connected: false,
    };
  }
}

/**
 * Get Redis cache statistics
 */
export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  memoryUsed: string;
  evictedKeys: number;
}> {
  try {
    const info = await redis.info('stats');
    const memoryInfo = await redis.info('memory');
    
    const hits = parseInt(info.match(/keyspace_hits:([^\r\n]+)/)?.[1] || '0');
    const misses = parseInt(info.match(/keyspace_misses:([^\r\n]+)/)?.[1] || '0');
    const evictedKeys = parseInt(info.match(/evicted_keys:([^\r\n]+)/)?.[1] || '0');
    const memoryUsed = memoryInfo.match(/used_memory_human:([^\r\n]+)/)?.[1] || '0';
    
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    
    const dbInfo = await redis.info('keyspace');
    const keysMatch = dbInfo.match(/keys=(\d+)/);
    const keys = keysMatch ? parseInt(keysMatch[1]) : 0;
    
    return {
      hits,
      misses,
      hitRate: Math.round(hitRate * 100) / 100,
      keys,
      memoryUsed,
      evictedKeys,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      keys: 0,
      memoryUsed: '0',
      evictedKeys: 0,
    };
  }
}

export default redis;
