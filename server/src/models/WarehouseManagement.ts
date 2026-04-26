/**
 * Warehouse Management System (WMS) Models
 * Supports advanced warehouse operations including putaway strategies,
 * wave picking, pick lists, packing slips, and labor management
 */

import { BaseEntity, BaseEntityData } from './BaseEntity';

// ─── Putaway Strategy Types ───────────────────────────────

export type PutawayStrategyType = 'fixed' | 'random' | 'directed';

export interface PutawayStrategyData extends BaseEntityData {
  name: string;
  strategyType: PutawayStrategyType;
  warehouseId?: string;
  priority: number;
  isActive: boolean;
  rules?: Record<string, unknown>;
  description?: string;
}

export class PutawayStrategy extends BaseEntity implements PutawayStrategyData {
  name: string;
  strategyType: PutawayStrategyType;
  warehouseId?: string;
  priority: number;
  isActive: boolean;
  rules?: Record<string, unknown>;
  description?: string;

  constructor(data: PutawayStrategyData) {
    super(data);
    this.name = data.name;
    this.strategyType = data.strategyType;
    this.warehouseId = data.warehouseId;
    this.priority = data.priority;
    this.isActive = data.isActive;
    this.rules = data.rules;
    this.description = data.description;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      name: this.name,
      strategyType: this.strategyType,
      warehouseId: this.warehouseId,
      priority: this.priority,
      isActive: this.isActive,
      rules: this.rules,
      description: this.description,
    };
  }
}

// ─── Putaway Task Types ───────────────────────────────────

export type PutawayTaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface PutawayTaskData extends BaseEntityData {
  taskNumber: string;
  strategyId: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  fromLocation?: string;
  toBinLocationId?: string;
  status: PutawayTaskStatus;
  assignedTo?: string;
  priority: number;
  notes?: string;
  completedAt?: Date;
}

export class PutawayTask extends BaseEntity implements PutawayTaskData {
  taskNumber: string;
  strategyId: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  fromLocation?: string;
  toBinLocationId?: string;
  status: PutawayTaskStatus;
  assignedTo?: string;
  priority: number;
  notes?: string;
  completedAt?: Date;

  constructor(data: PutawayTaskData) {
    super(data);
    this.taskNumber = data.taskNumber;
    this.strategyId = data.strategyId;
    this.warehouseId = data.warehouseId;
    this.productId = data.productId;
    this.quantity = data.quantity;
    this.fromLocation = data.fromLocation;
    this.toBinLocationId = data.toBinLocationId;
    this.status = data.status;
    this.assignedTo = data.assignedTo;
    this.priority = data.priority;
    this.notes = data.notes;
    this.completedAt = data.completedAt;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      taskNumber: this.taskNumber,
      strategyId: this.strategyId,
      warehouseId: this.warehouseId,
      productId: this.productId,
      quantity: this.quantity,
      fromLocation: this.fromLocation,
      toBinLocationId: this.toBinLocationId,
      status: this.status,
      assignedTo: this.assignedTo,
      priority: this.priority,
      notes: this.notes,
      completedAt: this.completedAt,
    };
  }
}

// ─── Wave Pick Types ──────────────────────────────────────

export type WavePickStatus = 'created' | 'released' | 'picking' | 'completed' | 'cancelled';
export type PickingMethod = 'batch' | 'zone' | 'discrete' | 'cluster';

export interface WavePickData extends BaseEntityData {
  waveNumber: string;
  warehouseId: string;
  status: WavePickStatus;
  pickingMethod: PickingMethod;
  priority: number;
  scheduledDate?: Date;
  releasedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export class WavePick extends BaseEntity implements WavePickData {
  waveNumber: string;
  warehouseId: string;
  status: WavePickStatus;
  pickingMethod: PickingMethod;
  priority: number;
  scheduledDate?: Date;
  releasedAt?: Date;
  completedAt?: Date;
  notes?: string;

  constructor(data: WavePickData) {
    super(data);
    this.waveNumber = data.waveNumber;
    this.warehouseId = data.warehouseId;
    this.status = data.status;
    this.pickingMethod = data.pickingMethod;
    this.priority = data.priority;
    this.scheduledDate = data.scheduledDate;
    this.releasedAt = data.releasedAt;
    this.completedAt = data.completedAt;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      waveNumber: this.waveNumber,
      warehouseId: this.warehouseId,
      status: this.status,
      pickingMethod: this.pickingMethod,
      priority: this.priority,
      scheduledDate: this.scheduledDate,
      releasedAt: this.releasedAt,
      completedAt: this.completedAt,
      notes: this.notes,
    };
  }
}

// ─── Pick List Types ──────────────────────────────────────

export type PickListStatus = 'pending' | 'assigned' | 'picking' | 'picked' | 'packed' | 'cancelled';

export interface PickListData extends BaseEntityData {
  pickListNumber: string;
  wavePickId?: string;
  warehouseId: string;
  orderId?: string;
  status: PickListStatus;
  assignedTo?: string;
  priority: number;
  pickingStarted?: Date;
  pickingCompleted?: Date;
}

export class PickList extends BaseEntity implements PickListData {
  pickListNumber: string;
  wavePickId?: string;
  warehouseId: string;
  orderId?: string;
  status: PickListStatus;
  assignedTo?: string;
  priority: number;
  pickingStarted?: Date;
  pickingCompleted?: Date;

  constructor(data: PickListData) {
    super(data);
    this.pickListNumber = data.pickListNumber;
    this.wavePickId = data.wavePickId;
    this.warehouseId = data.warehouseId;
    this.orderId = data.orderId;
    this.status = data.status;
    this.assignedTo = data.assignedTo;
    this.priority = data.priority;
    this.pickingStarted = data.pickingStarted;
    this.pickingCompleted = data.pickingCompleted;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      pickListNumber: this.pickListNumber,
      wavePickId: this.wavePickId,
      warehouseId: this.warehouseId,
      orderId: this.orderId,
      status: this.status,
      assignedTo: this.assignedTo,
      priority: this.priority,
      pickingStarted: this.pickingStarted,
      pickingCompleted: this.pickingCompleted,
    };
  }
}

// ─── Pick List Item Types ─────────────────────────────────

export type PickListItemStatus = 'pending' | 'picked' | 'short_picked' | 'cancelled';

export interface PickListItemData extends BaseEntityData {
  pickListId: string;
  productId: string;
  binLocationId?: string;
  quantityOrdered: number;
  quantityPicked: number;
  batchNumber?: string;
  serialNumbers: string[];
  pickSequence: number;
  status: PickListItemStatus;
  notes?: string;
}

export class PickListItem extends BaseEntity implements PickListItemData {
  pickListId: string;
  productId: string;
  binLocationId?: string;
  quantityOrdered: number;
  quantityPicked: number;
  batchNumber?: string;
  serialNumbers: string[];
  pickSequence: number;
  status: PickListItemStatus;
  notes?: string;

  constructor(data: PickListItemData) {
    super(data);
    this.pickListId = data.pickListId;
    this.productId = data.productId;
    this.binLocationId = data.binLocationId;
    this.quantityOrdered = data.quantityOrdered;
    this.quantityPicked = data.quantityPicked;
    this.batchNumber = data.batchNumber;
    this.serialNumbers = data.serialNumbers;
    this.pickSequence = data.pickSequence;
    this.status = data.status;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      pickListId: this.pickListId,
      productId: this.productId,
      binLocationId: this.binLocationId,
      quantityOrdered: this.quantityOrdered,
      quantityPicked: this.quantityPicked,
      batchNumber: this.batchNumber,
      serialNumbers: this.serialNumbers,
      pickSequence: this.pickSequence,
      status: this.status,
      notes: this.notes,
    };
  }
}

// ─── Packing Slip Types ───────────────────────────────────

export type PackingSlipStatus = 'pending' | 'packing' | 'packed' | 'shipped' | 'cancelled';

export interface PackingSlipData extends BaseEntityData {
  slipNumber: string;
  pickListId: string;
  orderId?: string;
  warehouseId: string;
  status: PackingSlipStatus;
  packedBy?: string;
  packingStarted?: Date;
  packingCompleted?: Date;
  shippingCarrier?: string;
  trackingNumber?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  notes?: string;
}

export class PackingSlip extends BaseEntity implements PackingSlipData {
  slipNumber: string;
  pickListId: string;
  orderId?: string;
  warehouseId: string;
  status: PackingSlipStatus;
  packedBy?: string;
  packingStarted?: Date;
  packingCompleted?: Date;
  shippingCarrier?: string;
  trackingNumber?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  notes?: string;

  constructor(data: PackingSlipData) {
    super(data);
    this.slipNumber = data.slipNumber;
    this.pickListId = data.pickListId;
    this.orderId = data.orderId;
    this.warehouseId = data.warehouseId;
    this.status = data.status;
    this.packedBy = data.packedBy;
    this.packingStarted = data.packingStarted;
    this.packingCompleted = data.packingCompleted;
    this.shippingCarrier = data.shippingCarrier;
    this.trackingNumber = data.trackingNumber;
    this.weight = data.weight;
    this.dimensions = data.dimensions;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      slipNumber: this.slipNumber,
      pickListId: this.pickListId,
      orderId: this.orderId,
      warehouseId: this.warehouseId,
      status: this.status,
      packedBy: this.packedBy,
      packingStarted: this.packingStarted,
      packingCompleted: this.packingCompleted,
      shippingCarrier: this.shippingCarrier,
      trackingNumber: this.trackingNumber,
      weight: this.weight,
      dimensions: this.dimensions,
      notes: this.notes,
    };
  }
}

// ─── Warehouse Worker Types ───────────────────────────────

export type WarehouseWorkerRole = 'picker' | 'packer' | 'receiver' | 'forklift_operator';

export interface WarehouseWorkerData extends BaseEntityData {
  workerId: string;
  name: string;
  email?: string;
  warehouseId: string;
  role: WarehouseWorkerRole;
  isActive: boolean;
  shiftStart?: string;
  shiftEnd?: string;
}

export class WarehouseWorker extends BaseEntity implements WarehouseWorkerData {
  workerId: string;
  name: string;
  email?: string;
  warehouseId: string;
  role: WarehouseWorkerRole;
  isActive: boolean;
  shiftStart?: string;
  shiftEnd?: string;

  constructor(data: WarehouseWorkerData) {
    super(data);
    this.workerId = data.workerId;
    this.name = data.name;
    this.email = data.email;
    this.warehouseId = data.warehouseId;
    this.role = data.role;
    this.isActive = data.isActive;
    this.shiftStart = data.shiftStart;
    this.shiftEnd = data.shiftEnd;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      workerId: this.workerId,
      name: this.name,
      email: this.email,
      warehouseId: this.warehouseId,
      role: this.role,
      isActive: this.isActive,
      shiftStart: this.shiftStart,
      shiftEnd: this.shiftEnd,
    };
  }
}

// ─── Warehouse Productivity Types ─────────────────────────

export type TaskType = 'picking' | 'packing' | 'putaway' | 'cycle_count';

export interface WarehouseProductivityLogData extends BaseEntityData {
  workerId: string;
  warehouseId: string;
  date: Date;
  taskType: TaskType;
  tasksCompleted: number;
  unitsProcessed: number;
  hoursWorked: number;
  efficiency?: number;
  notes?: string;
}

export class WarehouseProductivityLog extends BaseEntity implements WarehouseProductivityLogData {
  workerId: string;
  warehouseId: string;
  date: Date;
  taskType: TaskType;
  tasksCompleted: number;
  unitsProcessed: number;
  hoursWorked: number;
  efficiency?: number;
  notes?: string;

  constructor(data: WarehouseProductivityLogData) {
    super(data);
    this.workerId = data.workerId;
    this.warehouseId = data.warehouseId;
    this.date = data.date;
    this.taskType = data.taskType;
    this.tasksCompleted = data.tasksCompleted;
    this.unitsProcessed = data.unitsProcessed;
    this.hoursWorked = data.hoursWorked;
    this.efficiency = data.efficiency;
    this.notes = data.notes;
  }

  calculateEfficiency(): number {
    if (this.hoursWorked === 0) return 0;
    this.efficiency = this.unitsProcessed / this.hoursWorked;
    return this.efficiency;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      workerId: this.workerId,
      warehouseId: this.warehouseId,
      date: this.date,
      taskType: this.taskType,
      tasksCompleted: this.tasksCompleted,
      unitsProcessed: this.unitsProcessed,
      hoursWorked: this.hoursWorked,
      efficiency: this.efficiency,
      notes: this.notes,
    };
  }
}

// ─── Warehouse Task Assignment Types ──────────────────────

export type TaskAssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface WarehouseTaskAssignmentData extends BaseEntityData {
  workerId: string;
  taskType: TaskType;
  taskId: string;
  warehouseId: string;
  priority: number;
  status: TaskAssignmentStatus;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
}

export class WarehouseTaskAssignment extends BaseEntity implements WarehouseTaskAssignmentData {
  workerId: string;
  taskType: TaskType;
  taskId: string;
  warehouseId: string;
  priority: number;
  status: TaskAssignmentStatus;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;

  constructor(data: WarehouseTaskAssignmentData) {
    super(data);
    this.workerId = data.workerId;
    this.taskType = data.taskType;
    this.taskId = data.taskId;
    this.warehouseId = data.warehouseId;
    this.priority = data.priority;
    this.status = data.status;
    this.assignedAt = data.assignedAt;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.estimatedDuration = data.estimatedDuration;
    this.actualDuration = data.actualDuration;
  }

  calculateActualDuration(): number | undefined {
    if (this.startedAt && this.completedAt) {
      this.actualDuration = (this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60); // minutes
      return this.actualDuration;
    }
    return undefined;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      workerId: this.workerId,
      taskType: this.taskType,
      taskId: this.taskId,
      warehouseId: this.warehouseId,
      priority: this.priority,
      status: this.status,
      assignedAt: this.assignedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      estimatedDuration: this.estimatedDuration,
      actualDuration: this.actualDuration,
    };
  }
}
