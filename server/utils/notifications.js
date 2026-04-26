/**
 * NexaERP — Auto Notification Engine
 * Handles low stock alerts, vendor PO automation, expiry warnings
 */

const Notification = require('../models/Notification');
const Product      = require('../models/Product');

// ─── Low Stock Check ──────────────────────────────────────
async function runLowStockCheck(io) {
  const created = [];

  // Find all low stock items across all stores
  const lowStockItems = await Product.find({
    stock: { $gt: 0, $lte: { $multiply: ['$minStock', 1] } },
    isActive: true
  }).populate('supplier', 'name email phone').lean();

  const outOfStockItems = await Product.find({
    stock: 0,
    isActive: true
  }).populate('supplier', 'name email phone').lean();

  // Process out-of-stock first (critical)
  for (const product of outOfStockItems) {
    const existing = await Notification.findOne({
      storeId: product.storeId,
      relatedProduct: product._id,
      type: 'out_of_stock',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
    });

    if (!existing) {
      const notif = await Notification.create({
        storeId:        product.storeId,
        type:           'out_of_stock',
        priority:       'critical',
        title:          `🚨 OUT OF STOCK: ${product.name}`,
        message:        `${product.name} is completely out of stock. Immediate restocking needed.`,
        icon:           '🚨',
        relatedProduct: product._id,
        relatedSupplier: product.supplier?._id,
        targetRoles:    ['owner', 'manager', 'storekeeper'],
        actionLabel:    'Create Purchase Order',
        actionUrl:      '/inventory',
        actionData:     { productId: product._id, productName: product.name, suggestedQty: product.maxStock || 100 }
      });
      created.push(notif);

      // Emit to socket
      if (io) {
        io.to(product.storeId).emit('notification', {
          type: 'out_of_stock',
          priority: 'critical',
          title: notif.title,
          message: notif.message,
          notificationId: notif._id,
          product: { id: product._id, name: product.name, stock: product.stock }
        });
      }
    }
  }

  // Process low stock
  for (const product of lowStockItems) {
    const existing = await Notification.findOne({
      storeId: product.storeId,
      relatedProduct: product._id,
      type: 'low_stock',
      createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } // Last 12h
    });

    if (!existing) {
      const urgency = product.stock <= product.minStock * 0.5 ? 'high' : 'medium';
      const suggestedQty = Math.max(product.maxStock - product.stock, product.minStock * 3);

      const notif = await Notification.create({
        storeId:        product.storeId,
        type:           'low_stock',
        priority:       urgency,
        title:          `⚠️ Low Stock: ${product.name}`,
        message:        `Only ${product.stock} ${product.unit} left (min: ${product.minStock}). Consider ordering from ${product.supplierName || 'supplier'}.`,
        icon:           '⚠️',
        relatedProduct: product._id,
        relatedSupplier: product.supplier?._id,
        targetRoles:    ['owner', 'manager', 'storekeeper'],
        actionLabel:    'Order from Vendor',
        actionUrl:      '/suppliers',
        actionData:     {
          productId:    product._id,
          productName:  product.name,
          currentStock: product.stock,
          suggestedQty,
          supplierId:   product.supplier?._id,
          supplierName: product.supplierName,
        }
      });
      created.push(notif);

      if (io) {
        io.to(product.storeId).emit('notification', {
          type: 'low_stock',
          priority: urgency,
          title: notif.title,
          message: notif.message,
          notificationId: notif._id,
          product: { id: product._id, name: product.name, stock: product.stock, minStock: product.minStock }
        });
      }
    }
  }

  // Expiry check (within 30 days)
  const expiryItems = await Product.find({
    expiry: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), $gte: new Date() },
    stock: { $gt: 0 },
    isActive: true
  }).lean();

  for (const product of expiryItems) {
    const days = Math.ceil((new Date(product.expiry) - Date.now()) / (1000 * 60 * 60 * 24));
    const existing = await Notification.findOne({
      storeId: product.storeId,
      relatedProduct: product._id,
      type: 'expiry',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (!existing) {
      const notif = await Notification.create({
        storeId:        product.storeId,
        type:           'expiry',
        priority:       days <= 7 ? 'critical' : days <= 14 ? 'high' : 'medium',
        title:          `${days <= 7 ? '🔴' : '🟡'} Expiry Alert: ${product.name}`,
        message:        `${product.name} expires in ${days} days (${new Date(product.expiry).toLocaleDateString('en-IN')}). Current stock: ${product.stock} ${product.unit}.`,
        icon:           days <= 7 ? '🔴' : '🟡',
        relatedProduct: product._id,
        targetRoles:    ['owner', 'manager'],
        actionLabel:    'View Inventory',
        actionUrl:      '/inventory'
      });
      created.push(notif);

      if (io) {
        io.to(product.storeId).emit('notification', {
          type: 'expiry',
          priority: notif.priority,
          title: notif.title,
          message: notif.message,
          notificationId: notif._id,
        });
      }
    }
  }

  return created;
}

// ─── Auto Create Purchase Order ───────────────────────────
async function createAutoVendorPO(productId, storeId, io) {
  const Order     = require('../models/Order');
  const product   = await Product.findById(productId).populate('supplier');
  if (!product) return null;

  const suggestedQty = Math.max(product.maxStock - product.stock, product.minStock * 3);

  const po = await Order.create({
    type:         'purchase',
    storeId,
    status:       'pending',
    customerName: product.supplierName || 'Vendor',
    items: [{
      product:     product._id,
      productName: product.name,
      sku:         product.sku,
      unit:        product.unit,
      qty:         suggestedQty,
      price:       product.cost,
      cost:        product.cost,
      subtotal:    product.cost * suggestedQty,
    }],
    subtotal: product.cost * suggestedQty,
    total:    product.cost * suggestedQty,
    paymentMode: 'pending',
    paymentStatus: 'pending',
    notes: `Auto-generated PO for low stock alert on ${product.name}`,
    tags: ['auto-po', 'low-stock'],
    trackingStages: [
      { stage: 'PO Created',      status: 'done',    timestamp: new Date() },
      { stage: 'Sent to Vendor',  status: 'pending', timestamp: null },
      { stage: 'Confirmed',       status: 'pending', timestamp: null },
      { stage: 'Dispatched',      status: 'pending', timestamp: null },
      { stage: 'Received',        status: 'pending', timestamp: null },
    ]
  });

  // Update related notifications
  await Notification.updateMany(
    { relatedProduct: productId, storeId, poCreated: false, type: { $in: ['low_stock', 'out_of_stock'] } },
    { poCreated: true, poOrderId: po._id }
  );

  // Create success notification
  const notif = await Notification.create({
    storeId,
    type:           'vendor_po',
    priority:       'medium',
    title:          `📋 Purchase Order Created: ${product.name}`,
    message:        `Auto-PO created for ${suggestedQty} ${product.unit} of ${product.name} from ${product.supplierName}. PO# ${po.orderNo}`,
    icon:           '📋',
    relatedProduct: product._id,
    relatedOrder:   po._id,
    targetRoles:    ['owner', 'manager'],
    actionLabel:    'View PO',
    actionUrl:      '/orders',
    actionData:     { orderId: po._id, orderNo: po.orderNo }
  });

  if (io) {
    io.to(storeId).emit('notification', {
      type: 'vendor_po',
      priority: 'medium',
      title: notif.title,
      message: notif.message,
      notificationId: notif._id,
    });
  }

  return po;
}

// ─── Post-Sale Stock Check ─────────────────────────────────
async function checkStockAfterSale(items, storeId, io) {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    if (product.stock === 0) {
      // Trigger out of stock immediately
      await Notification.create({
        storeId,
        type:     'out_of_stock',
        priority: 'critical',
        title:    `🚨 OUT OF STOCK: ${product.name}`,
        message:  `${product.name} just went out of stock after last sale.`,
        icon:     '🚨',
        relatedProduct: product._id,
        targetRoles:    ['owner', 'manager', 'storekeeper'],
        actionLabel:    'Create Purchase Order',
        actionData:     { productId: product._id }
      });

      if (io) {
        io.to(storeId).emit('notification', {
          type: 'out_of_stock',
          priority: 'critical',
          title: `🚨 OUT OF STOCK: ${product.name}`,
          message: `${product.name} just went out of stock!`,
        });

        io.to(storeId).emit('critical_stock', {
          count: 1,
          items: [product.name]
        });
      }

    } else if (product.stock <= product.minStock) {
      if (io) {
        io.to(storeId).emit('notification', {
          type: 'low_stock',
          priority: 'high',
          title: `⚠️ Low Stock: ${product.name}`,
          message: `Only ${product.stock} ${product.unit} remaining for ${product.name}.`,
        });
      }
    }
  }
}

module.exports = { runLowStockCheck, createAutoVendorPO, checkStockAfterSale };
