const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { createAutoVendorPO } = require('../utils/notifications');

const router = express.Router();
router.use(protect);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { unread, page = 1, limit = 30 } = req.query;
    const filter = { storeId: req.user.storeId };
    if (unread === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(+limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ storeId: req.user.storeId, isRead: false })
    ]);

    res.json({ success: true, data: notifications, meta: { total, unreadCount } });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true, readAt: new Date(), $addToSet: { readBy: req.user._id }
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ storeId: req.user.storeId, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

// POST /api/notifications/:id/create-po — Auto-create PO for low stock
router.post('/:id/create-po', async (req, res, next) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (notif.poCreated) return res.status(400).json({ success: false, message: 'PO already created for this alert' });

    const io = req.app.get('io');
    const po = await createAutoVendorPO(notif.relatedProduct, req.user.storeId, io);
    if (!po) return res.status(500).json({ success: false, message: 'Could not create PO' });

    res.json({ success: true, message: `Purchase Order ${po.orderNo} created!`, data: po });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
