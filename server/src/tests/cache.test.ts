/**
 * Cache Service Tests
 * Basic tests to verify caching functionality
 */

import { 
  getOrSetCache, 
  setCache, 
  getCache, 
  invalidateCache, 
  invalidateCachePattern,
  getCacheMetrics,
  resetCacheMetrics,
  CACHE_TTL,
  CACHE_PREFIX 
} from '../services/cache.service';

/**
 * Test cache-aside pattern
 */
async function testCacheAside() {
  console.log('\n🧪 Testing Cache-Aside Pattern...');
  
  let dbCallCount = 0;
  const fetcher = async () => {
    dbCallCount++;
    return { data: 'test data', timestamp: Date.now() };
  };

  // First call - should hit database
  const result1 = await getOrSetCache('test:key1', fetcher, CACHE_TTL.SHORT);
  console.log(`  First call - DB calls: ${dbCallCount}, Result:`, result1);

  // Second call - should hit cache
  const result2 = await getOrSetCache('test:key1', fetcher, CACHE_TTL.SHORT);
  console.log(`  Second call - DB calls: ${dbCallCount}, Result:`, result2);

  if (dbCallCount === 1) {
    console.log('  ✅ Cache-aside pattern working correctly');
  } else {
    console.log('  ❌ Cache-aside pattern failed');
  }

  // Cleanup
  await invalidateCache('test:key1');
}

/**
 * Test cache invalidation
 */
async function testCacheInvalidation() {
  console.log('\n🧪 Testing Cache Invalidation...');
  
  // Set cache
  await setCache('test:key2', { value: 'original' }, CACHE_TTL.SHORT);
  
  // Verify it's cached
  const cached1 = await getCache('test:key2');
  console.log('  Before invalidation:', cached1);

  // Invalidate
  await invalidateCache('test:key2');

  // Verify it's gone
  const cached2 = await getCache('test:key2');
  console.log('  After invalidation:', cached2);

  if (cached1 && !cached2) {
    console.log('  ✅ Cache invalidation working correctly');
  } else {
    console.log('  ❌ Cache invalidation failed');
  }
}

/**
 * Test pattern-based invalidation
 */
async function testPatternInvalidation() {
  console.log('\n🧪 Testing Pattern-Based Invalidation...');
  
  // Set multiple keys with same prefix
  await setCache(`${CACHE_PREFIX.CRM}test:1`, { id: 1 }, CACHE_TTL.SHORT);
  await setCache(`${CACHE_PREFIX.CRM}test:2`, { id: 2 }, CACHE_TTL.SHORT);
  await setCache(`${CACHE_PREFIX.CRM}test:3`, { id: 3 }, CACHE_TTL.SHORT);
  await setCache(`${CACHE_PREFIX.INVENTORY}test:1`, { id: 4 }, CACHE_TTL.SHORT);

  // Verify they're cached
  const before1 = await getCache(`${CACHE_PREFIX.CRM}test:1`);
  const before2 = await getCache(`${CACHE_PREFIX.CRM}test:2`);
  const before3 = await getCache(`${CACHE_PREFIX.INVENTORY}test:1`);
  console.log('  Before pattern invalidation:', { before1, before2, before3 });

  // Invalidate CRM pattern
  await invalidateCachePattern(`${CACHE_PREFIX.CRM}test:*`);

  // Verify CRM keys are gone but inventory key remains
  const after1 = await getCache(`${CACHE_PREFIX.CRM}test:1`);
  const after2 = await getCache(`${CACHE_PREFIX.CRM}test:2`);
  const after3 = await getCache(`${CACHE_PREFIX.INVENTORY}test:1`);
  console.log('  After pattern invalidation:', { after1, after2, after3 });

  if (!after1 && !after2 && after3) {
    console.log('  ✅ Pattern invalidation working correctly');
  } else {
    console.log('  ❌ Pattern invalidation failed');
  }

  // Cleanup
  await invalidateCache(`${CACHE_PREFIX.INVENTORY}test:1`);
}

/**
 * Test cache metrics
 */
async function testCacheMetrics() {
  console.log('\n🧪 Testing Cache Metrics...');
  
  // Reset metrics
  resetCacheMetrics();

  // Generate some cache hits and misses
  await setCache('test:metrics:1', { value: 1 }, CACHE_TTL.SHORT);
  await getCache('test:metrics:1'); // Hit
  await getCache('test:metrics:1'); // Hit
  await getCache('test:metrics:2'); // Miss
  await getCache('test:metrics:3'); // Miss

  const metrics = getCacheMetrics();
  console.log('  Metrics:', metrics);

  if (metrics.hits === 2 && metrics.misses === 2 && metrics.hitRate === 50) {
    console.log('  ✅ Cache metrics working correctly');
  } else {
    console.log('  ❌ Cache metrics failed');
  }

  // Cleanup
  await invalidateCache('test:metrics:1');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Cache Service Tests...');
  
  try {
    await testCacheAside();
    await testCacheInvalidation();
    await testPatternInvalidation();
    await testCacheMetrics();
    
    console.log('\n✅ All cache tests completed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().then(() => {
    console.log('Tests finished. Exiting...');
    process.exit(0);
  });
}

export { runTests };
