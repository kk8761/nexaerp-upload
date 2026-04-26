/**
 * NexaERP — Stock Transfer Model (SAP MM-IM / STO)
 * Manages inter-branch inventory movement
 */
const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  productId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:  { type: String, required: true },
  productSKU:   { type: String },
  requestedQty: { type: Number, required: true, min: 1 },
  approvedQty:  { type: Number, default: 0 },
  shippedQty:   { type: Number, default: 0 },
  receivedQty:  { type: Number, default: 0 },
  unitCost:     { type: Number, default: 0 },
}, { _id: true });

const stockTransferSchema = new mongoose.Schema({
  transferNumber: { type: String, unique: true },
  storeId:     { type: String, required: true, index: true },
  fromBranch:  { type: String, required: true },
  toBranch:    { type: String, required: true },
  items:       [transferItemSchema],
  totalItems:  { type: Number, default: 0 },
  totalValue:  { type: Number, default: 0 },
  reason:      { type: String, enum: ['rebalancing', 'demand_fulfillment', 'seasonal', 'emergency', 'other'], default: 'rebalancing' },
  priority:    { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  status:      { type: String, enum: ['draft', 'requested', 'approved', 'in_transit', 'partial_received', 'received', 'rejected', 'cancelled'], default: 'draft', index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByName: { type: String },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:  { type: Date },
  shippedAt:   { type: Date },
  receivedAt:  { type: Date },
  receivedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:       { type: String },
  rejectionReason: { type: String },
  stockUpdated: { type: Boolean, default: false },
}, { timestamps: true });

stockTransferSchema.pre('save', async function (next) {
  if (!this.transferNumber) {
    const count = await this.constructor.countDocuments({ storeId: this.storeId });
    const year = new Date().getFullYear();
    this.transferNumber = `STR-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  this.totalItems = this.items.reduce((s, i) => s + i.requestedQty, 0);
  this.totalValue = this.items.reduce((s, i) => s + (i.requestedQty * i.unitCost), 0);
  next();
});

stockTransferSchema.index({ fromBranch: 1, toBranch: 1, status: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
