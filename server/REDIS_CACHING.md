# Redis Caching Layer Implementation

## Overview

This document describes the Redis caching layer implementation for NexaERP, completed as part of Task 3 of the comprehensive-erp-enhancement spec.

## Architecture

### Components

1. **Redis Configuration** (`src/config/redis.ts`)
   - Connection management with automatic reconnection
   - Health monitoring and metrics collection
   - Event handlers for connection lifecycle
   - Persistence enabled (AOF + RDB)

2. **Cache Service** (`src/services/cache.service.ts`)
   - Cache-aside pattern implementation
   - Cache invalidation strategies
   - Cache warming utilities
   - Hit rate monitoring

3. **Cache Warming Service** (`src/services/cache.warming.ts`)
   - Automatic cache warming on startup
   - Module-specific cache warming
   - Frequently accessed data pre-loading

4. **Monitoring Endpoints** (`src/routes/monitoring.routes.ts`)
   - Cache health checks
   - Cache statistics and hit rates
   - Metrics reset functionality

## Features

### 1. Cache-Aside Pattern

The cache service implements the cache-aside (lazy loading) pattern:

```typescript
import { getOrSetCache, CACHE_TTL, CACHE_PREFIX } from '../services/cache.service';

// Example usage in controller
const data = await getOrSetCache(
  `${CACHE_PREFIX.CRM}opportunities:all`,
  async () => {
    // Fetch from database if cache miss
    return await prisma.opportunity.findMany();
  },
  CACHE_TTL.MEDIUM
);
```

### 2. Cache Invalidation

Automatic cache invalidation on data updates:

```typescript
import { invalidateCache, invalidateCachePattern } from '../services/cache.service';

// Invalidate specific key
await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${id}`);

// Invalidate all keys matching pattern
await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);
```

### 3. Cache Warming

Pre-load frequently accessed data on startup:

```typescript
import { warmCriticalCaches } from '../services/cache.warming';

// Called automatically on server startup
await warmCriticalCaches();
```

### 4. Cache Monitoring

Monitor cache performance via API endpoints:

- `GET /api/monitoring/cache/health` - Redis health status
- `GET /api/monitoring/cache/stats` - Cache hit rates and statistics
- `POST /api/monitoring/cache/reset-metrics` - Reset application metrics

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379
```

### Docker Compose

Redis is configured with persistence in `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redisdata:/data
  command: >
    redis-server
    --appendonly yes
    --appendfsync everysec
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
```

## Cache TTL Strategy

Different TTL values for different data types:

| TTL Type | Duration | Use Case |
|----------|----------|----------|
| SHORT    | 1 minute | Rapidly changing data (leads, opportunities) |
| MEDIUM   | 1 hour   | Moderately stable data (forecasts, valuations) |
| LONG     | 1 day    | Stable reference data (warehouses, products) |
| WEEK     | 7 days   | Very stable data (configuration, settings) |

## Cache Key Prefixes

Organized cache keys by module:

```typescript
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
```

## Integrated Modules

### CRM Module

Caching implemented for:
- ✅ Leads list (`crm:leads:all`)
- ✅ Opportunities list with filters (`crm:opportunities:{filters}`)
- ✅ Individual opportunities (`crm:opportunity:{id}`)
- ✅ Revenue forecast (`crm:forecast`)

Cache invalidation on:
- Lead creation
- Opportunity creation/update
- Quotation creation
- Activity creation

### Inventory Module

Caching implemented for:
- ✅ Warehouses list (`inventory:warehouses:all`)
- ✅ Inventory valuation (`inventory:valuation:all`)

Cache invalidation on:
- Warehouse creation
- Stock movement recording

## Performance Targets

Based on Requirement 20.7:

- ✅ **Cache Hit Rate**: Target 80%+ (monitored via `/api/monitoring/cache/stats`)
- ✅ **Read Response Time**: Target <200ms at p95 (improved by caching)
- ✅ **Graceful Degradation**: Falls back to database if Redis fails

## Monitoring and Metrics

### Application-Level Metrics

Tracked in memory and accessible via API:

```typescript
{
  hits: 150,
  misses: 50,
  errors: 0,
  hitRate: 75.0,
  totalRequests: 200,
  lastReset: "2024-01-15T10:00:00.000Z"
}
```

### Redis-Level Metrics

Retrieved from Redis INFO command:

```typescript
{
  hits: 1500,
  misses: 500,
  hitRate: 75.0,
  keys: 42,
  memoryUsed: "2.5M",
  evictedKeys: 0
}
```

## Usage Examples

### Basic Caching

```typescript
import { getOrSetCache, CACHE_TTL, CACHE_PREFIX } from '../services/cache.service';

static async getLeads(_req: Request, res: Response) {
  const cacheKey = `${CACHE_PREFIX.CRM}leads:all`;
  
  const leads = await getOrSetCache(
    cacheKey,
    async () => await prisma.lead.findMany(),
    CACHE_TTL.SHORT
  );
  
  res.json({ success: true, leads });
}
```

### Cache Invalidation on Update

```typescript
import { invalidateCache, invalidateCachePattern } from '../services/cache.service';

static async updateOpportunity(req: Request, res: Response) {
  const { id } = req.params;
  
  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: req.body
  });

  // Invalidate related caches
  await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${id}`);
  await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);
  await invalidateCache(`${CACHE_PREFIX.CRM}forecast`);

  res.json({ success: true, opportunity });
}
```

### Cache Warming

```typescript
import { warmCache, CACHE_TTL, CACHE_PREFIX } from '../services/cache.service';

// Warm a specific cache key
await warmCache(
  `${CACHE_PREFIX.INVENTORY}warehouses:all`,
  async () => await prisma.warehouse.findMany(),
  CACHE_TTL.LONG
);
```

## Testing

### Start Redis

```bash
cd server
docker-compose up -d redis
```

### Check Redis Health

```bash
curl http://localhost:5000/api/monitoring/cache/health
```

### Check Cache Statistics

```bash
curl http://localhost:5000/api/monitoring/cache/stats
```

### Reset Metrics

```bash
curl -X POST http://localhost:5000/api/monitoring/cache/reset-metrics
```

## Best Practices

1. **Use Appropriate TTLs**: Match TTL to data volatility
2. **Invalidate on Updates**: Always invalidate cache when data changes
3. **Use Pattern Invalidation**: Invalidate related caches (e.g., lists when item changes)
4. **Monitor Hit Rates**: Aim for 80%+ hit rate
5. **Graceful Degradation**: Always have fallback to database
6. **Cache Key Naming**: Use consistent prefixes and naming conventions
7. **Avoid Over-Caching**: Don't cache data that changes too frequently

## Future Enhancements

- [ ] Implement cache middleware for automatic route caching
- [ ] Add cache warming scheduler for periodic refresh
- [ ] Implement distributed caching with Redis Cluster
- [ ] Add cache compression for large objects
- [ ] Implement cache versioning for schema changes
- [ ] Add cache analytics dashboard
- [ ] Implement write-through caching for critical data
- [ ] Add cache preloading based on user behavior

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep redis

# Check Redis logs
docker logs nexaerp_redis

# Test Redis connection
docker exec -it nexaerp_redis redis-cli ping
```

### Low Cache Hit Rate

1. Check if cache warming is running
2. Verify TTL values are appropriate
3. Check if cache invalidation is too aggressive
4. Monitor cache eviction rate

### High Memory Usage

1. Check Redis memory usage: `docker exec nexaerp_redis redis-cli INFO memory`
2. Adjust maxmemory in docker-compose.yml
3. Review cached data sizes
4. Consider implementing cache compression

## References

- [Redis Documentation](https://redis.io/documentation)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Cache-Aside Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
