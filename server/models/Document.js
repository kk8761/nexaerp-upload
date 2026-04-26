/**
 * NexaERP — Document Management Model (DMS)
 */
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, index: true },
  name:        { type: String, required: true },
  fileType:    { type: String },
  fileSize:    { type: Number },
  url:         { type: String, required: true },
  category:    { type: String, enum: ['contract', 'invoice', 'receipt', 'report', 'identity', 'other'], default: 'other' },
  linkedTo:    { type: String }, // e.g., 'PurchaseOrder', 'Employee', 'Product'
  linkedId:    { type: mongoose.Schema.Types.ObjectId },
  version:     { type: String, default: '1.0' },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaderName:{ type: String },
  tags:        [String],
  isArchived:  { type: Boolean, default: false },
  accessLevel: { type: String, enum: ['public', 'private', 'restricted'], default: 'private' },
}, { timestamps: true });

documentSchema.index({ storeId: 1, category: 1, linkedTo: 1, linkedId: 1 });
module.exports = mongoose.model('Document', documentSchema);
