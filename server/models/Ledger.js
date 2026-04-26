/**
 * Ledger Model — SAP-style Accounts Receivable / Payable
 * Tracks: money owed TO us (AR), money we OWE (AP), payments made/received
 */
const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  storeId:     { type: String, required: true, default: 'store-001' },
  type:        { type: String, enum: ['receivable', 'payable', 'payment_received', 'payment_made'], required: true },

  // Who we're dealing with
  partyType:   { type: String, enum: ['customer', 'supplier', 'employee', 'other'], required: true },
  partyId:     { type: mongoose.Schema.Types.ObjectId },
  partyName:   { type: String, required: true },

  // Amounts
  invoiceAmount: { type: Number, default: 0 },  // Original invoice
  amountDue:     { type: Number, default: 0 },  // Outstanding
  amountPaid:    { type: Number, default: 0 },  // Paid so far
  balance:       { type: Number, default: 0 },  // invoiceAmount - amountPaid

  // Reference
  invoiceNo:   { type: String },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  description: { type: String, required: true },
  category:    { type: String, default: 'General' },

  // Due dates
  dueDate:     { type: Date },
  isOverdue:   { type: Boolean, default: false },
  daysOverdue: { type: Number, default: 0 },

  // Status
  status:      { type: String, enum: ['open', 'partial', 'paid', 'cancelled', 'disputed'], default: 'open' },

  // Payment history
  payments: [{
    amount:    { type: Number },
    mode:      { type: String, enum: ['cash', 'upi', 'bank', 'cheque', 'card', 'other'], default: 'cash' },
    date:      { type: Date, default: Date.now },
    reference: { type: String },
    note:      { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // GST
  gstAmount:   { type: Number, default: 0 },
  tdsAmount:   { type: Number, default: 0 },

  notes: { type: String },
  tags:  [String],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-calculate balance before save
ledgerEntrySchema.pre('save', function(next) {
  this.amountPaid  = this.payments.reduce((s, p) => s + p.amount, 0);
  this.balance     = this.invoiceAmount - this.amountPaid;
  this.amountDue   = Math.max(0, this.balance);

  if (this.amountDue <= 0) {
    this.status = 'paid';
  } else if (this.amountPaid > 0) {
    this.status = 'partial';
  }

  if (this.dueDate && this.amountDue > 0) {
    const today = new Date();
    const due   = new Date(this.dueDate);
    if (today > due) {
      this.isOverdue  = true;
      this.daysOverdue = Math.ceil((today - due) / 86400000);
    }
  }

  next();
});

ledgerEntrySchema.index({ storeId: 1, type: 1, status: 1 });
ledgerEntrySchema.index({ storeId: 1, partyName: 1 });
ledgerEntrySchema.index({ dueDate: 1, isOverdue: 1 });

module.exports = mongoose.model('Ledger', ledgerEntrySchema);
