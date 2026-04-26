/**
 * Quality Management Service
 * Task 21: Implement Quality Management System
 * Handles inspection plans, inspection results, and non-conformance management
 */

import prisma from '../config/prisma';
import {
  InspectionPlan,
  InspectionCheckpoint,
  InspectionResult,
  InspectionCheckpointResult,
  NonConformance,
  CorrectiveAction,
  InspectionType,
  SamplingType,
  CheckType,
  InspectionStatus,
  CheckpointResult,
  NCRSeverity,
  NCRStatus,
  Disposition,
  RootCauseCategory,
  ActionType,
  ActionStatus,
  Effectiveness,
} from '../models/QualityManagement';

// ─── Inspection Plan Service ───────────────────────────────

export class InspectionPlanService {
  /**
   * Create a new inspection plan
   */
  static async createInspectionPlan(data: {
    name: string;
    description?: string;
    productId?: string;
    inspectionType: InspectionType;
    samplingType?: SamplingType;
    sampleSize?: number;
    samplePercentage?: number;
    acceptanceLevel?: number;
    checkpoints: Array<{
      checkpointNumber: number;
      name: string;
      description?: string;
      checkType: CheckType;
      measurementUnit?: string;
      targetValue?: number;
      minValue?: number;
      maxValue?: number;
      isMandatory?: boolean;
    }>;
  }): Promise<InspectionPlan> {
    // Generate plan number
    const count = await prisma.inspectionPlan.count();
    const planNumber = `IP-${String(count + 1).padStart(6, '0')}`;

    const plan = await prisma.inspectionPlan.create({
      data: {
        planNumber,
        name: data.name,
        description: data.description,
        productId: data.productId,
        inspectionType: data.inspectionType,
        samplingType: data.samplingType || 'none',
        sampleSize: data.sampleSize,
        samplePercentage: data.samplePercentage,
        acceptanceLevel: data.acceptanceLevel,
        checkpoints: {
          create: data.checkpoints.map((cp) => ({
            checkpointNumber: cp.checkpointNumber,
            name: cp.name,
            description: cp.description,
            checkType: cp.checkType,
            measurementUnit: cp.measurementUnit,
            targetValue: cp.targetValue,
            minValue: cp.minValue,
            maxValue: cp.maxValue,
            isMandatory: cp.isMandatory ?? true,
          })),
        },
      },
      include: {
        checkpoints: true,
        product: true,
      },
    });

    return new InspectionPlan({
      id: plan.id,
      planNumber: plan.planNumber,
      name: plan.name,
      description: plan.description || undefined,
      productId: plan.productId || undefined,
      inspectionType: plan.inspectionType as InspectionType,
      samplingType: plan.samplingType as SamplingType,
      sampleSize: plan.sampleSize || undefined,
      samplePercentage: plan.samplePercentage || undefined,
      acceptanceLevel: plan.acceptanceLevel || undefined,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });
  }

  /**
   * Get inspection plan by ID
   */
  static async getInspectionPlanById(id: string) {
    return await prisma.inspectionPlan.findUnique({
      where: { id },
      include: {
        checkpoints: {
          orderBy: { checkpointNumber: 'asc' },
        },
        product: true,
      },
    });
  }

  /**
   * Get all active inspection plans
   */
  static async getActiveInspectionPlans() {
    return await prisma.inspectionPlan.findMany({
      where: { isActive: true },
      include: {
        checkpoints: {
          orderBy: { checkpointNumber: 'asc' },
        },
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get inspection plans by product
   */
  static async getInspectionPlansByProduct(productId: string) {
    return await prisma.inspectionPlan.findMany({
      where: {
        productId,
        isActive: true,
      },
      include: {
        checkpoints: {
          orderBy: { checkpointNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update inspection plan
   */
  static async updateInspectionPlan(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      inspectionType: InspectionType;
      samplingType: SamplingType;
      sampleSize: number;
      samplePercentage: number;
      acceptanceLevel: number;
      isActive: boolean;
    }>
  ) {
    return await prisma.inspectionPlan.update({
      where: { id },
      data,
      include: {
        checkpoints: true,
        product: true,
      },
    });
  }

  /**
   * Deactivate inspection plan
   */
  static async deactivateInspectionPlan(id: string) {
    return await prisma.inspectionPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Calculate sample size based on sampling plan
   */
  static calculateSampleSize(
    totalQuantity: number,
    samplingType: SamplingType,
    samplePercentage?: number,
    fixedSampleSize?: number
  ): number {
    if (samplingType === 'none') {
      return totalQuantity; // Inspect all
    }

    if (fixedSampleSize) {
      return Math.min(fixedSampleSize, totalQuantity);
    }

    if (samplePercentage) {
      return Math.ceil((totalQuantity * samplePercentage) / 100);
    }

    // Default: 10% sampling
    return Math.ceil(totalQuantity * 0.1);
  }
}

// ─── Inspection Result Service ─────────────────────────────

export class InspectionResultService {
  /**
   * Create a new inspection result
   */
  static async createInspectionResult(data: {
    inspectionPlanId: string;
    productId?: string;
    batchNumber?: string;
    lotNumber?: string;
    inspectionDate: Date;
    inspectedBy: string;
    quantityInspected: number;
    notes?: string;
  }): Promise<InspectionResult> {
    // Generate result number
    const count = await prisma.inspectionResult.count();
    const resultNumber = `IR-${String(count + 1).padStart(6, '0')}`;

    const result = await prisma.inspectionResult.create({
      data: {
        resultNumber,
        inspectionPlanId: data.inspectionPlanId,
        productId: data.productId,
        batchNumber: data.batchNumber,
        lotNumber: data.lotNumber,
        inspectionDate: data.inspectionDate,
        inspectedBy: data.inspectedBy,
        quantityInspected: data.quantityInspected,
        quantityAccepted: 0,
        quantityRejected: 0,
        status: 'pending',
        notes: data.notes,
      },
      include: {
        plan: {
          include: {
            checkpoints: true,
          },
        },
        product: true,
      },
    });

    return new InspectionResult({
      id: result.id,
      resultNumber: result.resultNumber,
      inspectionPlanId: result.inspectionPlanId,
      productId: result.productId || undefined,
      batchNumber: result.batchNumber || undefined,
      lotNumber: result.lotNumber || undefined,
      inspectionDate: result.inspectionDate,
      inspectedBy: result.inspectedBy,
      quantityInspected: result.quantityInspected,
      quantityAccepted: result.quantityAccepted,
      quantityRejected: result.quantityRejected,
      status: result.status as InspectionStatus,
      overallResult: result.overallResult as 'pass' | 'fail' | 'conditional' | undefined,
      notes: result.notes || undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  }

  /**
   * Record checkpoint result
   */
  static async recordCheckpointResult(data: {
    inspectionResultId: string;
    checkpointId: string;
    result: CheckpointResult;
    measuredValue?: number;
    notes?: string;
  }) {
    return await prisma.inspectionCheckpointResult.create({
      data: {
        inspectionResultId: data.inspectionResultId,
        checkpointId: data.checkpointId,
        result: data.result,
        measuredValue: data.measuredValue,
        notes: data.notes,
      },
    });
  }

  /**
   * Complete inspection and calculate overall result
   */
  static async completeInspection(inspectionResultId: string) {
    // Get all checkpoint results
    const checkpointResults = await prisma.inspectionCheckpointResult.findMany({
      where: { inspectionResultId },
      include: {
        checkpoint: true,
      },
    });

    // Calculate overall result
    const mandatoryCheckpoints = checkpointResults.filter((cr) => cr.checkpoint.isMandatory);
    const failedMandatory = mandatoryCheckpoints.filter((cr) => cr.result === 'fail');
    const failedAny = checkpointResults.filter((cr) => cr.result === 'fail');

    let overallResult: 'pass' | 'fail' | 'conditional';
    let status: InspectionStatus;

    if (failedMandatory.length > 0) {
      overallResult = 'fail';
      status = 'failed';
    } else if (failedAny.length > 0) {
      overallResult = 'conditional';
      status = 'conditional';
    } else {
      overallResult = 'pass';
      status = 'passed';
    }

    // Get inspection result to calculate quantities
    const inspection = await prisma.inspectionResult.findUnique({
      where: { id: inspectionResultId },
    });

    if (!inspection) {
      throw new Error('Inspection result not found');
    }

    const quantityAccepted = overallResult === 'pass' ? inspection.quantityInspected : 0;
    const quantityRejected = overallResult === 'fail' ? inspection.quantityInspected : 0;

    // Update inspection result
    return await prisma.inspectionResult.update({
      where: { id: inspectionResultId },
      data: {
        status,
        overallResult,
        quantityAccepted,
        quantityRejected,
      },
      include: {
        plan: true,
        product: true,
        checkpointResults: {
          include: {
            checkpoint: true,
          },
        },
      },
    });
  }

  /**
   * Get inspection result by ID
   */
  static async getInspectionResultById(id: string) {
    return await prisma.inspectionResult.findUnique({
      where: { id },
      include: {
        plan: {
          include: {
            checkpoints: true,
          },
        },
        product: true,
        checkpointResults: {
          include: {
            checkpoint: true,
          },
        },
      },
    });
  }

  /**
   * Get inspection results by product
   */
  static async getInspectionResultsByProduct(productId: string) {
    return await prisma.inspectionResult.findMany({
      where: { productId },
      include: {
        plan: true,
      },
      orderBy: { inspectionDate: 'desc' },
    });
  }

  /**
   * Get inspection results by batch
   */
  static async getInspectionResultsByBatch(batchNumber: string) {
    return await prisma.inspectionResult.findMany({
      where: { batchNumber },
      include: {
        plan: true,
        product: true,
      },
      orderBy: { inspectionDate: 'desc' },
    });
  }

  /**
   * Get inspection statistics
   */
  static async getInspectionStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    productId?: string;
  }) {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.inspectionDate = {};
      if (filters.startDate) where.inspectionDate.gte = filters.startDate;
      if (filters.endDate) where.inspectionDate.lte = filters.endDate;
    }

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    const results = await prisma.inspectionResult.findMany({
      where,
      select: {
        overallResult: true,
        quantityInspected: true,
        quantityAccepted: true,
        quantityRejected: true,
      },
    });

    const total = results.length;
    const passed = results.filter((r) => r.overallResult === 'pass').length;
    const failed = results.filter((r) => r.overallResult === 'fail').length;
    const conditional = results.filter((r) => r.overallResult === 'conditional').length;

    const totalInspected = results.reduce((sum, r) => sum + r.quantityInspected, 0);
    const totalAccepted = results.reduce((sum, r) => sum + r.quantityAccepted, 0);
    const totalRejected = results.reduce((sum, r) => sum + r.quantityRejected, 0);

    return {
      totalInspections: total,
      passed,
      failed,
      conditional,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      failRate: total > 0 ? (failed / total) * 100 : 0,
      totalInspected,
      totalAccepted,
      totalRejected,
      acceptanceRate: totalInspected > 0 ? (totalAccepted / totalInspected) * 100 : 0,
      rejectionRate: totalInspected > 0 ? (totalRejected / totalInspected) * 100 : 0,
    };
  }
}

// ─── Non-Conformance Service ───────────────────────────────

export class NonConformanceService {
  /**
   * Create a new non-conformance report
   */
  static async createNonConformance(data: {
    title: string;
    description: string;
    productId?: string;
    batchNumber?: string;
    inspectionResultId?: string;
    severity: NCRSeverity;
    detectedDate: Date;
    detectedBy: string;
    quantityAffected?: number;
    assignedTo?: string;
    targetCloseDate?: Date;
  }): Promise<NonConformance> {
    // Generate NC number
    const count = await prisma.nonConformance.count();
    const ncNumber = `NC-${String(count + 1).padStart(6, '0')}`;

    const nc = await prisma.nonConformance.create({
      data: {
        ncNumber,
        title: data.title,
        description: data.description,
        productId: data.productId,
        batchNumber: data.batchNumber,
        inspectionResultId: data.inspectionResultId,
        severity: data.severity,
        status: 'open',
        detectedDate: data.detectedDate,
        detectedBy: data.detectedBy,
        quantityAffected: data.quantityAffected,
        assignedTo: data.assignedTo,
        targetCloseDate: data.targetCloseDate,
      },
      include: {
        product: true,
        inspectionResult: true,
      },
    });

    return new NonConformance({
      id: nc.id,
      ncNumber: nc.ncNumber,
      title: nc.title,
      description: nc.description,
      productId: nc.productId || undefined,
      batchNumber: nc.batchNumber || undefined,
      inspectionResultId: nc.inspectionResultId || undefined,
      severity: nc.severity as NCRSeverity,
      status: nc.status as NCRStatus,
      detectedDate: nc.detectedDate,
      detectedBy: nc.detectedBy,
      quantityAffected: nc.quantityAffected || undefined,
      disposition: nc.disposition as Disposition | undefined,
      rootCause: nc.rootCause || undefined,
      rootCauseCategory: nc.rootCauseCategory as RootCauseCategory | undefined,
      assignedTo: nc.assignedTo || undefined,
      targetCloseDate: nc.targetCloseDate || undefined,
      actualCloseDate: nc.actualCloseDate || undefined,
      closedBy: nc.closedBy || undefined,
      createdAt: nc.createdAt,
      updatedAt: nc.updatedAt,
    });
  }

  /**
   * Update non-conformance
   */
  static async updateNonConformance(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      severity: NCRSeverity;
      status: NCRStatus;
      disposition: Disposition;
      rootCause: string;
      rootCauseCategory: RootCauseCategory;
      assignedTo: string;
      targetCloseDate: Date;
    }>
  ) {
    return await prisma.nonConformance.update({
      where: { id },
      data,
      include: {
        product: true,
        inspectionResult: true,
        correctiveActions: true,
      },
    });
  }

  /**
   * Close non-conformance
   */
  static async closeNonConformance(id: string, closedBy: string) {
    return await prisma.nonConformance.update({
      where: { id },
      data: {
        status: 'closed',
        actualCloseDate: new Date(),
        closedBy,
      },
    });
  }

  /**
   * Get non-conformance by ID
   */
  static async getNonConformanceById(id: string) {
    return await prisma.nonConformance.findUnique({
      where: { id },
      include: {
        product: true,
        inspectionResult: true,
        correctiveActions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get all non-conformances with filters
   */
  static async getNonConformances(filters?: {
    status?: NCRStatus;
    severity?: NCRSeverity;
    productId?: string;
    assignedTo?: string;
  }) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.assignedTo) where.assignedTo = filters.assignedTo;

    return await prisma.nonConformance.findMany({
      where,
      include: {
        product: true,
        correctiveActions: true,
      },
      orderBy: { detectedDate: 'desc' },
    });
  }

  /**
   * Get non-conformance statistics
   */
  static async getNonConformanceStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.detectedDate = {};
      if (filters.startDate) where.detectedDate.gte = filters.startDate;
      if (filters.endDate) where.detectedDate.lte = filters.endDate;
    }

    const ncs = await prisma.nonConformance.findMany({
      where,
      select: {
        severity: true,
        status: true,
        rootCauseCategory: true,
      },
    });

    const total = ncs.length;
    const bySeverity = {
      critical: ncs.filter((nc) => nc.severity === 'critical').length,
      major: ncs.filter((nc) => nc.severity === 'major').length,
      minor: ncs.filter((nc) => nc.severity === 'minor').length,
    };

    const byStatus = {
      open: ncs.filter((nc) => nc.status === 'open').length,
      investigating: ncs.filter((nc) => nc.status === 'investigating').length,
      resolved: ncs.filter((nc) => nc.status === 'resolved').length,
      closed: ncs.filter((nc) => nc.status === 'closed').length,
    };

    const byRootCause: Record<string, number> = {};
    ncs.forEach((nc) => {
      if (nc.rootCauseCategory) {
        byRootCause[nc.rootCauseCategory] = (byRootCause[nc.rootCauseCategory] || 0) + 1;
      }
    });

    return {
      total,
      bySeverity,
      byStatus,
      byRootCause,
    };
  }
}

// ─── Corrective Action Service ─────────────────────────────

export class CorrectiveActionService {
  /**
   * Create a new corrective action
   */
  static async createCorrectiveAction(data: {
    nonConformanceId: string;
    actionType: ActionType;
    description: string;
    assignedTo: string;
    dueDate: Date;
    notes?: string;
  }): Promise<CorrectiveAction> {
    // Generate CA number
    const count = await prisma.correctiveAction.count();
    const caNumber = `CA-${String(count + 1).padStart(6, '0')}`;

    const ca = await prisma.correctiveAction.create({
      data: {
        caNumber,
        nonConformanceId: data.nonConformanceId,
        actionType: data.actionType,
        description: data.description,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate,
        status: 'open',
        notes: data.notes,
      },
      include: {
        nonConformance: true,
      },
    });

    return new CorrectiveAction({
      id: ca.id,
      caNumber: ca.caNumber,
      nonConformanceId: ca.nonConformanceId,
      actionType: ca.actionType as ActionType,
      description: ca.description,
      assignedTo: ca.assignedTo,
      dueDate: ca.dueDate,
      completedDate: ca.completedDate || undefined,
      status: ca.status as ActionStatus,
      effectiveness: ca.effectiveness as Effectiveness | undefined,
      verifiedBy: ca.verifiedBy || undefined,
      verifiedDate: ca.verifiedDate || undefined,
      notes: ca.notes || undefined,
      createdAt: ca.createdAt,
      updatedAt: ca.updatedAt,
    });
  }

  /**
   * Update corrective action status
   */
  static async updateCorrectiveAction(
    id: string,
    data: Partial<{
      status: ActionStatus;
      completedDate: Date;
      effectiveness: Effectiveness;
      verifiedBy: string;
      verifiedDate: Date;
      notes: string;
    }>
  ) {
    return await prisma.correctiveAction.update({
      where: { id },
      data,
      include: {
        nonConformance: true,
      },
    });
  }

  /**
   * Complete corrective action
   */
  static async completeCorrectiveAction(id: string) {
    return await prisma.correctiveAction.update({
      where: { id },
      data: {
        status: 'completed',
        completedDate: new Date(),
      },
    });
  }

  /**
   * Verify corrective action effectiveness
   */
  static async verifyCorrectiveAction(
    id: string,
    verifiedBy: string,
    effectiveness: Effectiveness
  ) {
    return await prisma.correctiveAction.update({
      where: { id },
      data: {
        status: 'verified',
        effectiveness,
        verifiedBy,
        verifiedDate: new Date(),
      },
    });
  }

  /**
   * Get corrective action by ID
   */
  static async getCorrectiveActionById(id: string) {
    return await prisma.correctiveAction.findUnique({
      where: { id },
      include: {
        nonConformance: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Get corrective actions by non-conformance
   */
  static async getCorrectiveActionsByNC(nonConformanceId: string) {
    return await prisma.correctiveAction.findMany({
      where: { nonConformanceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get corrective actions assigned to user
   */
  static async getCorrectiveActionsByAssignee(assignedTo: string) {
    return await prisma.correctiveAction.findMany({
      where: { assignedTo },
      include: {
        nonConformance: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get overdue corrective actions
   */
  static async getOverdueCorrectiveActions() {
    return await prisma.correctiveAction.findMany({
      where: {
        dueDate: {
          lt: new Date(),
        },
        status: {
          notIn: ['completed', 'verified', 'closed'],
        },
      },
      include: {
        nonConformance: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
