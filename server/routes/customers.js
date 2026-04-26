const express = require('express');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { search, type, page = 1, limit = 100 } = req.query;
    const filter = { storeId: req.user.storeId, isActive: true };
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    if (type) filter.type = type;
    const [data, total] = await Promise.all([
      Customer.find(filter).sort('-totalSpent').skip((page - 1) * limit).limit(+limit).lean(),
      Customer.countDocuments(filter)
    ]);
    res.json({ success: true, data, meta: { total } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Customer.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!doc) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const doc = await Customer.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json({ success: true, message: 'Customer added!', data: doc });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const doc = await Customer.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId }, req.body, { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    await Customer.findOneAndUpdate({ _id: req.params.id, storeId: req.user.storeId }, { isActive: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
