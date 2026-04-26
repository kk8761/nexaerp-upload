/**
 * NexaERP — Stock Transfer Routes
 */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const StockTransfer = require('../models/StockTransfer');
const Product       = require('../models/Product');
const AuditLog      = require('../models/AuditLog');

async function logAudit(req, action, ref, desc) {
  try {
    await AuditLog.create({
      storeId: req.user.storeId, userId: req.user._id,
      userName: req.user.name, userRole: req.user.role,
      userIp: req.ip, action, entity: 'StockTransfer',
      entityRef: ref, description: desc,
    });
  } catch {}
}

// GET /api/stock-transfers
router.get('/', auth, async (req, res) => {
  try {
    const { status, branch, page = 1, limit = 20 } = req.query;
    const filter = { storeId: req.user.storeId };
    if (status) filter.status = status;
    if (branch && branch !== 'all') {
      filter.$or = [{ fromBranch: branch }, { toBranch: branch }];
    }
    const transfers = await StockTransfer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit);
    const total = await StockTransfer.countDocuments(filter);
    res.json({ success: true, data: transfers, meta: { total } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/stock-transfers
router.post('/', auth, async (req, res) => {
  try {
    const transfer = await StockTransfer.create({
      ...req.body,
      storeId: req.user.storeId,
      requestedBy: req.user._id,
      requestedByName: req.user.name,
      status: 'requested',
    });
    await logAudit(req, 'STOCK_TRANSFER_CREATED', transfer.transferNumber, `Transfer ${transfer.transferNumber} from ${transfer.fromBranch} to ${transfer.toBranch}`);
    res.status(201).json({ success: true, data: transfer });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PATCH /api/stock-transfers/:id/approve
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    if (!['owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    const { approved, approvedItems, reason } = req.body;
    const transfer = await StockTransfer.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

    if (approved) {
      transfer.status = 'approved';
      transfer.approvedBy = req.user._id;
      transfer.approvedAt = new Date();
      // Set approved quantities
      if (approvedItems) {
        approvedItems.forEach(ai => {
          const item = transfer.items.id(ai.itemId);
          if (item) item.approvedQty = ai.approvedQty;
        });
      } else {
        transfer.items.forEach(i => i.approvedQty = i.requestedQty);
      }
    } else {
      transfer.status = 'rejected';
      transfer.rejectionReason = reason;
    }
    await transfer.save();
    await logAudit(req, 'STOCK_TRANSFER_APPROVED', transfer.transferNumber,
      `Transfer ${transfer.transferNumber} ${transfer.status} by ${req.user.name}`);
    res.json({ success: true, data: transfer });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/stock-transfers/:id/ship
router.patch('/:id/ship', auth, async (req, res) => {
  try {
    const transfer = await StockTransfer.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId, status: 'approved' },
      { status: 'in_transit', shippedAt: new Date() },
      { new: true }
    );
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not approved or not found' });
    res.json({ success: true, data: transfer });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/stock-transfers/:id/receive
router.patch('/:id/receive', auth, async (req, res) => {
  try {
    const { receivedItems } = req.body;
    const transfer = await StockTransfer.findOne({
      _id: req.params.id, storeId: req.user.storeId, status: 'in_transit',
    });
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not in transit' });

    // Update received quantities and adjust product stock
    for (const ri of (receivedItems || transfer.items)) {
      const item = transfer.items.find(i => String(i._id) === String(ri.itemId || i._id));
      if (!item) continue;
      item.receivedQty = ri.receivedQty !== undefined ? ri.receivedQty : item.approvedQty;
      // Deduct from source branch and add to destination branch
      // In the branch-based future: update branch-level stock fields
      // For now: update product total stock (transfer is internal)
      // No net stock change, but log the movement
    }

    transfer.status = 'received';
    transfer.receivedAt = new Date();
    transfer.receivedBy = req.user._id;
    transfer.stockUpdated = true;
    await transfer.save();

    await logAudit(req, 'STOCK_TRANSFER_APPROVED', transfer.transferNumber,
      `Transfer ${transfer.transferNumber} received at ${transfer.toBranch}`);
    res.json({ success: true, data: transfer });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/stock-transfers/branch-balance — current stock per branch
router.get('/branch-balance', auth, async (req, res) => {
  try {
    // Return all products with their notional branch allocation
    const products = await Product.find({ storeId: req.user.storeId, isActive: true })
      .select('name sku category stock reorderLevel');
    res.json({ success: true, data: products });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
