/**
 * NexaERP — Bill of Materials Model (SAP PP-BD)
 */
const mongoose = require('mongoose');

const bomComponentSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productSKU:  { type: String },
  quantity:    { type: Number, required: true, min: 0.001 },
  unit:        { type: String, default: 'pcs' },
  scrapFactor: { type: Number, default: 0 }, // % waste allowance
  componentType: { type: String, enum: ['raw_material', 'semi_finished', 'bought_out', 'consumable'], default: 'raw_material' },
  mandatory:   { type: Boolean, default: true },
  notes:       { type: String },
}, { _id: true });

const bomSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, index: true },
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  version:     { type: String, default: '1.0' },
  isActive:    { type: Boolean, default: true },
  bomType:     { type: String, enum: ['production', 'sales', 'engineering'], default: 'production' },
  baseQuantity:{ type: Number, default: 1 },
  baseUnit:    { type: String, default: 'pcs' },
  components:  [bomComponentSchema],
  totalMaterialCost: { type: Number, default: 0 },
  notes:       { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validFrom:   { type: Date },
  validTo:     { type: Date },
}, { timestamps: true });

bomSchema.index({ storeId: 1, productId: 1, version: 1 });
module.exports = mongoose.model('BOM', bomSchema);
