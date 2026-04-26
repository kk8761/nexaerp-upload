const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  contact:    { type: String, trim: true },
  phone:      { type: String, trim: true },
  email:      { type: String, trim: true, lowercase: true },
  address:    { type: String },
  city:       { type: String },
  state:      { type: String },
  gst:        { type: String, uppercase: true },
  pan:        { type: String, uppercase: true },
  storeId:    { type: String, required: true, default: 'store-001' },
  
  // Financial
  outstanding:   { type: Number, default: 0 },
  creditLimit:   { type: Number, default: 0 },
  paymentTerms:  { type: String, default: 'Net 30' },
  bankDetails: {
    accountName:   String,
    accountNumber: String,
    ifsc:          String,
    bank:          String,
  },
  
  // Performance
  totalOrders:   { type: Number, default: 0 },
  totalPurchased: { type: Number, default: 0 },
  avgDeliveryDays: { type: Number, default: 2 },
  rating:        { type: Number, min: 1, max: 5, default: 4 },
  lastOrder:     { type: Date },
  
  isActive: { type: Boolean, default: true },
  notes:    { type: String },
  tags:     [String],
}, { timestamps: true });

supplierSchema.index({ storeId: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
