/**
 * NexaERP — Socket.io Handler
 * Real-time events: notifications, stock updates, POS sync
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function socketSetup(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || '*',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080',
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Auth Middleware ─────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      // Allow unauthenticated for demo mode
      socket.user = null;
      socket.storeId = 'store-001';
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.storeId = decoded.storeId || 'store-001';
      next();
    } catch {
      socket.user = null;
      socket.storeId = 'store-001';
      next();
    }
  });

  // ── Connection Handler ──────────────────────────────────
  io.on('connection', (socket) => {
    const storeId = socket.storeId;
    console.log(`🔌 Socket connected: ${socket.id} | Store: ${storeId} | User: ${socket.user?.name || 'anonymous'}`);

    // Join store room (all users of the same store see the same events)
    socket.join(storeId);

    // Broadcast to store that someone came online
    if (socket.user) {
      socket.to(storeId).emit('user_online', {
        userId: socket.user.id,
        name:   socket.user.name,
        role:   socket.user.role
      });
    }

    // ── Manual Stock Update ─────────────────────────────
    socket.on('stock_update', (data) => {
      // Broadcast to all users in the store
      socket.to(storeId).emit('stock_changed', {
        productId:   data.productId,
        productName: data.productName,
        newStock:    data.newStock,
        change:      data.change,
        updatedBy:   socket.user?.name || 'System'
      });
    });

    // ── POS Sale Broadcast ──────────────────────────────
    socket.on('sale_completed', (data) => {
      socket.to(storeId).emit('new_sale', {
        orderNo:   data.orderNo,
        total:     data.total,
        customer:  data.customerName,
        cashier:   socket.user?.name || 'Cashier',
        timestamp: new Date()
      });
    });

    // ── Mark Notification Read ──────────────────────────
    socket.on('mark_read', async (notificationId) => {
      try {
        const Notification = require('../models/Notification');
        await Notification.findByIdAndUpdate(notificationId, {
          isRead: true, readAt: new Date()
        });
        socket.emit('notification_read', { id: notificationId });
      } catch {}
    });

    // ── Request unread count ────────────────────────────
    socket.on('get_unread_count', async () => {
      try {
        const Notification = require('../models/Notification');
        const count = await Notification.countDocuments({ storeId, isRead: false });
        socket.emit('unread_count', { count });
      } catch {}
    });

    // ── Order Stage Update ──────────────────────────────
    socket.on('order_stage_update', (data) => {
      io.to(storeId).emit('order_updated', data);
    });

    // ── Disconnect ──────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.id}`);
      if (socket.user) {
        socket.to(storeId).emit('user_offline', { userId: socket.user.id });
      }
    });

    // ── Ping / Health ───────────────────────────────────
    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));
  });

  return io;
}

module.exports = socketSetup;
