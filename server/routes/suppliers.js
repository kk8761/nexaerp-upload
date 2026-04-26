const express = require('express');
const Supplier = require('../models/Supplier');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const data = await Supplier.find({ storeId: req.user.storeId, isActive: true }).sort('-createdAt').lean();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Supplier.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!doc) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.post('/', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    const doc = await Supplier.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json({ success: true, message: 'Supplier added!', data: doc });
  } catch (err) { next(err); }
});

router.put('/:id', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    const doc = await Supplier.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId }, req.body, { new: true }
    );
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('owner'), async (req, res, next) => {
  try {
    await Supplier.findOneAndUpdate({ _id: req.params.id, storeId: req.user.storeId }, { isActive: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
