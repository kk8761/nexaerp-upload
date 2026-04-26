/**
 * NexaERP — CRM Routes (Leads & Opportunities)
 */
const router = require('express').Router();
const auth = require('../middleware/auth');
const Lead = require('../models/Lead');
const AuditLog = require('../models/AuditLog');

// GET /api/crm/leads
router.get('/leads', auth, async (req, res) => {
  try {
    const leads = await Lead.find({ storeId: req.user.storeId }).sort({ createdAt: -1 });
    res.json({ success: true, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/crm/leads
router.post('/leads', auth, async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      storeId: req.user.storeId,
    });
    
    await AuditLog.create({
      storeId: req.user.storeId, userId: req.user._id,
      userName: req.user.name, userRole: req.user.role,
      userIp: req.ip, action: 'LEAD_CREATED',
      entity: 'Lead', entityId: String(lead._id),
      description: `New lead "${lead.name}" created from ${lead.source}`,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/crm/leads/:id/status
router.patch('/leads/:id/status', auth, async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId },
      { status: req.body.status },
      { new: true }
    );
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
