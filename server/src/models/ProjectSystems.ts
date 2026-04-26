/**
 * Project Systems Models
 * Type definitions for Project Management entities
 */

import { BaseEntity, BaseEntityData } from './BaseEntity';

// ==================== Project Management Models ====================

export type ProjectType = 'internal' | 'customer_project' | 'capital_project' | 'research';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type ResourceType = 'human' | 'equipment' | 'material';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';

export interface ProjectPhase {
  name: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  actualCost?: number;
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  assignee?: string;
  startDate: Date;
  dueDate: Date;
  status: TaskStatus;
  progress: number; // 0-100
  dependencies: string[]; // Task IDs
  estimatedHours?: number;
  actualHours?: number;
}

export interface ResourceAllocation {
  resourceId: string;
  resourceType: ResourceType;
  resourceName: string;
  allocation: number; // Percentage or quantity
  startDate: Date;
  endDate: Date;
  cost: number;
  costPerUnit?: number;
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  status: MilestoneStatus;
  deliverables: string[];
  completionPercentage: number;
  notes?: string;
}

export interface ProjectData extends BaseEntityData {
  projectNumber: string;
  name: string;
  description?: string;
  projectType: ProjectType;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  budget: number;
  actualCost: number;
  phases: ProjectPhase[];
  resources: ResourceAllocation[];
  milestones: Milestone[];
  customerId?: string;
  customerName?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  notes?: string;
}

export class Project extends BaseEntity implements ProjectData {
  projectNumber: string;
  name: string;
  description?: string;
  projectType: ProjectType;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  budget: number;
  actualCost: number;
  phases: ProjectPhase[];
  resources: ResourceAllocation[];
  milestones: Milestone[];
  customerId?: string;
  customerName?: string;
  projectManagerId?: string;
  projectManagerName?: string;
  notes?: string;

  constructor(data: ProjectData) {
    super(data);
    this.projectNumber = data.projectNumber;
    this.name = data.name;
    this.description = data.description;
    this.projectType = data.projectType;
    this.status = data.status;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.budget = data.budget;
    this.actualCost = data.actualCost;
    this.phases = data.phases;
    this.resources = data.resources;
    this.milestones = data.milestones;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.projectManagerId = data.projectManagerId;
    this.projectManagerName = data.projectManagerName;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      projectNumber: this.projectNumber,
      name: this.name,
      description: this.description,
      projectType: this.projectType,
      status: this.status,
      startDate: this.startDate,
      endDate: this.endDate,
      budget: this.budget,
      actualCost: this.actualCost,
      phases: this.phases,
      resources: this.resources,
      milestones: this.milestones,
      customerId: this.customerId,
      customerName: this.customerName,
      projectManagerId: this.projectManagerId,
      projectManagerName: this.projectManagerName,
      notes: this.notes,
    };
  }
}

// ==================== Project Cost Tracking Models ====================

export interface ProjectCostData extends BaseEntityData {
  projectId: string;
  costType: 'labor' | 'material' | 'equipment' | 'overhead' | 'other';
  description: string;
  amount: number;
  date: Date;
  phaseId?: string;
  taskId?: string;
  resourceId?: string;
  invoiceId?: string;
  notes?: string;
}

export class ProjectCost extends BaseEntity implements ProjectCostData {
  projectId: string;
  costType: 'labor' | 'material' | 'equipment' | 'overhead' | 'other';
  description: string;
  amount: number;
  date: Date;
  phaseId?: string;
  taskId?: string;
  resourceId?: string;
  invoiceId?: string;
  notes?: string;

  constructor(data: ProjectCostData) {
    super(data);
    this.projectId = data.projectId;
    this.costType = data.costType;
    this.description = data.description;
    this.amount = data.amount;
    this.date = data.date;
    this.phaseId = data.phaseId;
    this.taskId = data.taskId;
    this.resourceId = data.resourceId;
    this.invoiceId = data.invoiceId;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      projectId: this.projectId,
      costType: this.costType,
      description: this.description,
      amount: this.amount,
      date: this.date,
      phaseId: this.phaseId,
      taskId: this.taskId,
      resourceId: this.resourceId,
      invoiceId: this.invoiceId,
      notes: this.notes,
    };
  }
}

// ==================== Earned Value Management Models ====================

export interface EVMMetrics {
  plannedValue: number; // PV - Budgeted cost of work scheduled
  earnedValue: number; // EV - Budgeted cost of work performed
  actualCost: number; // AC - Actual cost of work performed
  costVariance: number; // CV = EV - AC
  scheduleVariance: number; // SV = EV - PV
  costPerformanceIndex: number; // CPI = EV / AC
  schedulePerformanceIndex: number; // SPI = EV / PV
  estimateAtCompletion: number; // EAC = BAC / CPI
  estimateToComplete: number; // ETC = EAC - AC
  varianceAtCompletion: number; // VAC = BAC - EAC
  budgetAtCompletion: number; // BAC - Total project budget
}

export interface ProjectEVMData extends BaseEntityData {
  projectId: string;
  reportDate: Date;
  metrics: EVMMetrics;
  completionPercentage: number;
  notes?: string;
}

export class ProjectEVM extends BaseEntity implements ProjectEVMData {
  projectId: string;
  reportDate: Date;
  metrics: EVMMetrics;
  completionPercentage: number;
  notes?: string;

  constructor(data: ProjectEVMData) {
    super(data);
    this.projectId = data.projectId;
    this.reportDate = data.reportDate;
    this.metrics = data.metrics;
    this.completionPercentage = data.completionPercentage;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      projectId: this.projectId,
      reportDate: this.reportDate,
      metrics: this.metrics,
      completionPercentage: this.completionPercentage,
      notes: this.notes,
    };
  }
}

// ==================== Project Invoice Models ====================

export interface ProjectInvoiceData extends BaseEntityData {
  invoiceNumber: string;
  projectId: string;
  customerId: string;
  customerName: string;
  billingType: 'time_and_materials' | 'milestone' | 'fixed_price';
  startDate: Date;
  endDate: Date;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  lineItems: ProjectInvoiceLineItem[];
  notes?: string;
}

export interface ProjectInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taskId?: string;
  milestoneId?: string;
}

export class ProjectInvoice extends BaseEntity implements ProjectInvoiceData {
  invoiceNumber: string;
  projectId: string;
  customerId: string;
  customerName: string;
  billingType: 'time_and_materials' | 'milestone' | 'fixed_price';
  startDate: Date;
  endDate: Date;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  lineItems: ProjectInvoiceLineItem[];
  notes?: string;

  constructor(data: ProjectInvoiceData) {
    super(data);
    this.invoiceNumber = data.invoiceNumber;
    this.projectId = data.projectId;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.billingType = data.billingType;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.subtotal = data.subtotal;
    this.taxAmount = data.taxAmount;
    this.total = data.total;
    this.status = data.status;
    this.dueDate = data.dueDate;
    this.paidDate = data.paidDate;
    this.lineItems = data.lineItems;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      invoiceNumber: this.invoiceNumber,
      projectId: this.projectId,
      customerId: this.customerId,
      customerName: this.customerName,
      billingType: this.billingType,
      startDate: this.startDate,
      endDate: this.endDate,
      subtotal: this.subtotal,
      taxAmount: this.taxAmount,
      total: this.total,
      status: this.status,
      dueDate: this.dueDate,
      paidDate: this.paidDate,
      lineItems: this.lineItems,
      notes: this.notes,
    };
  }
}

// ==================== Project Template Models ====================

export interface ProjectTemplateData extends BaseEntityData {
  name: string;
  description?: string;
  projectType: ProjectType;
  defaultDuration: number; // in days
  phases: Omit<ProjectPhase, 'tasks'>[];
  milestones: Omit<Milestone, 'id' | 'status' | 'completionPercentage'>[];
  isActive: boolean;
}

export class ProjectTemplate extends BaseEntity implements ProjectTemplateData {
  name: string;
  description?: string;
  projectType: ProjectType;
  defaultDuration: number;
  phases: Omit<ProjectPhase, 'tasks'>[];
  milestones: Omit<Milestone, 'id' | 'status' | 'completionPercentage'>[];
  isActive: boolean;

  constructor(data: ProjectTemplateData) {
    super(data);
    this.name = data.name;
    this.description = data.description;
    this.projectType = data.projectType;
    this.defaultDuration = data.defaultDuration;
    this.phases = data.phases;
    this.milestones = data.milestones;
    this.isActive = data.isActive;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      name: this.name,
      description: this.description,
      projectType: this.projectType,
      defaultDuration: this.defaultDuration,
      phases: this.phases,
      milestones: this.milestones,
      isActive: this.isActive,
    };
  }
}
