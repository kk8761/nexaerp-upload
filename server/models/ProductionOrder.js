/**
 * NexaERP — Production Order Model (SAP PP-SFC)
 */
const mongoose = require('mongoose');

const productionOrderSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, index: true },
  bomId:       { type: mongoose.Schema.Types.ObjectId, ref: 'BOM', required: true },
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  orderNumber: { type: String, required: true, unique: true },
  quantity:    { type: Number, required: true },
  unit:        { type: String, default: 'pcs' },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date },
  status:      { type: String, enum: ['planned', 'released', 'in_progress', 'completed', 'cancelled'], default: 'planned', index: true },
  priority:    { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  actualOutput:{ type: Number, default: 0 },
  scrapQuantity:{ type: Number, default: 0 },
  batchNumber: { type: String },
  branch:      { type: String, default: 'main' },
  notes:       { type: String },
  opsProgress: [{
    operation: String,
    status: { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending' },
    workCenter: String,
    startTime: Date,
    endTime: Date
  }],
}, { timestamps: true });

productionOrderSchema.index({ storeId: 1, status: 1 });
module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
