/**
 * NexaERP — Financial Budget Model (SAP CO-OM)
 */
const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, index: true },
  year:        { type: Number, required: true },
  period:      { type: String, enum: ['FY', 'Q1', 'Q2', 'Q3', 'Q4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'], required: true },
  costCenter:  { type: mongoose.Schema.Types.ObjectId, ref: 'CostCenter' },
  category:    { type: String, enum: ['OPEX', 'CAPEX', 'Marketing', 'Payroll', 'Inventory', 'Other'], default: 'Other' },
  allocated:   { type: Number, required: true, default: 0 },
  actual:      { type: Number, default: 0 },
  currency:    { type: String, default: 'INR' },
  status:      { type: String, enum: ['draft', 'approved', 'revised', 'closed'], default: 'draft' },
  notes:       { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

budgetSchema.index({ storeId: 1, year: 1, period: 1 });
module.exports = mongoose.model('Budget', budgetSchema);
