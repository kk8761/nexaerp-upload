/**
 * NexaERP — Manufacturing Routes (BOM & Production Orders)
 */
const router = require('express').Router();
const auth = require('../middleware/auth');
const BOM = require('../models/BOM');
const ProductionOrder = require('../models/ProductionOrder');

// ── Bill of Materials ──────────────────────────────────────────

// GET /api/manufacturing/bom
router.get('/bom', auth, async (req, res) => {
  try {
    const boms = await BOM.find({ storeId: req.user.storeId }).sort({ productName: 1 });
    res.json({ success: true, data: boms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/manufacturing/bom
router.post('/bom', auth, async (req, res) => {
  try {
    const bom = await BOM.create({
      ...req.body,
      storeId: req.user.storeId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: bom });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Production Orders ──────────────────────────────────────────

// GET /api/manufacturing/production-orders
router.get('/production-orders', auth, async (req, res) => {
  try {
    const orders = await ProductionOrder.find({ storeId: req.user.storeId }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/manufacturing/production-orders
router.post('/production-orders', auth, async (req, res) => {
  try {
    const order = await ProductionOrder.create({
      ...req.body,
      storeId: req.user.storeId,
      orderNumber: `PO-${Date.now()}`,
    });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
