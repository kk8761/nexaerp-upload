/**
 * NexaERP — Audit Log Routes
 * Read-only API for compliance and audit trail
 */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// GET /api/audit — paginated audit trail
router.get('/', auth, async (req, res) => {
  try {
    // Only owner/manager can view full audit logs
    if (!['owner', 'manager', 'accountant'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { page = 1, limit = 50, action, userId, entity, severity, branch, from, to } = req.query;
    const filter = { storeId: req.user.storeId };

    if (action)   filter.action   = action;
    if (userId)   filter.userId   = userId;
    if (entity)   filter.entity   = entity;
    if (severity) filter.severity = severity;
    if (branch)   filter.branch   = branch;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit)
      .populate('userId', 'name email role');
    const total = await AuditLog.countDocuments(filter);

    res.json({ success: true, data: logs, meta: { total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/audit/entity/:entity/:id — trail for a specific record
router.get('/entity/:entity/:id', auth, async (req, res) => {
  try {
    if (!['owner', 'manager', 'accountant'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const logs = await AuditLog.find({
      storeId: req.user.storeId,
      entity: req.params.entity,
      entityId: req.params.id,
    }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/audit/user/:userId — activity for a specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    if (!['owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const logs = await AuditLog.find({
      storeId: req.user.storeId,
      userId: req.params.userId,
    }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/audit/summary — compliance dashboard stats
router.get('/summary', auth, async (req, res) => {
  try {
    if (!['owner', 'manager', 'accountant'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const sid = req.user.storeId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [total, todayCount, criticalCount, recentCritical] = await Promise.all([
      AuditLog.countDocuments({ storeId: sid }),
      AuditLog.countDocuments({ storeId: sid, createdAt: { $gte: today } }),
      AuditLog.countDocuments({ storeId: sid, severity: 'critical' }),
      AuditLog.find({ storeId: sid, severity: 'critical' }).sort({ createdAt: -1 }).limit(5),
    ]);
    res.json({ success: true, data: { total, todayCount, criticalCount, recentCritical } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/audit/log — internal route for manual audit entries
router.post('/log', auth, async (req, res) => {
  try {
    const log = await AuditLog.create({
      ...req.body,
      storeId: req.user.storeId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      userIp: req.ip,
      action: req.body.action || 'CUSTOM',
    });
    res.status(201).json({ success: true, data: log });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

module.exports = router;
