/**
 * Messages Routes — Employee / Vendor Chat
 */
const express  = require('express');
const { Message, ChatRoom } = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ── GET /api/messages/rooms ──────────────────────────────
router.get('/rooms', async (req, res, next) => {
  try {
    const rooms = await ChatRoom.find({
      storeId: req.user.storeId,
      members: req.user._id
    }).sort('-lastMessageAt').lean();
    res.json({ success: true, data: rooms });
  } catch (err) { next(err); }
});

// ── POST /api/messages/rooms — Create room ───────────────
router.post('/rooms', async (req, res, next) => {
  try {
    const { type, name, members, memberNames, icon } = req.body;

    // For direct chats, check if room already exists
    if (type === 'direct' && members?.length === 2) {
      const existing = await ChatRoom.findOne({
        storeId: req.user.storeId,
        type: 'direct',
        members: { $all: members }
      });
      if (existing) return res.json({ success: true, data: existing });
    }

    const room = await ChatRoom.create({
      storeId: req.user.storeId,
      type: type || 'direct',
      name: name || '',
      icon: icon || '💬',
      members: members || [req.user._id],
      memberNames: memberNames || [req.user.name],
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: room });
  } catch (err) { next(err); }
});

// ── GET /api/messages/:roomId — Get messages in room ─────
router.get('/:roomId', async (req, res, next) => {
  try {
    const messages = await Message.find({
      storeId: req.user.storeId,
      roomId: req.params.roomId,
      deletedAt: { $exists: false }
    }).sort('-createdAt').limit(50).lean();

    // Mark as read
    await Message.updateMany(
      { storeId: req.user.storeId, roomId: req.params.roomId, 'readBy.user': { $ne: req.user._id } },
      { $addToSet: { readBy: { user: req.user._id, readAt: new Date() } } }
    );

    res.json({ success: true, data: messages.reverse() }); // Return chronologically
  } catch (err) { next(err); }
});

// ── POST /api/messages/:roomId — Send message ────────────
router.post('/:roomId', async (req, res, next) => {
  try {
    const { content, type = 'text', replyTo } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty' });

    const message = await Message.create({
      storeId:      req.user.storeId,
      roomId:       req.params.roomId,
      sender:       req.user._id,
      senderName:   req.user.name,
      senderRole:   req.user.role,
      senderAvatar: req.user.avatar,
      content:      content.trim(),
      type,
      replyTo,
    });

    // Update room's lastMessage
    await ChatRoom.findOneAndUpdate(
      { storeId: req.user.storeId, roomId: req.params.roomId },
      { lastMessage: content.substring(0, 80), lastMessageAt: new Date() }
    );

    // Emit to socket room
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${req.params.roomId}`).emit('new_message', {
        ...message.toObject(),
        roomId: req.params.roomId,
      });
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
});

// ── POST /api/messages/:roomId/:msgId/react ───────────────
router.post('/:roomId/:msgId/react', async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ success: false });

    const existing = msg.reactions.find(r => r.emoji === emoji);
    if (existing) {
      const idx = existing.users.findIndex(u => u.toString() === req.user._id.toString());
      if (idx > -1) {
        existing.users.splice(idx, 1);
        existing.count = existing.users.length;
      } else {
        existing.users.push(req.user._id);
        existing.count = existing.users.length;
      }
    } else {
      msg.reactions.push({ emoji, users: [req.user._id], count: 1 });
    }

    await msg.save();
    res.json({ success: true, data: msg });
  } catch (err) { next(err); }
});

// ── DELETE /api/messages/:roomId/:msgId ───────────────────
router.delete('/:roomId/:msgId', async (req, res, next) => {
  try {
    const msg = await Message.findOne({ _id: req.params.msgId, sender: req.user._id });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found or not yours' });
    msg.deletedAt = new Date();
    msg.content   = '🗑️ This message was deleted';
    await msg.save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
