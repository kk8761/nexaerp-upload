/**
 * Product Routes — Full CRUD + Stock Management
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Product      = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { runLowStockCheck, checkStockAfterSale } = require('../utils/notifications');

const router = express.Router();
router.use(protect); // All product routes require auth

// ── GET /api/products ─────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, category, lowStock, page = 1, limit = 100, sort = '-createdAt' } = req.query;
    const storeId = req.user.storeId;

    const filter = { storeId, isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku:  { $regex: search, $options: 'i' } },
        { barcode: search }, // Exact barcode match
      ];
    }

    if (category && category !== 'all') filter.category = category;

    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$stock', '$minStock'] };
    }

    const skip = (page - 1) * Math.min(limit, 200);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(Math.min(limit, 200)).lean(),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: products,
      meta: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) { next(err); }
});

// ── GET /api/products/low-stock ───────────────────────────
router.get('/low-stock', async (req, res, next) => {
  try {
    const products = await Product.find({
      storeId: req.user.storeId,
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    }).lean();

    res.json({ success: true, data: products, count: products.length });
  } catch (err) { next(err); }
});

// ── GET /api/products/categories ─────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const cats = await Product.distinct('category', { storeId: req.user.storeId, isActive: true });
    res.json({ success: true, data: cats });
  } catch (err) { next(err); }
});

// ── GET /api/products/:id ─────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, storeId: req.user.storeId })
      .populate('supplier', 'name phone email city');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

// ── POST /api/products ────────────────────────────────────
router.post('/', authorize('owner', 'manager', 'storekeeper'), async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, storeId: req.user.storeId });
    res.status(201).json({ success: true, message: 'Product added!', data: product });
  } catch (err) { next(err); }
});

// ── PUT /api/products/:id ─────────────────────────────────
router.put('/:id', authorize('owner', 'manager', 'storekeeper'), async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated!', data: product });
  } catch (err) { next(err); }
});

// ── PATCH /api/products/:id/stock ─────────────────────────
router.patch('/:id/stock', authorize('owner', 'manager', 'storekeeper'), async (req, res, next) => {
  try {
    const { quantity, type = 'adjustment', reason } = req.body;
    const product = await Product.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const newStock = type === 'add' ? product.stock + quantity : Math.max(0, product.stock - quantity);

    product.stock = newStock;
    product.stockHistory.push({ type, quantity, reason, userId: req.user._id });
    await product.save();

    // Emit socket update
    req.app.get('io')?.to(req.user.storeId).emit('stock_changed', {
      productId: product._id, productName: product.name, newStock, change: quantity
    });

    // Check if now low stock
    if (newStock <= product.minStock) {
      await runLowStockCheck(req.app.get('io'));
    }

    res.json({ success: true, message: 'Stock updated!', data: product });
  } catch (err) { next(err); }
});

// ── DELETE /api/products/:id ──────────────────────────────
router.delete('/:id', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    await Product.findOneAndUpdate({ _id: req.params.id, storeId: req.user.storeId }, { isActive: false });
    res.json({ success: true, message: 'Product removed' });
  } catch (err) { next(err); }
});

module.exports = router;
