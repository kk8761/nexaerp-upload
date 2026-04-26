/**
 * NexaERP — Purchase Requisition Model (SAP MM-PUR)
 * Represents an internal request to purchase goods/services
 */
const mongoose = require('mongoose');

const requisitionItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 },
  unit:        { type: String, default: 'pcs' },
  estimatedCost: { type: Number, default: 0 },
  requiredDate: { type: Date },
}, { _id: false });

const approvalStepSchema = new mongoose.Schema({
  level:       { type: Number, required: true  },
  approver:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approverName:{ type: String },
  status:      { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'pending' },
  comment:     { type: String },
  decidedAt:   { type: Date },
}, { _id: false });

const purchaseRequisitionSchema = new mongoose.Schema({
  prNumber:    { type: String, unique: true }, // e.g. PR-2026-0001
  storeId:     { type: String, required: true, index: true },
  branch:      { type: String, default: 'main' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterName:{ type: String },
  department:  { type: String },
  priority:    { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  items:       [requisitionItemSchema],
  totalEstimated: { type: Number, default: 0 },
  status:      { type: String, enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'converted_to_po', 'cancelled'], default: 'draft', index: true },
  approvalChain: [approvalStepSchema],
  currentLevel: { type: Number, default: 0 },
  convertedPO: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  notes:       { type: String },
  attachments: [{ name: String, url: String }],
}, { timestamps: true });

// Auto-generate PR number
purchaseRequisitionSchema.pre('save', async function (next) {
  if (!this.prNumber) {
    const count = await this.constructor.countDocuments({ storeId: this.storeId });
    const year = new Date().getFullYear();
    this.prNumber = `PR-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  this.totalEstimated = this.items.reduce((sum, i) => sum + (i.estimatedCost * i.quantity), 0);
  next();
});

module.exports = mongoose.model('PurchaseRequisition', purchaseRequisitionSchema);
