/**
 * Ledger Routes — SAP-style Accounts Receivable / Payable
 * GET /api/ledger/summary     — Dashboard totals
 * GET /api/ledger/receivable  — Money owed TO us
 * GET /api/ledger/payable     — Money we OWE
 * POST /api/ledger            — Create entry
 * POST /api/ledger/:id/pay    — Record a payment
 */
const express = require('express');
const Ledger  = require('../models/Ledger');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ── GET /api/ledger/summary ───────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;

    const [ar, ap, overdue, recentPayments] = await Promise.all([
      // Accounts Receivable — money owed TO us
      Ledger.aggregate([
        { $match: { storeId, type: { $in: ['receivable', 'payment_received'] }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalInvoiced: { $sum: '$invoiceAmount' }, totalReceived: { $sum: '$amountPaid' }, totalDue: { $sum: '$amountDue' } } }
      ]),
      // Accounts Payable — money we OWE
      Ledger.aggregate([
        { $match: { storeId, type: { $in: ['payable', 'payment_made'] }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalInvoiced: { $sum: '$invoiceAmount' }, totalPaid: { $sum: '$amountPaid' }, totalDue: { $sum: '$amountDue' } } }
      ]),
      // Overdue entries
      Ledger.find({ storeId, isOverdue: true, status: { $in: ['open', 'partial'] } })
        .sort('-daysOverdue').limit(10).lean(),
      // Recent payments
      Ledger.find({ storeId, 'payments.0': { $exists: true } })
        .sort('-updatedAt').limit(5).select('partyName type amountPaid payments').lean()
    ]);

    res.json({
      success: true,
      data: {
        receivable: {
          totalInvoiced: ar[0]?.totalInvoiced || 0,
          totalReceived: ar[0]?.totalReceived || 0,
          totalDue:      ar[0]?.totalDue || 0,
        },
        payable: {
          totalInvoiced: ap[0]?.totalInvoiced || 0,
          totalPaid:     ap[0]?.totalPaid || 0,
          totalDue:      ap[0]?.totalDue || 0,
        },
        overdueEntries:   overdue,
        recentPayments,
      }
    });
  } catch (err) { next(err); }
});

// ── GET /api/ledger ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { type, status, party, page = 1, limit = 50 } = req.query;
    const storeId = req.user.storeId;

    const filter = { storeId };
    if (type)   filter.type   = type;
    if (status) filter.status = status;
    if (party)  filter.partyName = { $regex: party, $options: 'i' };

    const [data, total] = await Promise.all([
      Ledger.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(+limit).lean(),
      Ledger.countDocuments(filter)
    ]);

    res.json({ success: true, data, meta: { total } });
  } catch (err) { next(err); }
});

// ── POST /api/ledger ──────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const entry = await Ledger.create({
      ...req.body,
      storeId: req.user.storeId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: 'Ledger entry created!', data: entry });
  } catch (err) { next(err); }
});

// ── POST /api/ledger/:id/pay — Record payment ─────────────
router.post('/:id/pay', async (req, res, next) => {
  try {
    const { amount, mode = 'cash', reference, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const entry = await Ledger.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!entry) return res.status(404).json({ success: false, message: 'Ledger entry not found' });

    if (amount > entry.amountDue) {
      return res.status(400).json({ success: false, message: `Payment ₹${amount} exceeds outstanding ₹${entry.amountDue}` });
    }

    entry.payments.push({ amount, mode, date: new Date(), reference, note, recordedBy: req.user._id });
    await entry.save(); // pre-save hook recalculates balance

    // Create transaction record
    try {
      const Transaction = require('../models/Transaction');
      await Transaction.create({
        storeId:     req.user.storeId,
        type:        entry.type === 'receivable' ? 'income' : 'expense',
        category:    entry.type === 'receivable' ? 'Receivables' : 'Payables',
        description: `Payment — ${entry.partyName}: ${note || reference || 'Ledger payment'}`,
        amount,
        ref:         reference || entry.invoiceNo,
        createdBy:   req.user._id,
      });
    } catch {}

    res.json({
      success: true,
      message: `✅ Payment of ₹${amount} recorded! Balance: ₹${entry.balance}`,
      data: entry
    });
  } catch (err) { next(err); }
});

// ── GET /api/ledger/:id ───────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const entry = await Ledger.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
});

// ── DELETE /api/ledger/:id ────────────────────────────────
router.delete('/:id', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    await Ledger.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
