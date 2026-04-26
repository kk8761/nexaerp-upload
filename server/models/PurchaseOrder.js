/**
 * NexaERP — Purchase Order Model (SAP MM-PUR)
 */
const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  unit:        { type: String, default: 'pcs' },
  unitPrice:   { type: Number, required: true, min: 0 },
  taxPercent:  { type: Number, default: 18 }, // GST %
  discount:    { type: Number, default: 0 },
  totalAmount: { type: Number },
  receivedQty: { type: Number, default: 0 },
}, { _id: true });

poItemSchema.pre('save', function (next) {
  const base = this.quantity * this.unitPrice;
  const discounted = base - (base * (this.discount / 100));
  this.totalAmount = discounted + (discounted * (this.taxPercent / 100));
  next();
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber:     { type: String, unique: true },
  storeId:      { type: String, required: true, index: true },
  branch:       { type: String, default: 'main' },
  prReference:  { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequisition' },
  supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String },
  supplierGST:  { type: String },
  items:        [poItemSchema],
  subtotal:     { type: Number, default: 0 },
  taxTotal:     { type: Number, default: 0 },
  grandTotal:   { type: Number, default: 0 },
  currency:     { type: String, default: 'INR' },
  terms:        { type: String },
  deliveryDate: { type: Date },
  deliveryAddress: { type: String },
  status:       { type: String, enum: ['draft', 'sent_to_vendor', 'acknowledged', 'partial_received', 'received', 'invoiced', 'cancelled'], default: 'draft', index: true },
  releaseStatus:{ type: String, enum: ['blocked', 'to_release', 'released', 'rejected'], default: 'to_release' },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:   { type: Date },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:        { type: String },
  grnList:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceiptNote' }],
}, { timestamps: true });

purchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const count = await this.constructor.countDocuments({ storeId: this.storeId });
    const year = new Date().getFullYear();
    this.poNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  this.subtotal   = this.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
  this.taxTotal   = this.items.reduce((s, i) => s + ((i.unitPrice * i.quantity) * (i.taxPercent / 100)), 0);
  this.grandTotal = this.subtotal + this.taxTotal;
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
