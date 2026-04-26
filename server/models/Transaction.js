const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, default: 'store-001' },
  type:        { type: String, enum: ['income', 'expense'], required: true },
  category:    { type: String, required: true },
  description: { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
  date:        { type: Date, default: Date.now },
  ref:         { type: String },  // Invoice/bill reference
  
  // Links
  order:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  supplier:    { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  
  // Financial year tracking
  financialYear: { type: String }, // e.g. "2025-26"
  
  // GST
  isGSTApplicable: { type: Boolean, default: false },
  gstRate:         { type: Number, default: 0 },
  gstAmount:       { type: Number, default: 0 },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:     String,
}, { timestamps: true });

transactionSchema.pre('save', function (next) {
  if (!this.financialYear) {
    const d = new Date(this.date);
    const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    this.financialYear = `${year}-${String(year + 1).slice(-2)}`;
  }
  next();
});

transactionSchema.index({ storeId: 1, date: -1 });
transactionSchema.index({ storeId: 1, type: 1, category: 1 });
transactionSchema.index({ financialYear: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
