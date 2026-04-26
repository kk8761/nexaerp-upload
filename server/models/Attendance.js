/**
 * NexaERP — Employee Attendance Model (HCM-TM)
 */
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, index: true },
  employeeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeName:{ type: String },
  date:        { type: String, required: true }, // 'YYYY-MM-DD'
  clockIn:     { type: Date },
  clockOut:    { type: Date },
  hoursWorked: { type: Number, default: 0 },
  overtime:    { type: Number, default: 0 },
  status:      { type: String, enum: ['present', 'absent', 'half_day', 'leave', 'holiday', 'weekend'], default: 'present' },
  branch:      { type: String, default: 'main' },
  method:      { type: String, enum: ['manual', 'biometric', 'mobile', 'web'], default: 'web' },
  notes:       { type: String },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

attendanceSchema.index({ storeId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ storeId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
