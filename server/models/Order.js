const mongoose = require('mongoose');

// ─── Order Item Sub-schema ────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName:  { type: String, required: true },
  sku:          String,
  unit:         String,
  image:        String,
  qty:          { type: Number, required: true, min: 1 },
  price:        { type: Number, required: true },  // Selling price at time of sale
  cost:         { type: Number },                  // Cost at time of sale
  gst:          { type: Number, default: 0 },
  discount:     { type: Number, default: 0 },
  subtotal:     { type: Number, required: true },  // qty × price
  gstAmount:    { type: Number, default: 0 },
}, { _id: false });

// ─── Order Tracking Stage Sub-schema ─────────────────────
const orderStageSchema = new mongoose.Schema({
  stage:      { type: String, required: true },
  status:     { type: String, enum: ['pending', 'active', 'done', 'skipped'], default: 'pending' },
  timestamp:  { type: Date },
  notes:      { type: String },
  updatedBy:  { type: String },
}, { _id: false });

// ─── Main Order Schema ────────────────────────────────────
const orderSchema = new mongoose.Schema({
  orderNo:    { type: String, unique: true },     // Auto-generated: ORD-YYYY-NNNN
  type:       { type: String, enum: ['sale', 'purchase', 'return', 'transfer'], default: 'sale' },

  // Customer
  customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Walk-in Customer' },
  customerPhone: { type: String },

  // Items
  items: [orderItemSchema],

  // Financial
  subtotal:   { type: Number, required: true },
  discount:   { type: Number, default: 0 },
  discountType: { type: String, enum: ['percent', 'flat'], default: 'flat' },
  taxAmount:  { type: Number, default: 0 },
  total:      { type: Number, required: true },

  // Payment
  paymentMode:   { type: String, enum: ['cash', 'upi', 'card', 'credit', 'mixed', 'online', 'pending'], default: 'cash' },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'partial', 'refunded'], default: 'paid' },
  amountPaid:    { type: Number, default: 0 },
  changeDue:     { type: Number, default: 0 },

  // Order status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'packed', 'dispatched', 'delivered', 'completed', 'cancelled', 'returned'],
    default: 'completed'
  },

  // ── ORDER TRACKING PIPELINE ────────────────────────────
  trackingStages: [orderStageSchema],
  currentStage:   { type: String, default: 'completed' },

  // GST Invoice
  invoiceNo: { type: String, unique: true, sparse: true },
  gstDetails: {
    sgst: Number, cgst: Number, igst: Number,
    totalGst: Number,
  },

  // Meta
  storeId:  { type: String, required: true, default: 'store-001' },
  cashier:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cashierName: { type: String },
  notes:    { type: String },
  tags:     [String],

}, { timestamps: true, toJSON: { virtuals: true } });

// ─── Auto-generate order number ───────────────────────────
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNo) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ storeId: this.storeId }) + 1;
    this.orderNo = `ORD-${year}-${String(count).padStart(4, '0')}`;

    // Set invoice number
    if (!this.invoiceNo) {
      this.invoiceNo = `INV-${year}-${String(count).padStart(4, '0')}`;
    }

    // Initialize tracking stages for sales
    if (this.type === 'sale' && !this.trackingStages?.length) {
      this.trackingStages = [
        { stage: 'Order Placed',    status: 'done', timestamp: new Date() },
        { stage: 'Payment Received', status: this.paymentStatus === 'paid' ? 'done' : 'pending', timestamp: this.paymentStatus === 'paid' ? new Date() : null },
        { stage: 'Items Picked',    status: 'done', timestamp: new Date() },
        { stage: 'Packed',          status: 'done', timestamp: new Date() },
        { stage: 'Ready/Delivered', status: 'done', timestamp: new Date() },
      ];
    }
  }
  next();
});

// Indexes
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ orderNo: 1 });
orderSchema.index({ 'customer': 1 });
orderSchema.index({ status: 1, storeId: 1 });

module.exports = mongoose.model('Order', orderSchema);
