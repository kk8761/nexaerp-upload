/**
 * Quality Management System Models
 * Task 21: Implement Quality Management System
 */

import { BaseEntity, BaseEntityData } from './BaseEntity';

// ─── Inspection Plan Models ───────────────────────────────

export type InspectionType = 'receiving' | 'in_process' | 'final' | 'periodic';
export type SamplingType = 'none' | 'random' | 'systematic' | 'stratified';
export type CheckType = 'visual' | 'measurement' | 'functional' | 'destructive';
export type InspectionStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'conditional';
export type CheckpointResult = 'pass' | 'fail' | 'na' | 'pending';

export interface InspectionPlanData extends BaseEntityData {
  planNumber: string;
  name: string;
  description?: string;
  productId?: string;
  inspectionType: InspectionType;
  samplingType: SamplingType;
  sampleSize?: number;
  samplePercentage?: number;
  acceptanceLevel?: number; // AQL
  isActive: boolean;
}

export class InspectionPlan extends BaseEntity implements InspectionPlanData {
  planNumber: string;
  name: string;
  description?: string;
  productId?: string;
  inspectionType: InspectionType;
  samplingType: SamplingType;
  sampleSize?: number;
  samplePercentage?: number;
  acceptanceLevel?: number;
  isActive: boolean;

  constructor(data: InspectionPlanData) {
    super(data);
    this.planNumber = data.planNumber;
    this.name = data.name;
    this.description = data.description;
    this.productId = data.productId;
    this.inspectionType = data.inspectionType;
    this.samplingType = data.samplingType;
    this.sampleSize = data.sampleSize;
    this.samplePercentage = data.samplePercentage;
    this.acceptanceLevel = data.acceptanceLevel;
    this.isActive = data.isActive;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      planNumber: this.planNumber,
      name: this.name,
      description: this.description,
      productId: this.productId,
      inspectionType: this.inspectionType,
      samplingType: this.samplingType,
      sampleSize: this.sampleSize,
      samplePercentage: this.samplePercentage,
      acceptanceLevel: this.acceptanceLevel,
      isActive: this.isActive,
    };
  }
}

export interface InspectionCheckpointData extends BaseEntityData {
  inspectionPlanId: string;
  checkpointNumber: number;
  name: string;
  description?: string;
  checkType: CheckType;
  measurementUnit?: string;
  targetValue?: number;
  minValue?: number;
  maxValue?: number;
  isMandatory: boolean;
}

export class InspectionCheckpoint extends BaseEntity implements InspectionCheckpointData {
  inspectionPlanId: string;
  checkpointNumber: number;
  name: string;
  description?: string;
  checkType: CheckType;
  measurementUnit?: string;
  targetValue?: number;
  minValue?: number;
  maxValue?: number;
  isMandatory: boolean;

  constructor(data: InspectionCheckpointData) {
    super(data);
    this.inspectionPlanId = data.inspectionPlanId;
    this.checkpointNumber = data.checkpointNumber;
    this.name = data.name;
    this.description = data.description;
    this.checkType = data.checkType;
    this.measurementUnit = data.measurementUnit;
    this.targetValue = data.targetValue;
    this.minValue = data.minValue;
    this.maxValue = data.maxValue;
    this.isMandatory = data.isMandatory;
  }

  /**
   * Evaluate if a measured value passes this checkpoint
   */
  evaluateResult(measuredValue?: number): CheckpointResult {
    if (!measuredValue && this.checkType === 'measurement') {
      return 'pending';
    }

    if (this.checkType !== 'measurement') {
      return 'pending'; // Manual evaluation required
    }

    if (measuredValue === undefined) {
      return 'pending';
    }

    // Check against min/max values
    if (this.minValue !== undefined && measuredValue < this.minValue) {
      return 'fail';
    }

    if (this.maxValue !== undefined && measuredValue > this.maxValue) {
      return 'fail';
    }

    return 'pass';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      inspectionPlanId: this.inspectionPlanId,
      checkpointNumber: this.checkpointNumber,
      name: this.name,
      description: this.description,
      checkType: this.checkType,
      measurementUnit: this.measurementUnit,
      targetValue: this.targetValue,
      minValue: this.minValue,
      maxValue: this.maxValue,
      isMandatory: this.isMandatory,
    };
  }
}

export interface InspectionResultData extends BaseEntityData {
  resultNumber: string;
  inspectionPlanId: string;
  productId?: string;
  batchNumber?: string;
  lotNumber?: string;
  inspectionDate: Date;
  inspectedBy: string;
  quantityInspected: number;
  quantityAccepted: number;
  quantityRejected: number;
  status: InspectionStatus;
  overallResult?: 'pass' | 'fail' | 'conditional';
  notes?: string;
}

export class InspectionResult extends BaseEntity implements InspectionResultData {
  resultNumber: string;
  inspectionPlanId: string;
  productId?: string;
  batchNumber?: string;
  lotNumber?: string;
  inspectionDate: Date;
  inspectedBy: string;
  quantityInspected: number;
  quantityAccepted: number;
  quantityRejected: number;
  status: InspectionStatus;
  overallResult?: 'pass' | 'fail' | 'conditional';
  notes?: string;

  constructor(data: InspectionResultData) {
    super(data);
    this.resultNumber = data.resultNumber;
    this.inspectionPlanId = data.inspectionPlanId;
    this.productId = data.productId;
    this.batchNumber = data.batchNumber;
    this.lotNumber = data.lotNumber;
    this.inspectionDate = data.inspectionDate;
    this.inspectedBy = data.inspectedBy;
    this.quantityInspected = data.quantityInspected;
    this.quantityAccepted = data.quantityAccepted;
    this.quantityRejected = data.quantityRejected;
    this.status = data.status;
    this.overallResult = data.overallResult;
    this.notes = data.notes;
  }

  /**
   * Calculate rejection rate
   */
  getRejectionRate(): number {
    if (this.quantityInspected === 0) return 0;
    return (this.quantityRejected / this.quantityInspected) * 100;
  }

  /**
   * Calculate acceptance rate
   */
  getAcceptanceRate(): number {
    if (this.quantityInspected === 0) return 0;
    return (this.quantityAccepted / this.quantityInspected) * 100;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resultNumber: this.resultNumber,
      inspectionPlanId: this.inspectionPlanId,
      productId: this.productId,
      batchNumber: this.batchNumber,
      lotNumber: this.lotNumber,
      inspectionDate: this.inspectionDate,
      inspectedBy: this.inspectedBy,
      quantityInspected: this.quantityInspected,
      quantityAccepted: this.quantityAccepted,
      quantityRejected: this.quantityRejected,
      status: this.status,
      overallResult: this.overallResult,
      notes: this.notes,
      rejectionRate: this.getRejectionRate(),
      acceptanceRate: this.getAcceptanceRate(),
    };
  }
}

export interface InspectionCheckpointResultData extends BaseEntityData {
  inspectionResultId: string;
  checkpointId: string;
  result: CheckpointResult;
  measuredValue?: number;
  notes?: string;
}

export class InspectionCheckpointResult extends BaseEntity implements InspectionCheckpointResultData {
  inspectionResultId: string;
  checkpointId: string;
  result: CheckpointResult;
  measuredValue?: number;
  notes?: string;

  constructor(data: InspectionCheckpointResultData) {
    super(data);
    this.inspectionResultId = data.inspectionResultId;
    this.checkpointId = data.checkpointId;
    this.result = data.result;
    this.measuredValue = data.measuredValue;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      inspectionResultId: this.inspectionResultId,
      checkpointId: this.checkpointId,
      result: this.result,
      measuredValue: this.measuredValue,
      notes: this.notes,
    };
  }
}

// ─── Non-Conformance Models ───────────────────────────────

export type NCRSeverity = 'critical' | 'major' | 'minor';
export type NCRStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export type Disposition = 'rework' | 'scrap' | 'use_as_is' | 'return_to_supplier';
export type RootCauseCategory = 'material' | 'process' | 'equipment' | 'human' | 'environment' | 'method';
export type ActionType = 'corrective' | 'preventive';
export type ActionStatus = 'open' | 'in_progress' | 'completed' | 'verified' | 'closed';
export type Effectiveness = 'effective' | 'ineffective' | 'pending_verification';

export interface NonConformanceData extends BaseEntityData {
  ncNumber: string;
  title: string;
  description: string;
  productId?: string;
  batchNumber?: string;
  inspectionResultId?: string;
  severity: NCRSeverity;
  status: NCRStatus;
  detectedDate: Date;
  detectedBy: string;
  quantityAffected?: number;
  disposition?: Disposition;
  rootCause?: string;
  rootCauseCategory?: RootCauseCategory;
  assignedTo?: string;
  targetCloseDate?: Date;
  actualCloseDate?: Date;
  closedBy?: string;
}

export class NonConformance extends BaseEntity implements NonConformanceData {
  ncNumber: string;
  title: string;
  description: string;
  productId?: string;
  batchNumber?: string;
  inspectionResultId?: string;
  severity: NCRSeverity;
  status: NCRStatus;
  detectedDate: Date;
  detectedBy: string;
  quantityAffected?: number;
  disposition?: Disposition;
  rootCause?: string;
  rootCauseCategory?: RootCauseCategory;
  assignedTo?: string;
  targetCloseDate?: Date;
  actualCloseDate?: Date;
  closedBy?: string;

  constructor(data: NonConformanceData) {
    super(data);
    this.ncNumber = data.ncNumber;
    this.title = data.title;
    this.description = data.description;
    this.productId = data.productId;
    this.batchNumber = data.batchNumber;
    this.inspectionResultId = data.inspectionResultId;
    this.severity = data.severity;
    this.status = data.status;
    this.detectedDate = data.detectedDate;
    this.detectedBy = data.detectedBy;
    this.quantityAffected = data.quantityAffected;
    this.disposition = data.disposition;
    this.rootCause = data.rootCause;
    this.rootCauseCategory = data.rootCauseCategory;
    this.assignedTo = data.assignedTo;
    this.targetCloseDate = data.targetCloseDate;
    this.actualCloseDate = data.actualCloseDate;
    this.closedBy = data.closedBy;
  }

  /**
   * Check if non-conformance is overdue
   */
  isOverdue(): boolean {
    if (!this.targetCloseDate || this.status === 'closed') {
      return false;
    }
    return new Date() > this.targetCloseDate;
  }

  /**
   * Calculate days open
   */
  getDaysOpen(): number {
    const endDate = this.actualCloseDate || new Date();
    const diffTime = Math.abs(endDate.getTime() - this.detectedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      ncNumber: this.ncNumber,
      title: this.title,
      description: this.description,
      productId: this.productId,
      batchNumber: this.batchNumber,
      inspectionResultId: this.inspectionResultId,
      severity: this.severity,
      status: this.status,
      detectedDate: this.detectedDate,
      detectedBy: this.detectedBy,
      quantityAffected: this.quantityAffected,
      disposition: this.disposition,
      rootCause: this.rootCause,
      rootCauseCategory: this.rootCauseCategory,
      assignedTo: this.assignedTo,
      targetCloseDate: this.targetCloseDate,
      actualCloseDate: this.actualCloseDate,
      closedBy: this.closedBy,
      isOverdue: this.isOverdue(),
      daysOpen: this.getDaysOpen(),
    };
  }
}

export interface CorrectiveActionData extends BaseEntityData {
  caNumber: string;
  nonConformanceId: string;
  actionType: ActionType;
  description: string;
  assignedTo: string;
  dueDate: Date;
  completedDate?: Date;
  status: ActionStatus;
  effectiveness?: Effectiveness;
  verifiedBy?: string;
  verifiedDate?: Date;
  notes?: string;
}

export class CorrectiveAction extends BaseEntity implements CorrectiveActionData {
  caNumber: string;
  nonConformanceId: string;
  actionType: ActionType;
  description: string;
  assignedTo: string;
  dueDate: Date;
  completedDate?: Date;
  status: ActionStatus;
  effectiveness?: Effectiveness;
  verifiedBy?: string;
  verifiedDate?: Date;
  notes?: string;

  constructor(data: CorrectiveActionData) {
    super(data);
    this.caNumber = data.caNumber;
    this.nonConformanceId = data.nonConformanceId;
    this.actionType = data.actionType;
    this.description = data.description;
    this.assignedTo = data.assignedTo;
    this.dueDate = data.dueDate;
    this.completedDate = data.completedDate;
    this.status = data.status;
    this.effectiveness = data.effectiveness;
    this.verifiedBy = data.verifiedBy;
    this.verifiedDate = data.verifiedDate;
    this.notes = data.notes;
  }

  /**
   * Check if action is overdue
   */
  isOverdue(): boolean {
    if (this.status === 'completed' || this.status === 'verified' || this.status === 'closed') {
      return false;
    }
    return new Date() > this.dueDate;
  }

  /**
   * Calculate days until due (negative if overdue)
   */
  getDaysUntilDue(): number {
    const diffTime = this.dueDate.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      caNumber: this.caNumber,
      nonConformanceId: this.nonConformanceId,
      actionType: this.actionType,
      description: this.description,
      assignedTo: this.assignedTo,
      dueDate: this.dueDate,
      completedDate: this.completedDate,
      status: this.status,
      effectiveness: this.effectiveness,
      verifiedBy: this.verifiedBy,
      verifiedDate: this.verifiedDate,
      notes: this.notes,
      isOverdue: this.isOverdue(),
      daysUntilDue: this.getDaysUntilDue(),
    };
  }
}
