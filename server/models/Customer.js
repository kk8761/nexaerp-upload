const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  phone:         { type: String, trim: true },
  email:         { type: String, trim: true, lowercase: true },
  address:       { type: String, trim: true },
  gstin:         { type: String, uppercase: true },
  type:          { type: String, enum: ['new', 'regular', 'vip', 'wholesale', 'blacklisted'], default: 'new' },
  storeId:       { type: String, required: true, default: 'store-001' },
  
  // Stats (denormalized for fast reads)
  totalOrders:   { type: Number, default: 0 },
  totalSpent:    { type: Number, default: 0 },
  loyaltyPoints: { type: Number, default: 0 },
  lastVisit:     { type: Date },
  
  // Credit
  creditLimit:   { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  
  notes:  { type: String },
  tags:   [String],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.index({ storeId: 1, name: 1 });
customerSchema.index({ phone: 1 });

module.exports = mongoose.model('Customer', customerSchema);
