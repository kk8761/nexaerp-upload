/**
 * NexaERP — Leave Application Model (HCM-TM)
 */
const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, index: true },
  employeeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeName:{ type: String },
  leaveType:   { type: String, enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'comp_off'], required: true },
  from:        { type: Date, required: true },
  to:          { type: Date, required: true },
  days:        { type: Number, required: true },
  reason:      { type: String },
  status:      { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:  { type: Date },
  approvalNote:{ type: String },
  attachments: [{ name: String, url: String }],
  branch:      { type: String, default: 'main' },
}, { timestamps: true });

leaveSchema.index({ storeId: 1, employeeId: 1, from: -1 });
module.exports = mongoose.model('Leave', leaveSchema);
