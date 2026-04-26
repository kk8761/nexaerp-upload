/**
 * Orders Routes — POS Sales, Purchase Orders, Tracking
 */

const express = require('express');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/auth');
const { checkStockAfterSale } = require('../utils/notifications');

const router = express.Router();
router.use(protect);

// ── GET /api/orders ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 50, search, from, to } = req.query;
    const storeId = req.user.storeId;

    const filter = { storeId };
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    if (search) filter.$or = [
      { orderNo:      { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
    ];
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59));
    }

    const skip = (page - 1) * Math.min(limit, 200);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort('-createdAt').skip(skip).limit(Math.min(limit, 200)).lean(),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true, data: orders,
      meta: { total, page: +page, limit: +limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) { next(err); }
});

// ── GET /api/orders/:id ───────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// ── POST /api/orders — Create Sale ────────────────────────
router.post('/', async (req, res, next) => {
  const session = await Order.startSession();
  try {
    session.startTransaction();

    const { items, customer, customerName, paymentMode, discount, discountType, notes } = req.body;
    const storeId = req.user.storeId;
    const io = req.app.get('io');

    // Validate and calculate
    let subtotal = 0, taxAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw { status: 404, message: `Product not found: ${item.productId}` };
      if (product.stock < item.qty) {
        throw { status: 400, message: `Insufficient stock for ${product.name}. Available: ${product.stock} ${product.unit}` };
      }

      const itemSubtotal = product.price * item.qty;
      const gstAmount    = itemSubtotal * (product.gst / 100);

      subtotal  += itemSubtotal;
      taxAmount += gstAmount;

      orderItems.push({
        product:     product._id,
        productName: product.name,
        sku:         product.sku,
        unit:        product.unit,
        image:       product.image,
        qty:         item.qty,
        price:       product.price,
        cost:        product.cost,
        gst:         product.gst,
        gstAmount,
        subtotal:    itemSubtotal,
      });

      // Deduct stock
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.qty },
        $push: { stockHistory: { type: 'sale', quantity: item.qty, reason: 'POS Sale' } }
      }, { session });
    }

    // Discount
    const discountAmt = discountType === 'percent' ? (subtotal * (discount || 0) / 100) : (discount || 0);
    const total = subtotal - discountAmt + taxAmount;

    // Create order
    const [order] = await Order.create([{
      storeId,
      type: 'sale',
      customer,
      customerName: customerName || 'Walk-in Customer',
      items: orderItems,
      subtotal, discount: discountAmt, discountType: discountType || 'flat',
      taxAmount, total,
      paymentMode: paymentMode || 'cash',
      paymentStatus: 'paid',
      amountPaid: total,
      status: 'completed',
      cashier: req.user._id,
      cashierName: req.user.name,
      notes,
    }], { session });

    // Update customer stats
    if (customer) {
      await Customer.findByIdAndUpdate(customer, {
        $inc: { totalOrders: 1, totalSpent: total, loyaltyPoints: Math.floor(total / 100) },
        $set: { lastVisit: new Date() }
      }, { session });
    }

    // Record transaction
    await Transaction.create([{
      storeId, type: 'income', category: 'Sales',
      description: `Sale ${order.orderNo} — ${customerName || 'Walk-in'}`,
      amount: total, ref: order.invoiceNo, order: order._id,
      date: new Date(), createdBy: req.user._id
    }], { session });

    await session.commitTransaction();

    // Emit to socket
    io?.to(storeId).emit('new_sale', {
      orderNo:  order.orderNo, total,
      customer: customerName, cashier: req.user.name, timestamp: new Date()
    });

    // Check stock after sale (async, no await — don't slow down response)
    checkStockAfterSale(orderItems, storeId, io).catch(() => {});

    res.status(201).json({ success: true, message: 'Sale completed!', data: order });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
});

// ── PATCH /api/orders/:id/stage ───────────────────────────
// Track order pipeline (for delivery/purchase orders)
router.patch('/:id/stage', async (req, res, next) => {
  try {
    const { stage, status, notes } = req.body;
    const order = await Order.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const stageIdx = order.trackingStages.findIndex(s => s.stage === stage);
    if (stageIdx === -1) return res.status(400).json({ success: false, message: 'Stage not found' });

    order.trackingStages[stageIdx].status    = status;
    order.trackingStages[stageIdx].timestamp = status === 'done' ? new Date() : null;
    order.trackingStages[stageIdx].notes     = notes;
    order.trackingStages[stageIdx].updatedBy = req.user.name;
    order.currentStage = stage;

    // Check if received (for purchase orders)
    if (order.type === 'purchase' && stage === 'Received' && status === 'done') {
      // Update stock for each item in the PO
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.qty },
          $push: { stockHistory: { type: 'add', quantity: item.qty, reason: `PO Received: ${order.orderNo}` } }
        });
      }
      order.status = 'completed';
      order.paymentStatus = 'pending'; // Needs to be paid
    }

    await order.save();

    req.app.get('io')?.to(req.user.storeId).emit('order_updated', {
      orderId:   order._id,
      orderNo:   order.orderNo,
      stage, status,
      updatedBy: req.user.name
    });

    res.json({ success: true, message: 'Stage updated!', data: order });
  } catch (err) { next(err); }
});

// ── PATCH /api/orders/:id/status ──────────────────────────
router.patch('/:id/status', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, storeId: req.user.storeId },
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// ── POST /api/orders/purchase — Create Purchase Order ─────
router.post('/purchase', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    const { supplier, supplierName, items, notes } = req.body;
    const storeId = req.user.storeId;

    const orderItems = items.map(i => ({
      product:     i.productId,
      productName: i.productName,
      qty:         i.qty,
      price:       i.cost || 0,
      cost:        i.cost || 0,
      subtotal:    (i.cost || 0) * i.qty,
    }));

    const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);

    const order = await Order.create({
      storeId, type: 'purchase',
      customerName: supplierName || 'Vendor',
      items: orderItems, subtotal, total: subtotal,
      paymentMode: 'pending', paymentStatus: 'pending',
      status: 'pending',
      notes: notes || 'Manual Purchase Order',
      cashier: req.user._id, cashierName: req.user.name,
      trackingStages: [
        { stage: 'PO Created',     status: 'done',    timestamp: new Date() },
        { stage: 'Sent to Vendor', status: 'pending', timestamp: null },
        { stage: 'Confirmed',      status: 'pending', timestamp: null },
        { stage: 'Dispatched',     status: 'pending', timestamp: null },
        { stage: 'Received',       status: 'pending', timestamp: null },
      ]
    });

    res.status(201).json({ success: true, message: 'Purchase Order created!', data: order });
  } catch (err) { next(err); }
});

module.exports = router;
