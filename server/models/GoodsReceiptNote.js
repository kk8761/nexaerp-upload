/**
 * NexaERP — Goods Receipt Note (GRN) Model
 * Records actual goods received against a PO
 */
const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema({
  poItemRef:    { type: mongoose.Schema.Types.ObjectId },
  description:  { type: String, required: true },
  orderedQty:   { type: Number },
  receivedQty:  { type: Number, required: true, min: 0 },
  rejectedQty:  { type: Number, default: 0 },
  batchNo:      { type: String },
  expiryDate:   { type: Date },
  storageLocation: { type: String },
}, { _id: true });

const goodsReceiptNoteSchema = new mongoose.Schema({
  grnNumber:    { type: String, unique: true },
  storeId:      { type: String, required: true, index: true },
  branch:       { type: String, default: 'main' },
  poId:         { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  poNumber:     { type: String },
  supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String },
  deliveryNote: { type: String },  // Supplier's delivery note number
  vehicleNo:    { type: String },
  receivedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receivedByName: { type: String },
  items:        [grnItemSchema],
  qualityCheck: { type: String, enum: ['pending', 'passed', 'failed', 'partial'], default: 'pending' },
  qualityNotes: { type: String },
  stockUpdated: { type: Boolean, default: false },
  status:       { type: String, enum: ['draft', 'verified', 'posted', 'cancelled'], default: 'draft' },
  remarks:      { type: String },
}, { timestamps: true });

goodsReceiptNoteSchema.pre('save', async function (next) {
  if (!this.grnNumber) {
    const count = await this.constructor.countDocuments({ storeId: this.storeId });
    const year = new Date().getFullYear();
    this.grnNumber = `GRN-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('GoodsReceiptNote', goodsReceiptNoteSchema);
