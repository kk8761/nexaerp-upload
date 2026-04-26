/**
 * NexaERP — Main Server Entry Point (TypeScript)
 * Enterprise-grade ERP platform with monolithic architecture
 */

import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import viewRoutes from './routes/viewRoutes';

dotenv.config();

// ─── App Setup ─────────────────────────────────────────────
const app: Application = express();
const server = http.createServer(app);

// ─── CORS Configuration ────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://dapper-kheer-031b2c.netlify.app',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        return callback(null, true);
      }
      callback(null, true); // Permissive in dev; tighten in prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Middleware ────────────────────────────────────────────
// Security headers (helmet)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Request logging (morgan)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9, 6 is default)
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import passport from 'passport';
import { sessionConfig } from './config/session';
import { configurePassport } from './config/passport';

// Cookie parser middleware
app.use(cookieParser(process.env.COOKIE_SECRET || 'nexaerp-secret-key'));

// Session middleware
app.use(sessionConfig);

// Initialize Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// ─── View Engine Setup ─────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Disable view caching in development for hot reload
if (process.env.NODE_ENV !== 'production') {
  app.set('view cache', false);
}

// ─── Static Asset Serving ──────────────────────────────────
// Serve static files from the root directory (css, js, assets)
app.use('/css', express.static(path.join(__dirname, '../../css'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));
app.use('/js', express.static(path.join(__dirname, '../../js'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));
app.use('/assets', express.static(path.join(__dirname, '../../assets'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));
app.use(express.static(path.join(__dirname, '../../'), { 
  index: false,
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// ─── Rate Limiting ─────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

app.use(generalLimiter);

import authRoutes from './routes/auth.routes';
import crmRoutes from './routes/crm.routes';
import inventoryRoutes from './routes/inventory.routes';
import accountingRoutes from './routes/accounting.routes';
import dmsRoutes from './routes/dms.routes';
import workflowRoutes from './routes/workflow.routes';
import hrmsRoutes from './routes/hrms.routes';
import hcmRoutes from './routes/hcm.routes';
import manufacturingRoutes from './routes/manufacturing.routes';
import scmRoutes from './routes/scm.routes';
import biRoutes from './routes/bi.routes';
import integrationsRoutes from './routes/integrations.routes';
import monitoringRoutes from './routes/monitoring.routes';
import auditRoutes from './routes/audit.routes';
import userManagementRoutes from './routes/user-management.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import qualityManagementRoutes from './routes/qualityManagement.routes';
import warehouseManagementRoutes from './routes/warehouse-management.routes';
import eamRoutes from './routes/eam.routes';
import projectRoutes from './routes/project.routes';

// ─── Serve Static Frontend ─────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── View Routes ───────────────────────────────────────────
app.use('/', viewRoutes);

// ─── API Routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/dms', dmsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/hrms', hrmsRoutes);
app.use('/api/hcm', hcmRoutes);
app.use('/api/manufacturing', manufacturingRoutes);
app.use('/api/scm', scmRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/quality', qualityManagementRoutes);
app.use('/api/warehouse', warehouseManagementRoutes);
app.use('/api/eam', eamRoutes);
app.use('/api/projects', projectRoutes);

// ─── Health Check ──────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NexaERP Backend',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '🚀 NexaERP API v2.0 (TypeScript) is running',
    status: 'ok',
  });
});

// ─── Error Handler ─────────────────────────────────────────
interface ErrorWithStatus extends Error {
  status?: number;
  code?: number | string;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
}

app.use((err: ErrorWithStatus, _req: Request, res: Response, _next: NextFunction) => {
  console.error('🔴 Error:', err.message);

  if (err.name === 'ValidationError' && err.errors) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => e.message),
    });
    return;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── 404 Handler ───────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

import connectDB from './config/database';
import { connectPostgres } from './config/prisma';
import { connectRedis } from './config/redis';
import { databaseMonitor } from './services/database.monitor';
import { warmCriticalCaches } from './services/cache.warming';
import { SessionCleanupService } from './services/session.cleanup';
import { AuditScheduler } from './services/audit.scheduler';
import inventoryScheduler from './services/inventory.scheduler';
import workflowTriggerService from './services/workflowTrigger.service';
import workflowTemplateService from './services/workflowTemplate.service';

// ─── Start Server ──────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';

const startServer = async () => {
  try {
    // Initialize Database Connections
    await Promise.all([
      connectDB().catch(_err => console.warn('⚠️ MongoDB connection skipped or failed')),
      connectPostgres().catch(_err => console.warn('⚠️ PostgreSQL connection skipped or failed')),
      connectRedis().catch(_err => console.warn('⚠️ Redis connection skipped or failed'))
    ]);

    // Start database monitoring (every 5 minutes)
    if (process.env.NODE_ENV === 'production') {
      databaseMonitor.startMonitoring(5 * 60 * 1000);
    }

    // Start session cleanup service (runs hourly)
    SessionCleanupService.start();

    // Start audit retention scheduler (runs daily at 2:00 AM)
    AuditScheduler.start();

    // Start inventory scheduler (reorder points, expiry checks)
    inventoryScheduler.start();

    // Initialize workflow templates and scheduled workflows
    try {
      await workflowTemplateService.initializeDefaultTemplates();
      await workflowTriggerService.initializeScheduledWorkflows();
      console.log('✅ Workflow system initialized');
    } catch (err) {
      console.warn('⚠️ Workflow initialization failed:', err);
    }

    // Warm critical caches after connections are established
    // Run in background to not block server startup
    warmCriticalCaches().catch(err => 
      console.warn('⚠️ Cache warming failed:', err.message)
    );

    server.listen(PORT, HOST, () => {
      console.log(`\n  🚀 NexaERP Server running on port ${PORT}`);
      console.log(`  🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  📦 TypeScript: Enabled`);
      console.log(
        `  📡 DB: ${process.env.MONGODB_URI ? 'MongoDB URI configured' : '⚠️ No MONGODB_URI set'}`
      );
      console.log(
        `  📡 DB: ${process.env.DATABASE_URL ? 'PostgreSQL URL configured' : '⚠️ No DATABASE_URL set'}\n`
      );
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ─── Graceful Shutdown ─────────────────────────────────────
process.on('unhandledRejection', (err: Error) => {
  console.error('⚠️ Unhandled rejection:', err.message);
});

process.on('uncaughtException', (err: Error) => {
  console.error('⚠️ Uncaught exception:', err.message);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  SessionCleanupService.stop();
  AuditScheduler.stop();
  workflowTriggerService.cleanup();
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  SessionCleanupService.stop();
  AuditScheduler.stop();
  workflowTriggerService.cleanup();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, server };
