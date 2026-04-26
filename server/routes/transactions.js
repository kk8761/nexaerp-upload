const express = require('express');
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { type, category, from, to, page = 1, limit = 100 } = req.query;
    const filter = { storeId: req.user.storeId };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59));
    }
    const [data, total] = await Promise.all([
      Transaction.find(filter).sort('-date').skip((page - 1) * limit).limit(+limit).lean(),
      Transaction.countDocuments(filter)
    ]);
    res.json({ success: true, data, meta: { total } });
  } catch (err) { next(err); }
});

router.get('/summary', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const { year } = req.query;
    const fy = year || new Date().getFullYear();

    const summary = await Transaction.aggregate([
      { $match: { storeId } },
      { $group: { _id: { type: '$type', month: { $month: '$date' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.month': 1 } }
    ]);

    const income  = summary.filter(s => s._id.type === 'income').reduce((a, b) => a + b.total, 0);
    const expense = summary.filter(s => s._id.type === 'expense').reduce((a, b) => a + b.total, 0);

    res.json({ success: true, data: { income, expense, profit: income - expense, summary } });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const doc = await Transaction.create({ ...req.body, storeId: req.user.storeId, createdBy: req.user._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('owner'), async (req, res, next) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
