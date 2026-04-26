/**
 * NexaERP — CRM Lead Model (SAP CRM / SD)
 */
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type:    { type: String, enum: ['call', 'email', 'meeting', 'note', 'demo', 'follow_up'] },
  subject: String,
  notes:   String,
  by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName:  String,
  outcome: String,
}, { timestamps: true });

const leadSchema = new mongoose.Schema({
  storeId:      { type: String, required: true, index: true },
  name:         { type: String, required: true },
  company:      { type: String },
  email:        { type: String },
  phone:        { type: String },
  source:       { type: String, enum: ['website', 'referral', 'cold_call', 'social', 'exhibition', 'partner', 'other'], default: 'other' },
  status:       { type: String, enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'], default: 'new', index: true },
  score:        { type: Number, default: 0, min: 0, max: 100 },
  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedName: { type: String },
  branch:       { type: String, default: 'main' },
  tags:         [String],
  notes:        { type: String },
  estimatedValue: { type: Number, default: 0 },
  activities:   [activitySchema],
  convertedOpportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
}, { timestamps: true });

leadSchema.index({ storeId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('Lead', leadSchema);
