/**
 * NexaERP — Procurement Routes (MM-PUR)
 * Handles PRs, POs, and GRNs
 */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder       = require('../models/PurchaseOrder');
const GoodsReceiptNote    = require('../models/GoodsReceiptNote');
const AuditLog            = require('../models/AuditLog');
const Product             = require('../models/Product');

// ─── Helper: log audit ─────────────────────────────────────
async function logAudit(req, action, entity, entityId, entityRef, desc, oldVal, newVal) {
  try {
    await AuditLog.create({
      storeId: req.user.storeId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      userIp: req.ip,
      action, entity, entityId: String(entityId), entityRef,
      description: desc,
      oldValue: oldVal,
      newValue: newVal,
      branch: req.user.branch || 'main',
    });
  } catch (e) { console.error('Audit log error:', e.message); }
}

// ═══════════════════════════════════════════════
// PURCHASE REQUISITIONS
// ═══════════════════════════════════════════════

// GET /api/procurement/requisitions
router.get('/requisitions', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, branch } = req.query;
    const filter = { storeId: req.user.storeId };
    if (status) filter.status = status;
    if (branch && branch !== 'all') filter.branch = branch;

    const prs = await PurchaseRequisition.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit)
      .populate('requestedBy', 'name role');
    const total = await PurchaseRequisition.countDocuments(filter);
    res.json({ success: true, data: prs, meta: { total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/procurement/requisitions
router.post('/requisitions', auth, async (req, res) => {
  try {
    const pr = await PurchaseRequisition.create({
      ...req.body,
      storeId: req.user.storeId,
      requestedBy: req.user._id,
      requesterName: req.user.name,
      status: 'draft',
    });
    await logAudit(req, 'PR_CREATED', 'PurchaseRequisition', pr._id, pr.prNumber, `PR ${pr.prNumber} created by ${req.user.name}`);
    res.status(201).json({ success: true, data: pr });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PATCH /api/procurement/requisitions/:id/submit
router.patch('/requisitions/:id/submit', auth, async (req, res) => {
  try {
    const pr = await PurchaseRequisition.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId, status: 'draft' },
      { status: 'submitted', currentLevel: 1 },
      { new: true }
    );
    if (!pr) return res.status(404).json({ success: false, message: 'PR not found or already submitted' });
    await logAudit(req, 'PR_CREATED', 'PurchaseRequisition', pr._id, pr.prNumber, `PR ${pr.prNumber} submitted for approval`);
    res.json({ success: true, data: pr });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/procurement/requisitions/:id/approve
router.patch('/requisitions/:id/approve', auth, async (req, res) => {
  try {
    const { approved, comment } = req.body;
    const pr = await PurchaseRequisition.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!pr) return res.status(404).json({ success: false, message: 'PR not found' });

    const newStatus = approved ? 'approved' : 'rejected';
    pr.status = newStatus;
    pr.approvalChain.push({
      level: pr.currentLevel,
      approver: req.user._id,
      approverName: req.user.name,
      status: approved ? 'approved' : 'rejected',
      comment,
      decidedAt: new Date(),
    });
    await pr.save();
    await logAudit(req, approved ? 'PR_APPROVED' : 'PR_REJECTED', 'PurchaseRequisition', pr._id, pr.prNumber,
      `PR ${pr.prNumber} ${newStatus} by ${req.user.name}`);
    res.json({ success: true, data: pr });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════

// GET /api/procurement/orders
router.get('/orders', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20, branch } = req.query;
    const filter = { storeId: req.user.storeId };
    if (status) filter.status = status;
    if (branch && branch !== 'all') filter.branch = branch;

    const pos = await PurchaseOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit)
      .populate('supplierId', 'name phone');
    const total = await PurchaseOrder.countDocuments(filter);
    res.json({ success: true, data: pos, meta: { total, page: +page } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/procurement/orders
router.post('/orders', auth, async (req, res) => {
  try {
    const po = await PurchaseOrder.create({
      ...req.body,
      storeId: req.user.storeId,
      createdBy: req.user._id,
    });
    // Update PR status if referenced
    if (po.prReference) {
      await PurchaseRequisition.findByIdAndUpdate(po.prReference, { status: 'converted_to_po', convertedPO: po._id });
    }
    await logAudit(req, 'PO_CREATED', 'PurchaseOrder', po._id, po.poNumber, `PO ${po.poNumber} created`);
    res.status(201).json({ success: true, data: po });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PATCH /api/procurement/orders/:id/release
router.patch('/orders/:id/release', auth, async (req, res) => {
  try {
    if (!['owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId },
      { releaseStatus: 'released', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
    await logAudit(req, 'PO_RELEASED', 'PurchaseOrder', po._id, po.poNumber, `PO ${po.poNumber} released by ${req.user.name}`);
    res.json({ success: true, data: po });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════
// GOODS RECEIPT NOTES
// ═══════════════════════════════════════════════

// POST /api/procurement/grn
router.post('/grn', auth, async (req, res) => {
  try {
    const grn = await GoodsReceiptNote.create({
      ...req.body,
      storeId: req.user.storeId,
      receivedBy: req.user._id,
      receivedByName: req.user.name,
    });

    // Update PO status
    const po = await PurchaseOrder.findById(grn.poId);
    if (po) {
      po.grnList.push(grn._id);
      const totalReceived = grn.items.reduce((s, i) => s + i.receivedQty, 0);
      const totalOrdered  = po.items.reduce((s, i) => s + i.quantity, 0);
      po.status = totalReceived >= totalOrdered ? 'received' : 'partial_received';
      await po.save();
    }

    // Auto-update product stock if quality check passed
    if (req.body.qualityCheck === 'passed' && req.body.updateStock) {
      for (const item of grn.items) {
        if (item.receivedQty > 0 && item.productId) { // assuming productId was sent
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.receivedQty - item.rejectedQty } });
        }
      }
      grn.stockUpdated = true;
      await grn.save();
    }

    await logAudit(req, 'GRN_CREATED', 'GoodsReceiptNote', grn._id, grn.grnNumber, `GRN ${grn.grnNumber} created`);
    res.status(201).json({ success: true, data: grn });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// GET /api/procurement/grn
router.get('/grn', auth, async (req, res) => {
  try {
    const grns = await GoodsReceiptNote.find({ storeId: req.user.storeId })
      .sort({ createdAt: -1 }).limit(50)
      .populate('poId', 'poNumber supplierName');
    res.json({ success: true, data: grns });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/procurement/summary — dashboard stats
router.get('/summary', auth, async (req, res) => {
  try {
    const sid = req.user.storeId;
    const [prCount, poCount, grnCount, pendingApprovals] = await Promise.all([
      PurchaseRequisition.countDocuments({ storeId: sid }),
      PurchaseOrder.countDocuments({ storeId: sid }),
      GoodsReceiptNote.countDocuments({ storeId: sid }),
      PurchaseRequisition.countDocuments({ storeId: sid, status: 'submitted' }),
    ]);
    const recentPOs = await PurchaseOrder.find({ storeId: sid }).sort({ createdAt: -1 }).limit(5);
    res.json({ success: true, data: { prCount, poCount, grnCount, pendingApprovals, recentPOs } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
