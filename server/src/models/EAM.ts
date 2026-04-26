/**
 * Enterprise Asset Management (EAM) Models
 * Type definitions for EAM entities
 */

import { BaseEntity, BaseEntityData } from './BaseEntity';

// ==================== Asset Registry Models ====================

export interface AssetData extends BaseEntityData {
  assetNumber: string;
  name: string;
  category: 'machinery' | 'vehicle' | 'building' | 'equipment' | 'it_asset';
  location: string;
  department?: string;
  status: 'operational' | 'maintenance' | 'breakdown' | 'retired' | 'disposed';
  acquisitionDate: Date;
  acquisitionCost: number;
  currentValue: number;
  depreciationMethod?: 'straight_line' | 'declining_balance' | 'units_of_production';
  usefulLife?: number; // in years
  salvageValue?: number;
  specifications: Record<string, string>;
  qrCode?: string;
  parentAssetId?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  warrantyExpiry?: Date;
  notes?: string;
}

export class Asset extends BaseEntity implements AssetData {
  assetNumber: string;
  name: string;
  category: 'machinery' | 'vehicle' | 'building' | 'equipment' | 'it_asset';
  location: string;
  department?: string;
  status: 'operational' | 'maintenance' | 'breakdown' | 'retired' | 'disposed';
  acquisitionDate: Date;
  acquisitionCost: number;
  currentValue: number;
  depreciationMethod?: 'straight_line' | 'declining_balance' | 'units_of_production';
  usefulLife?: number;
  salvageValue?: number;
  specifications: Record<string, string>;
  qrCode?: string;
  parentAssetId?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  warrantyExpiry?: Date;
  notes?: string;

  constructor(data: AssetData) {
    super(data);
    this.assetNumber = data.assetNumber;
    this.name = data.name;
    this.category = data.category;
    this.location = data.location;
    this.department = data.department;
    this.status = data.status;
    this.acquisitionDate = data.acquisitionDate;
    this.acquisitionCost = data.acquisitionCost;
    this.currentValue = data.currentValue;
    this.depreciationMethod = data.depreciationMethod;
    this.usefulLife = data.usefulLife;
    this.salvageValue = data.salvageValue;
    this.specifications = data.specifications;
    this.qrCode = data.qrCode;
    this.parentAssetId = data.parentAssetId;
    this.serialNumber = data.serialNumber;
    this.manufacturer = data.manufacturer;
    this.model = data.model;
    this.warrantyExpiry = data.warrantyExpiry;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      assetNumber: this.assetNumber,
      name: this.name,
      category: this.category,
      location: this.location,
      department: this.department,
      status: this.status,
      acquisitionDate: this.acquisitionDate,
      acquisitionCost: this.acquisitionCost,
      currentValue: this.currentValue,
      depreciationMethod: this.depreciationMethod,
      usefulLife: this.usefulLife,
      salvageValue: this.salvageValue,
      specifications: this.specifications,
      qrCode: this.qrCode,
      parentAssetId: this.parentAssetId,
      serialNumber: this.serialNumber,
      manufacturer: this.manufacturer,
      model: this.model,
      warrantyExpiry: this.warrantyExpiry,
      notes: this.notes,
    };
  }
}

// ==================== Maintenance Models ====================

export interface MaintenancePlanData extends BaseEntityData {
  planNumber: string;
  assetId: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'usage_based';
  frequencyValue?: number; // For usage-based (e.g., every 1000 hours)
  tasks: string[];
  estimatedDuration: number; // in hours
  requiredParts: string[]; // Product IDs
  isActive: boolean;
  lastExecuted?: Date;
  nextScheduled?: Date;
}

export class MaintenancePlan extends BaseEntity implements MaintenancePlanData {
  planNumber: string;
  assetId: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'usage_based';
  frequencyValue?: number;
  tasks: string[];
  estimatedDuration: number;
  requiredParts: string[];
  isActive: boolean;
  lastExecuted?: Date;
  nextScheduled?: Date;

  constructor(data: MaintenancePlanData) {
    super(data);
    this.planNumber = data.planNumber;
    this.assetId = data.assetId;
    this.name = data.name;
    this.description = data.description;
    this.frequency = data.frequency;
    this.frequencyValue = data.frequencyValue;
    this.tasks = data.tasks;
    this.estimatedDuration = data.estimatedDuration;
    this.requiredParts = data.requiredParts;
    this.isActive = data.isActive;
    this.lastExecuted = data.lastExecuted;
    this.nextScheduled = data.nextScheduled;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      planNumber: this.planNumber,
      assetId: this.assetId,
      name: this.name,
      description: this.description,
      frequency: this.frequency,
      frequencyValue: this.frequencyValue,
      tasks: this.tasks,
      estimatedDuration: this.estimatedDuration,
      requiredParts: this.requiredParts,
      isActive: this.isActive,
      lastExecuted: this.lastExecuted,
      nextScheduled: this.nextScheduled,
    };
  }
}

export interface MaintenanceTaskData extends BaseEntityData {
  taskNumber: string;
  assetId: string;
  planId?: string;
  taskType: 'preventive' | 'corrective' | 'predictive' | 'breakdown';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: Date;
  completedDate?: Date;
  technicianId?: string;
  technicianName?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  actualDuration?: number; // in hours
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  notes?: string;
}

export class MaintenanceTask extends BaseEntity implements MaintenanceTaskData {
  taskNumber: string;
  assetId: string;
  planId?: string;
  taskType: 'preventive' | 'corrective' | 'predictive' | 'breakdown';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: Date;
  completedDate?: Date;
  technicianId?: string;
  technicianName?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  actualDuration?: number;
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  notes?: string;

  constructor(data: MaintenanceTaskData) {
    super(data);
    this.taskNumber = data.taskNumber;
    this.assetId = data.assetId;
    this.planId = data.planId;
    this.taskType = data.taskType;
    this.description = data.description;
    this.priority = data.priority;
    this.scheduledDate = data.scheduledDate;
    this.completedDate = data.completedDate;
    this.technicianId = data.technicianId;
    this.technicianName = data.technicianName;
    this.status = data.status;
    this.actualDuration = data.actualDuration;
    this.laborCost = data.laborCost;
    this.partsCost = data.partsCost;
    this.totalCost = data.totalCost;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      taskNumber: this.taskNumber,
      assetId: this.assetId,
      planId: this.planId,
      taskType: this.taskType,
      description: this.description,
      priority: this.priority,
      scheduledDate: this.scheduledDate,
      completedDate: this.completedDate,
      technicianId: this.technicianId,
      technicianName: this.technicianName,
      status: this.status,
      actualDuration: this.actualDuration,
      laborCost: this.laborCost,
      partsCost: this.partsCost,
      totalCost: this.totalCost,
      notes: this.notes,
    };
  }
}

export interface SparePartUsage {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface MaintenanceRecordData extends BaseEntityData {
  taskId: string;
  assetId: string;
  completedDate: Date;
  technicianId: string;
  technicianName: string;
  actualDuration: number;
  spareParts: SparePartUsage[];
  laborCost: number;
  partsCost: number;
  totalCost: number;
  workPerformed: string;
  findings?: string;
  recommendations?: string;
}

export class MaintenanceRecord extends BaseEntity implements MaintenanceRecordData {
  taskId: string;
  assetId: string;
  completedDate: Date;
  technicianId: string;
  technicianName: string;
  actualDuration: number;
  spareParts: SparePartUsage[];
  laborCost: number;
  partsCost: number;
  totalCost: number;
  workPerformed: string;
  findings?: string;
  recommendations?: string;

  constructor(data: MaintenanceRecordData) {
    super(data);
    this.taskId = data.taskId;
    this.assetId = data.assetId;
    this.completedDate = data.completedDate;
    this.technicianId = data.technicianId;
    this.technicianName = data.technicianName;
    this.actualDuration = data.actualDuration;
    this.spareParts = data.spareParts;
    this.laborCost = data.laborCost;
    this.partsCost = data.partsCost;
    this.totalCost = data.totalCost;
    this.workPerformed = data.workPerformed;
    this.findings = data.findings;
    this.recommendations = data.recommendations;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      taskId: this.taskId,
      assetId: this.assetId,
      completedDate: this.completedDate,
      technicianId: this.technicianId,
      technicianName: this.technicianName,
      actualDuration: this.actualDuration,
      spareParts: this.spareParts,
      laborCost: this.laborCost,
      partsCost: this.partsCost,
      totalCost: this.totalCost,
      workPerformed: this.workPerformed,
      findings: this.findings,
      recommendations: this.recommendations,
    };
  }
}

// ==================== Asset Health Monitoring Models ====================

export interface AssetHealthMetric {
  metricName: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'normal' | 'warning' | 'critical';
}

export interface AssetHealthData extends BaseEntityData {
  assetId: string;
  healthScore: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  metrics: AssetHealthMetric[];
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  mtbf?: number; // Mean Time Between Failures (hours)
  mttr?: number; // Mean Time To Repair (hours)
  availability?: number; // Percentage
  notes?: string;
}

export class AssetHealth extends BaseEntity implements AssetHealthData {
  assetId: string;
  healthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  metrics: AssetHealthMetric[];
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  mtbf?: number;
  mttr?: number;
  availability?: number;
  notes?: string;

  constructor(data: AssetHealthData) {
    super(data);
    this.assetId = data.assetId;
    this.healthScore = data.healthScore;
    this.status = data.status;
    this.metrics = data.metrics;
    this.lastInspectionDate = data.lastInspectionDate;
    this.nextInspectionDate = data.nextInspectionDate;
    this.mtbf = data.mtbf;
    this.mttr = data.mttr;
    this.availability = data.availability;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      assetId: this.assetId,
      healthScore: this.healthScore,
      status: this.status,
      metrics: this.metrics,
      lastInspectionDate: this.lastInspectionDate,
      nextInspectionDate: this.nextInspectionDate,
      mtbf: this.mtbf,
      mttr: this.mttr,
      availability: this.availability,
      notes: this.notes,
    };
  }
}

// ==================== Asset Utilization Models ====================

export interface AssetUtilizationData extends BaseEntityData {
  assetId: string;
  period: Date; // Month/Year
  totalHours: number; // Total hours in period
  operationalHours: number;
  maintenanceHours: number;
  downtimeHours: number;
  utilizationRate: number; // Percentage
  efficiency: number; // Percentage
  notes?: string;
}

export class AssetUtilization extends BaseEntity implements AssetUtilizationData {
  assetId: string;
  period: Date;
  totalHours: number;
  operationalHours: number;
  maintenanceHours: number;
  downtimeHours: number;
  utilizationRate: number;
  efficiency: number;
  notes?: string;

  constructor(data: AssetUtilizationData) {
    super(data);
    this.assetId = data.assetId;
    this.period = data.period;
    this.totalHours = data.totalHours;
    this.operationalHours = data.operationalHours;
    this.maintenanceHours = data.maintenanceHours;
    this.downtimeHours = data.downtimeHours;
    this.utilizationRate = data.utilizationRate;
    this.efficiency = data.efficiency;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      assetId: this.assetId,
      period: this.period,
      totalHours: this.totalHours,
      operationalHours: this.operationalHours,
      maintenanceHours: this.maintenanceHours,
      downtimeHours: this.downtimeHours,
      utilizationRate: this.utilizationRate,
      efficiency: this.efficiency,
      notes: this.notes,
    };
  }
}

// ==================== Plant Shutdown Models ====================

export interface ShutdownAsset {
  assetId: string;
  assetName: string;
  maintenanceTasks: string[];
  estimatedDuration: number;
  assignedTechnician?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface PlantShutdownData extends BaseEntityData {
  shutdownNumber: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  assets: ShutdownAsset[];
  totalEstimatedCost: number;
  actualCost?: number;
  completionPercentage: number;
  notes?: string;
}

export class PlantShutdown extends BaseEntity implements PlantShutdownData {
  shutdownNumber: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  assets: ShutdownAsset[];
  totalEstimatedCost: number;
  actualCost?: number;
  completionPercentage: number;
  notes?: string;

  constructor(data: PlantShutdownData) {
    super(data);
    this.shutdownNumber = data.shutdownNumber;
    this.name = data.name;
    this.description = data.description;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.status = data.status;
    this.assets = data.assets;
    this.totalEstimatedCost = data.totalEstimatedCost;
    this.actualCost = data.actualCost;
    this.completionPercentage = data.completionPercentage;
    this.notes = data.notes;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      shutdownNumber: this.shutdownNumber,
      name: this.name,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      status: this.status,
      assets: this.assets,
      totalEstimatedCost: this.totalEstimatedCost,
      actualCost: this.actualCost,
      completionPercentage: this.completionPercentage,
      notes: this.notes,
    };
  }
}
