/**
 * NexaERP — Audit Log Model
 * Immutable record of all user actions and data changes
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  storeId:    { type: String, required: true, index: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName:   { type: String },
  userRole:   { type: String },
  userIp:     { type: String },
  userAgent:  { type: String },
  action:     { type: String, required: true, enum: [
    // Auth
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED',
    // Procurement
    'PR_CREATED', 'PR_APPROVED', 'PR_REJECTED', 'PR_CONVERTED',
    'PO_CREATED', 'PO_APPROVED', 'PO_RELEASED', 'PO_CANCELLED',
    'GRN_CREATED', 'GRN_POSTED', 'GRN_CANCELLED',
    // Inventory
    'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
    'STOCK_ADJUSTED', 'STOCK_TRANSFER_CREATED', 'STOCK_TRANSFER_APPROVED',
    // Finance
    'PAYMENT_RECORDED', 'LEDGER_ENTRY', 'GST_FILED',
    // HR
    'EMPLOYEE_ADDED', 'EMPLOYEE_UPDATED', 'PAYROLL_PROCESSED',
    // System
    'ROLE_CHANGED', 'SETTINGS_UPDATED', 'BRANCH_CREATED',
    'AUTOMATION_TRIGGERED', 'EXPORT_GENERATED',
    // Custom
    'CUSTOM',
  ]},
  entity:     { type: String }, // 'Product', 'PurchaseOrder', etc.
  entityId:   { type: String },
  entityRef:  { type: String }, // Human-readable ref like PO-2026-0001
  oldValue:   { type: mongoose.Schema.Types.Mixed },
  newValue:   { type: mongoose.Schema.Types.Mixed },
  changes:    [{ field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed }],
  description:{ type: String }, // Human-readable summary
  branch:     { type: String },
  severity:   { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  tags:       [String],
}, {
  timestamps: true,
  // Audit logs should NOT be deleted via normal operations
  // Use compound index for efficient querying
});

// Prevent updates/deletes in production
auditLogSchema.pre(['update', 'updateOne', 'findOneAndUpdate', 'deleteOne', 'deleteMany'], function (next) {
  if (process.env.NODE_ENV === 'production') {
    return next(new Error('Audit logs are immutable'));
  }
  next();
});

// Indexes for fast filtering
auditLogSchema.index({ storeId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, action: 1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
