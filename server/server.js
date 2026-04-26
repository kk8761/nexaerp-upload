/**
 * NexaERP — Main Server Entry Point v2
 * Crash-safe startup with graceful MongoDB fallback
 */

require('dotenv').config();
const express   = require('express');
const http      = require('http');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

// ─── App Setup ─────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://dapper-kheer-031b2c.netlify.app',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
    callback(null, true); // Permissive in dev; tighten in prod
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiting ─────────────────────────────────────────
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

// ─── Health Check (always works, even if DB is down) ───────
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NexaERP Backend',
    version: '2.0.0',
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting...'
  });
});

app.get('/', (req, res) => {
  res.json({ message: '🚀 NexaERP API v2 is running', status: 'ok' });
});

// ─── Socket.io Setup ───────────────────────────────────────
let io;
try {
  const socketSetup = require('./socket/handlers');
  io = socketSetup(server);
  app.set('io', io);
  console.log('✅ Socket.io initialized');
} catch (err) {
  console.error('⚠️ Socket.io setup failed:', err.message);
}

// ─── DB Connect (non-blocking startup) ────────────────────
async function startDatabase() {
  try {
    const connectDB = require('./config/db');
    await connectDB();

    // Only set up routes after DB is connected
    setupRoutes();

    // Start cron jobs
    startCrons();
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    console.log('⚠️ Starting server without full DB features...');
    setupRoutes(); // Still serve health check and partial routes
  }
}

// ─── Routes Setup ─────────────────────────────────────────
function setupRoutes() {
  try { app.use('/api/auth',          authLimiter, require('./routes/auth')); } catch(e) { console.error('auth routes:', e.message); }
  try { app.use('/api/sessions',      require('./routes/sessions')); } catch(e) { console.error('sessions routes:', e.message); }
  try { app.use('/api/products',      require('./routes/products')); } catch(e) { console.error('products routes:', e.message); }
  try { app.use('/api/orders',        require('./routes/orders')); } catch(e) { console.error('orders routes:', e.message); }
  try { app.use('/api/customers',     require('./routes/customers')); } catch(e) { console.error('customers routes:', e.message); }
  try { app.use('/api/staff',         require('./routes/staff')); } catch(e) { console.error('staff routes:', e.message); }
  try { app.use('/api/transactions',  require('./routes/transactions')); } catch(e) { console.error('transactions routes:', e.message); }
  try { app.use('/api/notifications', require('./routes/notifications')); } catch(e) { console.error('notifications routes:', e.message); }
  try { app.use('/api/suppliers',     require('./routes/suppliers')); } catch(e) { console.error('suppliers routes:', e.message); }
  try { app.use('/api/analytics',     require('./routes/analytics')); } catch(e) { console.error('analytics routes:', e.message); }
  try { app.use('/api/ledger',        require('./routes/ledger')); } catch(e) { console.error('ledger routes:', e.message); }
  try { app.use('/api/messages',      require('./routes/messages')); } catch(e) { console.error('messages routes:', e.message); }

  // ── Enterprise Modules (v3) ──────────────────────────────────────
  try { app.use('/api/procurement',    require('./routes/procurement')); } catch(e) { console.error('procurement routes:', e.message); }
  try { app.use('/api/audit',          require('./routes/audit')); } catch(e) { console.error('audit routes:', e.message); }
  try { app.use('/api/stock-transfers',require('./routes/stockTransfers')); } catch(e) { console.error('stockTransfers routes:', e.message); }
  try { app.use('/api/forecast',       require('./routes/forecast')); } catch(e) { console.error('forecast routes:', e.message); }
  try { app.use('/api/automation',     require('./routes/automation')); } catch(e) { console.error('automation routes:', e.message); }

  // ── Enterprise Modules (v3.5) ────────────────────────────────────
  try { app.use('/api/crm',            require('./routes/crm')); } catch(e) { console.error('crm routes:', e.message); }
  try { app.use('/api/hrms',           require('./routes/hrms')); } catch(e) { console.error('hrms routes:', e.message); }
  try { app.use('/api/manufacturing',  require('./routes/manufacturing')); } catch(e) { console.error('manufacturing routes:', e.message); }
  try { app.use('/api/governance',     require('./routes/governance')); } catch(e) { console.error('governance routes:', e.message); }
  try { app.use('/api/rbac',           require('./routes/rbac.routes')); } catch(e) { console.error('rbac routes:', e.message); }

  // 404 fallback
  app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` }));

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('🔴 Error:', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(err.errors).map(e => e.message) });
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      return res.status(409).json({ success: false, message: `${field} already exists` });
    }
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' });
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
  });
}

// ─── Cron Jobs ─────────────────────────────────────────────
function startCrons() {
  try {
    const cron = require('node-cron');
    const { runLowStockCheck } = require('./utils/notifications');
    const { getSessionManager } = require('./services/sessionManager');

    // Daily low-stock check at 9 AM IST
    cron.schedule('0 3 * * *', async () => { // 9 AM IST = 3:30 AM UTC
      try {
        const notifications = await runLowStockCheck(io);
        console.log(`✅ [CRON] Created ${notifications.length} low stock notifications`);
      } catch (err) { console.error('❌ [CRON]', err.message); }
    });

    // Critical stock every 5 min
    cron.schedule('*/5 * * * *', async () => {
      try {
        const Product = require('./models/Product');
        const critical = await Product.find({ stock: 0, isActive: true });
        if (critical.length > 0 && io) {
          io.emit('critical_stock', { count: critical.length, items: critical.map(p => p.name) });
        }
      } catch {}
    });

    // Session cleanup every hour
    cron.schedule('0 * * * *', async () => {
      try {
        const sessionManager = getSessionManager();
        const cleaned = await sessionManager.cleanupExpiredSessions();
        console.log(`✅ [CRON] Cleaned up ${cleaned} expired session references`);
      } catch (err) { console.error('❌ [CRON] Session cleanup failed:', err.message); }
    });

    console.log('✅ Cron jobs started');
  } catch (err) {
    console.error('⚠️ Cron jobs failed to start:', err.message);
  }
}

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, async () => {
  console.log(`\n  🚀 NexaERP Server running on port ${PORT}`);
  console.log(`  🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  📡 DB: ${process.env.MONGODB_URI ? 'Connecting to MongoDB Atlas...' : '⚠️ No MONGODB_URI set'}\n`);
  await startDatabase();
});

// Handle unhandled rejections gracefully (don't crash)
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled rejection (non-fatal):', err.message);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught exception (non-fatal):', err.message);
});

module.exports = { app, server };
