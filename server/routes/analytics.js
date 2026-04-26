const express = require('express');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

// GET /api/analytics/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const today   = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todaySales, todayOrders, weekSales,
      totalProducts, lowStock, totalCustomers,
      recentOrders
    ] = await Promise.all([
      Order.aggregate([{ $match: { storeId, type: 'sale', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.countDocuments({ storeId, type: 'sale', createdAt: { $gte: today } }),
      Order.aggregate([{ $match: { storeId, type: 'sale', createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } }, { $group: { _id: { $dayOfWeek: '$createdAt' }, total: { $sum: '$total' }, count: { $sum: 1 } } }, { $sort: { '_id': 1 } }]),
      Product.countDocuments({ storeId, isActive: true }),
      Product.countDocuments({ storeId, isActive: true, $expr: { $lte: ['$stock', '$minStock'] } }),
      Customer.countDocuments({ storeId, isActive: true }),
      Order.find({ storeId, type: 'sale' }).sort('-createdAt').limit(10).lean()
    ]);

    res.json({
      success: true,
      data: {
        todaySales:     todaySales[0]?.total || 0,
        todayOrders,
        weekRevenue:    weekSales.reduce((a, b) => a + b.total, 0),
        weekChart:      weekSales,
        totalProducts,
        lowStockCount:  lowStock,
        totalCustomers,
        recentOrders
      }
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/revenue — Monthly breakdown
router.get('/revenue', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const months = await Order.aggregate([
      { $match: { storeId, type: 'sale', createdAt: { $gte: new Date(Date.now() - 365 * 86400000) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json({ success: true, data: months });
  } catch (err) { next(err); }
});

// GET /api/analytics/top-products
router.get('/top-products', async (req, res, next) => {
  try {
    const storeId = req.user.storeId;
    const top = await Order.aggregate([
      { $match: { storeId, type: 'sale' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productName', totalQty: { $sum: '$items.qty' }, totalRevenue: { $sum: '$items.subtotal' } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);
    res.json({ success: true, data: top });
  } catch (err) { next(err); }
});

// GET /api/analytics/staff — Staff list from User model
router.get('/staff', async (req, res, next) => {
  try {
    const staff = await User.find({ storeId: req.user.storeId }).select('-password').lean();
    res.json({ success: true, data: staff });
  } catch (err) { next(err); }
});

module.exports = router;
