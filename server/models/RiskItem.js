/**
 * NexaERP — Risk Register Model (Governance & Compliance)
 */
const mongoose = require('mongoose');

const riskItemSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, index: true },
  title:       { type: String, required: true },
  description: { type: String },
  category:    { type: String, enum: ['operational', 'financial', 'compliance', 'strategic', 'reputational', 'technical'], default: 'operational' },
  probability: { type: Number, min: 1, max: 5, default: 3 }, // 1: Very Low, 5: Very High
  impact:      { type: Number, min: 1, max: 5, default: 3 }, // 1: Very Low, 5: Very High
  score:       { type: Number }, // Calculated as probability * impact
  status:      { type: String, enum: ['identified', 'assessed', 'mitigated', 'monitoring', 'closed'], default: 'identified' },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ownerName:   { type: String },
  mitigationPlan: { type: String },
  lastReviewed: { type: Date, default: Date.now },
}, { timestamps: true });

riskItemSchema.pre('save', function(next) {
  this.score = this.probability * this.impact;
  next();
});

riskItemSchema.index({ storeId: 1, category: 1, status: 1 });
module.exports = mongoose.model('RiskItem', riskItemSchema);
