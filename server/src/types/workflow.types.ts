/**
 * Workflow Builder Types
 * Type definitions for the no-code workflow automation system
 */

// ─── Trigger Types ─────────────────────────────────────────

export enum TriggerType {
  RECORD_CREATED = 'record_created',
  RECORD_UPDATED = 'record_updated',
  FIELD_CHANGED = 'field_changed',
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
}

export interface TriggerConfig {
  type: TriggerType;
  entity?: string; // For record triggers
  fields?: string[]; // For field_changed trigger
  cronExpression?: string; // For scheduled trigger
  webhookUrl?: string; // For webhook trigger
}

// ─── Condition Types ───────────────────────────────────────

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
}

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
  logicalOperator?: LogicalOperator;
}

// ─── Action Types ──────────────────────────────────────────

export enum ActionType {
  SEND_EMAIL = 'send_email',
  SEND_NOTIFICATION = 'send_notification',
  CREATE_RECORD = 'create_record',
  UPDATE_RECORD = 'update_record',
  DELETE_RECORD = 'delete_record',
  CALL_WEBHOOK = 'call_webhook',
}

export interface EmailActionConfig {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  template?: string;
}

export interface NotificationActionConfig {
  userIds: string[];
  message: string;
  title?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface RecordActionConfig {
  entity: string;
  recordId?: string; // For update/delete
  data?: Record<string, unknown>; // For create/update
}

export interface WebhookActionConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

export type ActionConfig =
  | EmailActionConfig
  | NotificationActionConfig
  | RecordActionConfig
  | WebhookActionConfig;

export interface WorkflowAction {
  type: ActionType;
  config: ActionConfig;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

// ─── Step Types ────────────────────────────────────────────

export enum StepType {
  CONDITION = 'condition',
  ACTION = 'action',
}

export interface WorkflowStepDefinition {
  stepOrder: number;
  stepType: StepType;
  condition?: WorkflowCondition;
  action?: WorkflowAction;
}

// ─── Workflow Definition ───────────────────────────────────

export interface WorkflowDefinition {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: TriggerConfig;
  steps: WorkflowStepDefinition[];
  createdBy?: string;
}

// ─── Execution Types ───────────────────────────────────────

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum StepExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  triggerData: Record<string, unknown>;
  variables: Record<string, unknown>;
}

export interface StepExecutionResult {
  status: StepExecutionStatus;
  result?: unknown;
  error?: string;
  retryCount?: number;
}

// ─── Template Types ────────────────────────────────────────

export interface WorkflowTemplate {
  id?: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  templateData: WorkflowDefinition;
}

// ─── Error Types ───────────────────────────────────────────

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public stepOrder?: number
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class WorkflowValidationError extends WorkflowError {
  constructor(message: string, stepOrder?: number) {
    super(message, 'VALIDATION_ERROR', stepOrder);
    this.name = 'WorkflowValidationError';
  }
}

export class WorkflowExecutionError extends WorkflowError {
  constructor(message: string, stepOrder?: number) {
    super(message, 'EXECUTION_ERROR', stepOrder);
    this.name = 'WorkflowExecutionError';
  }
}
