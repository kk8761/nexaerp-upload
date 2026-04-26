/**
 * NexaERP — Automation Rules Engine Routes
 */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const AutomationRule = require('../models/AutomationRule');
const AuditLog       = require('../models/AuditLog');

// GET /api/automation/rules
router.get('/rules', auth, async (req, res) => {
  try {
    const rules = await AutomationRule.find({ storeId: req.user.storeId })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/automation/rules
router.post('/rules', auth, async (req, res) => {
  try {
    if (!['owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    const rule = await AutomationRule.create({
      ...req.body,
      storeId: req.user.storeId,
      createdBy: req.user._id,
    });
    await AuditLog.create({
      storeId: req.user.storeId, userId: req.user._id,
      userName: req.user.name, userRole: req.user.role,
      userIp: req.ip, action: 'SETTINGS_UPDATED',
      entity: 'AutomationRule', entityId: String(rule._id),
      description: `Automation rule "${rule.name}" created`,
    });
    res.status(201).json({ success: true, data: rule });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PATCH /api/automation/rules/:id
router.patch('/rules/:id', auth, async (req, res) => {
  try {
    if (!['owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    const rule = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId },
      req.body, { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// DELETE /api/automation/rules/:id
router.delete('/rules/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only owner can delete rules' });
    }
    await AutomationRule.findOneAndDelete({ _id: req.params.id, storeId: req.user.storeId });
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/automation/test — test-run a rule without saving
router.post('/test', auth, async (req, res) => {
  try {
    const { trigger, conditions, testContext } = req.body;
    // Evaluate conditions against test context
    const results = (conditions || []).map(cond => {
      const fieldValue = testContext?.[cond.field];
      let pass = false;
      switch (cond.operator) {
        case 'eq':  pass = fieldValue == cond.value; break;
        case 'neq': pass = fieldValue != cond.value; break;
        case 'gt':  pass = +fieldValue > +cond.value; break;
        case 'gte': pass = +fieldValue >= +cond.value; break;
        case 'lt':  pass = +fieldValue < +cond.value; break;
        case 'lte': pass = +fieldValue <= +cond.value; break;
        case 'contains': pass = String(fieldValue).includes(cond.value); break;
        default:    pass = false;
      }
      return { ...cond, fieldValue, pass };
    });
    const allPass = results.every(r => r.pass);
    res.json({ success: true, data: { allPass, results, trigger } });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// GET /api/automation/templates — preset rules to quick-add
router.get('/templates', auth, async (req, res) => {
  const templates = [
    {
      name: 'Auto Reorder on Low Stock',
      description: 'Create a purchase requisition when product stock falls below reorder level',
      trigger: 'stock_below_threshold',
      triggerConfig: { thresholdField: 'stock', thresholdRelative: 'reorderLevel' },
      conditions: [],
      actions: [{ type: 'create_pr', config: { priority: 'high', autoFill: true } }],
    },
    {
      name: 'Critical Stock Alert',
      description: 'Send notification when any product reaches zero stock',
      trigger: 'stock_zero',
      conditions: [],
      actions: [{ type: 'send_notification', config: { title: '🚨 Out of Stock', severity: 'critical' } }],
    },
    {
      name: 'PO Approval Reminder',
      description: 'Notify manager when PO is waiting for release',
      trigger: 'po_created',
      conditions: [{ field: 'po.releaseStatus', operator: 'eq', value: 'to_release' }],
      actions: [{ type: 'send_notification', config: { title: 'PO Awaiting Approval', targetRole: 'manager' } }],
    },
    {
      name: 'GRN Auto-Post Stock',
      description: 'Automatically update inventory when a GRN is verified',
      trigger: 'grn_received',
      conditions: [{ field: 'grn.qualityCheck', operator: 'eq', value: 'passed' }],
      actions: [{ type: 'update_field', config: { field: 'grn.stockUpdated', value: true } }],
    },
    {
      name: 'Weekly Payroll Alert',
      description: 'Remind accountant to process payroll every Monday',
      trigger: 'weekly_schedule',
      triggerConfig: { dayOfWeek: 1 }, // Monday
      conditions: [],
      actions: [{ type: 'send_notification', config: { title: '💰 Weekly Payroll Due', targetRole: 'accountant' } }],
    },
  ];
  res.json({ success: true, data: templates });
});

module.exports = router;
