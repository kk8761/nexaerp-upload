import { redis } from '../config/redis';

/**
 * Cache Service
 * Implements Task 3.2: Caching strategies with cache-aside pattern,
 * cache invalidation, and cache warming for frequently accessed data.
 * 
 * Features:
 * - Cache-aside pattern implementation
 * - Automatic cache invalidation on data updates
 * - Cache warming for frequently accessed data
 * - Cache hit rate monitoring
 * - Pattern-based invalidation
 * - Graceful degradation on Redis failures
 */

// Define standard TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60,               // 1 minute - for rapidly changing data
  MEDIUM: 60 * 60,         // 1 hour - for moderately stable data
  LONG: 60 * 60 * 24,      // 1 day - for stable reference data
  WEEK: 60 * 60 * 24 * 7,  // 1 week - for very stable data
  NEVER: -1                // No expiration
};

// Cache key prefixes for organization
export const CACHE_PREFIX = {
  CRM: 'crm:',
  INVENTORY: 'inventory:',
  ACCOUNTING: 'accounting:',
  MANUFACTURING: 'manufacturing:',
  HRMS: 'hrms:',
  DMS: 'dms:',
  WORKFLOW: 'workflow:',
  BI: 'bi:',
  USER: 'user:',
  SESSION: 'session:',
};

// Track cache statistics in memory
let cacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  lastReset: new Date(),
};

/**
 * Get data from cache, or execute fetcher function and store the result.
 * Implements the Cache-Aside pattern.
 * 
 * @param key Cache key
 * @param fetcher Function to fetch data if cache miss
 * @param ttl Time-to-live in seconds
 * @returns Cached or freshly fetched data
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  try {
    // 1. Try to get from cache
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      cacheMetrics.hits++;
      return JSON.parse(cachedData) as T;
    }
    
    // 2. Cache miss -> execute fetcher
    cacheMetrics.misses++;
    const freshData = await fetcher();
    
    // 3. Store in cache
    if (freshData !== null && freshData !== undefined) {
      if (ttl === CACHE_TTL.NEVER) {
        await redis.set(key, JSON.stringify(freshData));
      } else {
        await redis.setex(key, ttl, JSON.stringify(freshData));
      }
    }
    
    return freshData;
  } catch (error) {
    cacheMetrics.errors++;
    console.error(`Cache Error [${key}]:`, error);
    // If Redis fails, gracefully fall back to executing fetcher
    return fetcher();
  }
}

/**
 * Set data in cache directly
 * Useful for write-through caching pattern
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<void> {
  try {
    if (data !== null && data !== undefined) {
      if (ttl === CACHE_TTL.NEVER) {
        await redis.set(key, JSON.stringify(data));
      } else {
        await redis.setex(key, ttl, JSON.stringify(data));
      }
    }
  } catch (error) {
    console.error(`Cache Set Error [${key}]:`, error);
  }
}

/**
 * Get data from cache without fetcher
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      cacheMetrics.hits++;
      return JSON.parse(cachedData) as T;
    }
    cacheMetrics.misses++;
    return null;
  } catch (error) {
    cacheMetrics.errors++;
    console.error(`Cache Get Error [${key}]:`, error);
    return null;
  }
}

/**
 * Invalidate a specific cache key
 * Used when data is updated or deleted
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Cache Invalidation Error [${key}]:`, error);
  }
}

/**
 * Invalidate all cache keys matching a pattern
 * Useful for invalidating lists when an item is created/updated/deleted
 * Example: invalidateCachePattern('crm:opportunities:*')
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    let deletedCount = 0;
    
    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      
      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');
    
    if (deletedCount > 0) {
      console.log(`🗑️  Invalidated ${deletedCount} cache keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error(`Cache Pattern Invalidation Error [${pattern}]:`, error);
  }
}

/**
 * Cache warming utility
 * Fetches frequently accessed data during startup or on-demand
 */
export async function warmCache(
  key: string,
  fetcher: () => Promise<any>,
  ttl: number = CACHE_TTL.LONG
): Promise<void> {
  try {
    console.log(`🔥 Warming cache for key: ${key}`);
    await invalidateCache(key); // Clear existing
    await getOrSetCache(key, fetcher, ttl);
    console.log(`✅ Cache warmed: ${key}`);
  } catch (error) {
    console.error(`Cache Warming Error [${key}]:`, error);
  }
}

/**
 * Warm multiple cache keys in parallel
 */
export async function warmCacheBatch(
  items: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>
): Promise<void> {
  console.log(`🔥 Warming ${items.length} cache keys...`);
  
  const promises = items.map(({ key, fetcher, ttl }) =>
    warmCache(key, fetcher, ttl || CACHE_TTL.LONG)
  );
  
  await Promise.allSettled(promises);
  console.log(`✅ Cache warming completed for ${items.length} keys`);
}

/**
 * Get cache hit rate and statistics
 */
export function getCacheMetrics(): {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
  totalRequests: number;
  lastReset: Date;
} {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  const hitRate = total > 0 ? (cacheMetrics.hits / total) * 100 : 0;
  
  return {
    ...cacheMetrics,
    hitRate: Math.round(hitRate * 100) / 100,
    totalRequests: total,
  };
}

/**
 * Reset cache metrics
 */
export function resetCacheMetrics(): void {
  cacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    lastReset: new Date(),
  };
}

/**
 * Check if a key exists in cache
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`Cache Exists Error [${key}]:`, error);
    return false;
  }
}

/**
 * Get remaining TTL for a cache key
 */
export async function getCacheTTL(key: string): Promise<number> {
  try {
    return await redis.ttl(key);
  } catch (error) {
    console.error(`Cache TTL Error [${key}]:`, error);
    return -1;
  }
}

/**
 * Extend TTL for an existing cache key
 */
export async function extendCacheTTL(key: string, ttl: number): Promise<void> {
  try {
    await redis.expire(key, ttl);
  } catch (error) {
    console.error(`Cache Extend TTL Error [${key}]:`, error);
  }
}

/**
 * Cache middleware for Express routes
 * Usage: router.get('/api/data', cacheMiddleware('data:key', 3600), handler)
 */
export function cacheMiddleware(keyGenerator: (req: any) => string, ttl: number = CACHE_TTL.MEDIUM) {
  return async (req: any, res: any, next: any) => {
    const key = keyGenerator(req);
    
    try {
      const cachedData = await getCache(key);
      if (cachedData) {
        return res.json(cachedData);
      }
      
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache response
      res.json = (data: any) => {
        setCache(key, data, ttl).catch(err => 
          console.error('Cache middleware error:', err)
        );
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}
