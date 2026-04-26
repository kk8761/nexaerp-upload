import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { applyMiddleware } from '../middleware/prisma.middleware';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
  var pgPool: Pool | undefined;
}

// Configure connection pool with optimal settings
const poolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'nexaerp',
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10), // Maximum pool size
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000', 10), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000', 10), // 10 seconds
  allowExitOnIdle: false,
  // Enable keep-alive to prevent connection drops
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

const pool = global.pgPool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}

// Monitor pool events for debugging and metrics
pool.on('connect', () => {
  console.log('📊 PostgreSQL: New client connected to pool');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

pool.on('remove', () => {
  console.log('📊 PostgreSQL: Client removed from pool');
});

const adapter = new PrismaPg(pool);

const prisma = global.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Apply middleware
applyMiddleware(prisma, {
  enableLogging: process.env.NODE_ENV === 'development',
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function connectPostgres(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL Connected via Prisma with connection pooling');
    
    // Test the connection
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 PostgreSQL version:', result);
    
    // Log pool statistics
    console.log('📊 Connection pool stats:', {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    });
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    throw error;
  }
}

export async function disconnectPostgres(): Promise<void> {
  try {
    await prisma.$disconnect();
    await pool.end();
    console.log('✅ PostgreSQL disconnected and pool closed');
  } catch (error) {
    console.error('❌ PostgreSQL disconnect error:', error);
    throw error;
  }
}

// Export pool for direct queries if needed
export { pool };

export default prisma;
