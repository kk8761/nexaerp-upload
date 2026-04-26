// Staff route proxies to /api/analytics/staff
const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const staff = await User.find({ storeId: req.user.storeId }).select('-password').lean();
    res.json({ success: true, data: staff });
  } catch (err) { next(err); }
});

router.patch('/:id', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    const doc = await User.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId },
      req.body, { new: true }
    ).select('-password');
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('owner'), async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
