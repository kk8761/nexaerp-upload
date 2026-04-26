/**
 * NexaERP — Governance & DMS Routes
 */
const router = require('express').Router();
const auth = require('../middleware/auth');
const RiskItem = require('../models/RiskItem');
const Document = require('../models/Document');

// ── Risk Management ─────────────────────────────────────────────

// GET /api/governance/risks
router.get('/risks', auth, async (req, res) => {
  try {
    const risks = await RiskItem.find({ storeId: req.user.storeId }).sort({ score: -1 });
    res.json({ success: true, data: risks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/governance/risks
router.post('/risks', auth, async (req, res) => {
  try {
    const risk = await RiskItem.create({
      ...req.body,
      storeId: req.user.storeId,
    });
    res.status(201).json({ success: true, data: risk });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Document Management ─────────────────────────────────────────

// GET /api/governance/documents
router.get('/documents', auth, async (req, res) => {
  try {
    const docs = await Document.find({ storeId: req.user.storeId }).sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/governance/documents
router.post('/documents', auth, async (req, res) => {
  try {
    const doc = await Document.create({
      ...req.body,
      storeId: req.user.storeId,
      uploadedBy: req.user._id,
      uploaderName: req.user.name,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
