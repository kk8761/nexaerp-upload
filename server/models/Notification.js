const mongoose = require('mongoose');

// ─── Notification Schema ──────────────────────────────────
const notificationSchema = new mongoose.Schema({
  storeId:  { type: String, required: true },
  type:     { type: String, enum: ['low_stock', 'out_of_stock', 'new_order', 'payment', 'vendor_po', 'expiry', 'system', 'custom'], required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  icon:     { type: String, default: '🔔' },
  
  // Related entities
  relatedProduct:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  relatedOrder:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  relatedSupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },

  // Who should see it
  targetRoles: [{ type: String, enum: ['owner', 'manager', 'cashier', 'storekeeper', 'all'] }],

  // Action
  actionLabel: { type: String },   // e.g. "Create PO"
  actionUrl:   { type: String },   // e.g. "/inventory"
  actionData:  { type: mongoose.Schema.Types.Mixed },

  // Status
  isRead:    { type: Boolean, default: false },
  readAt:    { type: Date },
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // PO auto-generated?
  poCreated:    { type: Boolean, default: false },
  poOrderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

}, { timestamps: true });

notificationSchema.index({ storeId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ storeId: 1, type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
