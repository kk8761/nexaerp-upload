/**
 * NexaERP — Automation Rule Model (Workflow Engine)
 * Defines trigger-based automation rules for business process automation
 */
const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  field:    { type: String, required: true }, // e.g. 'product.stock', 'order.total'
  operator: { type: String, enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains'], required: true },
  value:    { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type:   { type: String, enum: [
    'send_notification',  // Push in-app notification
    'create_pr',          // Auto-create purchase requisition
    'send_alert',         // Email/SMS alert (future)
    'update_field',       // Update a record field
    'create_task',        // Add to task queue
    'log_event',          // Write audit log entry
    'trigger_approval',   // Start approval workflow
  ], required: true },
  config: { type: mongoose.Schema.Types.Mixed }, // Action-specific configuration
}, { _id: false });

const automationRuleSchema = new mongoose.Schema({
  storeId:     { type: String, required: true, index: true },
  name:        { type: String, required: true },
  description: { type: String },
  isActive:    { type: Boolean, default: true },
  trigger:     { type: String, enum: [
    'stock_below_threshold',
    'stock_zero',
    'po_created',
    'po_approved',
    'grn_received',
    'payroll_due',
    'order_placed',
    'new_customer',
    'transfer_requested',
    'pr_submitted',
    'daily_schedule',
    'weekly_schedule',
  ], required: true },
  triggerConfig: { type: mongoose.Schema.Types.Mixed }, // Extra trigger params (threshold, schedule, etc)
  conditions:  [conditionSchema], // All conditions must pass (AND logic)
  actions:     [actionSchema],
  runCount:    { type: Number, default: 0 },
  lastRunAt:   { type: Date },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  branch:      { type: String, default: 'all' }, // Which branch this applies to
}, { timestamps: true });

automationRuleSchema.index({ storeId: 1, isActive: 1, trigger: 1 });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
