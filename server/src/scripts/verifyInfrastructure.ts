/**
 * Infrastructure Verification Script
 * Task 4: Checkpoint - Verify infrastructure setup
 * 
 * This script verifies:
 * - Database connectivity (PostgreSQL and MongoDB)
 * - Redis caching functionality
 * - Server-side rendering setup
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import prisma from '../config/prisma';
import { redis, getRedisHealth, getCacheStats } from '../config/redis';
import path from 'path';
import fs from 'fs';

dotenv.config();

interface VerificationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: Record<string, unknown>;
}

const results: VerificationResult[] = [];

/**
 * Verify PostgreSQL connectivity
 */
async function verifyPostgreSQL(): Promise<void> {
  console.log('\n🔍 Verifying PostgreSQL connection...');
  
  try {
    // Test connection
    await prisma.$connect();
    
    // Get version
    const versionResult = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    const version = versionResult[0]?.version || 'unknown';
    
    // Test a simple query
    const testQuery = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
    const serverTime = testQuery[0]?.now;
    
    results.push({
      component: 'PostgreSQL',
      status: 'PASS',
      message: 'PostgreSQL connection successful',
      details: {
        version: version.split(' ')[0] + ' ' + version.split(' ')[1],
        serverTime,
        connectionString: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
      },
    });
    
    console.log('✅ PostgreSQL: Connected');
  } catch (error) {
    results.push({
      component: 'PostgreSQL',
      status: 'FAIL',
      message: `PostgreSQL connection failed: ${(error as Error).message}`,
    });
    console.error('❌ PostgreSQL: Failed');
  }
}

/**
 * Verify MongoDB connectivity
 */
async function verifyMongoDB(): Promise<void> {
  console.log('\n🔍 Verifying MongoDB connection...');
  
  try {
    if (!process.env.MONGODB_URI) {
      results.push({
        component: 'MongoDB',
        status: 'WARN',
        message: 'MongoDB URI not configured (optional)',
      });
      console.log('⚠️  MongoDB: Not configured (optional)');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB database connection not established');
    }
    
    const adminDb = db.admin();
    const serverInfo = await adminDb.serverInfo();
    
    results.push({
      component: 'MongoDB',
      status: 'PASS',
      message: 'MongoDB connection successful',
      details: {
        version: serverInfo.version,
        host: mongoose.connection.host,
        database: mongoose.connection.name,
      },
    });
    
    console.log('✅ MongoDB: Connected');
  } catch (error) {
    results.push({
      component: 'MongoDB',
      status: 'FAIL',
      message: `MongoDB connection failed: ${(error as Error).message}`,
    });
    console.error('❌ MongoDB: Failed');
  }
}

/**
 * Verify Redis connectivity and caching
 */
async function verifyRedis(): Promise<void> {
  console.log('\n🔍 Verifying Redis connection and caching...');
  
  try {
    // Test connection
    const health = await getRedisHealth();
    
    if (health.status !== 'healthy') {
      throw new Error('Redis health check failed');
    }
    
    // Test cache operations
    const testKey = 'infrastructure:test:' + Date.now();
    const testValue = { timestamp: new Date().toISOString(), test: true };
    
    // SET operation
    await redis.set(testKey, JSON.stringify(testValue), 'EX', 60);
    
    // GET operation
    const retrieved = await redis.get(testKey);
    const parsedValue = JSON.parse(retrieved || '{}');
    
    // Verify data integrity
    if (parsedValue.test !== true) {
      throw new Error('Cache data integrity check failed');
    }
    
    // DELETE operation
    await redis.del(testKey);
    
    // Get cache statistics
    const stats = await getCacheStats();
    
    results.push({
      component: 'Redis',
      status: 'PASS',
      message: 'Redis connection and caching functional',
      details: {
        latency: `${health.latency}ms`,
        memoryUsage: health.memoryUsage,
        uptime: health.uptime ? `${Math.floor(health.uptime / 3600)}h` : 'unknown',
        cacheHitRate: `${stats.hitRate}%`,
        totalKeys: stats.keys,
      },
    });
    
    console.log('✅ Redis: Connected and functional');
  } catch (error) {
    results.push({
      component: 'Redis',
      status: 'FAIL',
      message: `Redis verification failed: ${(error as Error).message}`,
    });
    console.error('❌ Redis: Failed');
  }
}

/**
 * Verify server-side rendering setup
 */
async function verifySSR(): Promise<void> {
  console.log('\n🔍 Verifying server-side rendering setup...');
  
  try {
    const viewsPath = path.join(__dirname, '../views');
    const layoutsPath = path.join(viewsPath, 'layouts');
    const pagesPath = path.join(viewsPath, 'pages');
    
    // Check if views directory exists
    if (!fs.existsSync(viewsPath)) {
      throw new Error('Views directory not found');
    }
    
    // Check for layouts
    const layoutFiles = fs.existsSync(layoutsPath) 
      ? fs.readdirSync(layoutsPath).filter(f => f.endsWith('.ejs'))
      : [];
    
    // Check for pages
    const pageFiles = fs.existsSync(pagesPath)
      ? fs.readdirSync(pagesPath).filter(f => f.endsWith('.ejs'))
      : [];
    
    // Check for static assets
    const cssPath = path.join(__dirname, '../../../css');
    const jsPath = path.join(__dirname, '../../../js');
    const assetsPath = path.join(__dirname, '../../../assets');
    
    const cssExists = fs.existsSync(cssPath);
    const jsExists = fs.existsSync(jsPath);
    const assetsExists = fs.existsSync(assetsPath);
    
    if (layoutFiles.length === 0 && pageFiles.length === 0) {
      results.push({
        component: 'Server-Side Rendering',
        status: 'WARN',
        message: 'SSR configured but no templates found',
        details: {
          viewsPath,
          layoutsFound: layoutFiles.length,
          pagesFound: pageFiles.length,
          staticAssets: { css: cssExists, js: jsExists, assets: assetsExists },
        },
      });
      console.log('⚠️  SSR: Configured but no templates');
    } else {
      results.push({
        component: 'Server-Side Rendering',
        status: 'PASS',
        message: 'SSR setup verified',
        details: {
          viewEngine: 'EJS',
          viewsPath,
          layoutsFound: layoutFiles.length,
          pagesFound: pageFiles.length,
          staticAssets: { css: cssExists, js: jsExists, assets: assetsExists },
        },
      });
      console.log('✅ SSR: Setup verified');
    }
  } catch (error) {
    results.push({
      component: 'Server-Side Rendering',
      status: 'FAIL',
      message: `SSR verification failed: ${(error as Error).message}`,
    });
    console.error('❌ SSR: Failed');
  }
}

/**
 * Print summary report
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 INFRASTRUCTURE VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`\n${icon} ${result.component}: ${result.status}`);
    console.log(`   ${result.message}`);
    
    if (result.details) {
      Object.entries(result.details).forEach(([key, value]) => {
        console.log(`   - ${key}: ${JSON.stringify(value)}`);
      });
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Warnings: ${warnings}`);
  console.log('='.repeat(60) + '\n');
  
  if (failed > 0) {
    console.log('❌ Infrastructure verification FAILED');
    console.log('Please fix the failed components before proceeding.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  Infrastructure verification completed with warnings');
    console.log('Optional components are not configured.\n');
  } else {
    console.log('✅ All infrastructure components verified successfully!\n');
  }
}

/**
 * Main verification function
 */
async function verifyInfrastructure(): Promise<void> {
  console.log('🚀 Starting infrastructure verification...');
  console.log('='.repeat(60));
  
  try {
    await verifyPostgreSQL();
    await verifyMongoDB();
    await verifyRedis();
    await verifySSR();
    
    printSummary();
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error);
    process.exit(1);
  } finally {
    // Cleanup connections
    try {
      await prisma.$disconnect();
      await mongoose.disconnect();
      redis.disconnect();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Run verification if executed directly
if (require.main === module) {
  verifyInfrastructure();
}

export { verifyInfrastructure, VerificationResult };
