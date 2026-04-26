/**
 * Quality Management System Tests
 * Task 21: Implement Quality Management System
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  InspectionPlanService,
  InspectionResultService,
  NonConformanceService,
  CorrectiveActionService,
} from '../services/qualityManagement.service';
import prisma from '../config/prisma';

describe('Quality Management System', () => {
  let testProductId: string;
  let testInspectionPlanId: string;
  let testInspectionResultId: string;
  let testNonConformanceId: string;

  beforeAll(async () => {
    // Create a test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product for QMS',
        sku: 'TEST-QMS-001',
        price: 100,
        cost: 50,
        stock: 100,
        unit: 'pcs',
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testNonConformanceId) {
      await prisma.correctiveAction.deleteMany({
        where: { nonConformanceId: testNonConformanceId },
      });
      await prisma.nonConformance.delete({
        where: { id: testNonConformanceId },
      });
    }

    if (testInspectionResultId) {
      await prisma.inspectionCheckpointResult.deleteMany({
        where: { inspectionResultId: testInspectionResultId },
      });
      await prisma.inspectionResult.delete({
        where: { id: testInspectionResultId },
      });
    }

    if (testInspectionPlanId) {
      await prisma.inspectionCheckpoint.deleteMany({
        where: { inspectionPlanId: testInspectionPlanId },
      });
      await prisma.inspectionPlan.delete({
        where: { id: testInspectionPlanId },
      });
    }

    if (testProductId) {
      await prisma.product.delete({
        where: { id: testProductId },
      });
    }

    await prisma.$disconnect();
  });

  describe('Inspection Plan Service', () => {
    it('should create an inspection plan with checkpoints', async () => {
      const plan = await InspectionPlanService.createInspectionPlan({
        name: 'Receiving Inspection for Test Product',
        description: 'Standard receiving inspection',
        productId: testProductId,
        inspectionType: 'receiving',
        samplingType: 'random',
        sampleSize: 10,
        acceptanceLevel: 2.5,
        checkpoints: [
          {
            checkpointNumber: 1,
            name: 'Visual Inspection',
            description: 'Check for visible defects',
            checkType: 'visual',
            isMandatory: true,
          },
          {
            checkpointNumber: 2,
            name: 'Dimension Check',
            description: 'Measure product dimensions',
            checkType: 'measurement',
            measurementUnit: 'mm',
            targetValue: 100,
            minValue: 99,
            maxValue: 101,
            isMandatory: true,
          },
        ],
      });

      expect(plan).toBeDefined();
      expect(plan.planNumber).toMatch(/^IP-\d{6}$/);
      expect(plan.name).toBe('Receiving Inspection for Test Product');
      expect(plan.inspectionType).toBe('receiving');

      testInspectionPlanId = plan.id;
    });

    it('should retrieve inspection plan by ID', async () => {
      const plan = await InspectionPlanService.getInspectionPlanById(testInspectionPlanId);

      expect(plan).toBeDefined();
      expect(plan?.id).toBe(testInspectionPlanId);
      expect(plan?.checkpoints).toHaveLength(2);
    });

    it('should calculate sample size correctly', () => {
      const sampleSize = InspectionPlanService.calculateSampleSize(100, 'random', 10);
      expect(sampleSize).toBe(10);

      const fullInspection = InspectionPlanService.calculateSampleSize(100, 'none');
      expect(fullInspection).toBe(100);
    });
  });

  describe('Inspection Result Service', () => {
    it('should create an inspection result', async () => {
      const result = await InspectionResultService.createInspectionResult({
        inspectionPlanId: testInspectionPlanId,
        productId: testProductId,
        batchNumber: 'BATCH-001',
        inspectionDate: new Date(),
        inspectedBy: 'test-user',
        quantityInspected: 10,
        notes: 'Test inspection',
      });

      expect(result).toBeDefined();
      expect(result.resultNumber).toMatch(/^IR-\d{6}$/);
      expect(result.status).toBe('pending');
      expect(result.quantityInspected).toBe(10);

      testInspectionResultId = result.id;
    });

    it('should record checkpoint results', async () => {
      const plan = await InspectionPlanService.getInspectionPlanById(testInspectionPlanId);
      const checkpoints = plan?.checkpoints || [];

      // Record visual inspection - pass
      await InspectionResultService.recordCheckpointResult({
        inspectionResultId: testInspectionResultId,
        checkpointId: checkpoints[0].id,
        result: 'pass',
        notes: 'No visible defects',
      });

      // Record dimension check - pass
      await InspectionResultService.recordCheckpointResult({
        inspectionResultId: testInspectionResultId,
        checkpointId: checkpoints[1].id,
        result: 'pass',
        measuredValue: 100.2,
        notes: 'Within tolerance',
      });

      const result = await InspectionResultService.getInspectionResultById(
        testInspectionResultId
      );
      expect(result?.checkpointResults).toHaveLength(2);
    });

    it('should complete inspection and calculate overall result', async () => {
      const result = await InspectionResultService.completeInspection(testInspectionResultId);

      expect(result).toBeDefined();
      expect(result.status).toBe('passed');
      expect(result.overallResult).toBe('pass');
      expect(result.quantityAccepted).toBe(10);
      expect(result.quantityRejected).toBe(0);
    });

    it('should get inspection statistics', async () => {
      const stats = await InspectionResultService.getInspectionStatistics({
        productId: testProductId,
      });

      expect(stats).toBeDefined();
      expect(stats.totalInspections).toBeGreaterThan(0);
      expect(stats.passRate).toBeGreaterThan(0);
    });
  });

  describe('Non-Conformance Service', () => {
    it('should create a non-conformance report', async () => {
      const nc = await NonConformanceService.createNonConformance({
        title: 'Dimension Out of Tolerance',
        description: 'Product dimensions exceed maximum tolerance',
        productId: testProductId,
        batchNumber: 'BATCH-002',
        severity: 'major',
        detectedDate: new Date(),
        detectedBy: 'test-user',
        quantityAffected: 5,
        assignedTo: 'quality-manager',
        targetCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });

      expect(nc).toBeDefined();
      expect(nc.ncNumber).toMatch(/^NC-\d{6}$/);
      expect(nc.status).toBe('open');
      expect(nc.severity).toBe('major');

      testNonConformanceId = nc.id;
    });

    it('should update non-conformance with root cause', async () => {
      const nc = await NonConformanceService.updateNonConformance(testNonConformanceId, {
        status: 'investigating',
        rootCause: 'Machine calibration drift',
        rootCauseCategory: 'equipment',
        disposition: 'rework',
      });

      expect(nc).toBeDefined();
      expect(nc.status).toBe('investigating');
      expect(nc.rootCauseCategory).toBe('equipment');
    });

    it('should get non-conformance statistics', async () => {
      const stats = await NonConformanceService.getNonConformanceStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.bySeverity).toBeDefined();
      expect(stats.byStatus).toBeDefined();
    });
  });

  describe('Corrective Action Service', () => {
    it('should create a corrective action', async () => {
      const ca = await CorrectiveActionService.createCorrectiveAction({
        nonConformanceId: testNonConformanceId,
        actionType: 'corrective',
        description: 'Recalibrate machine and re-inspect affected batch',
        assignedTo: 'maintenance-team',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        notes: 'Priority action',
      });

      expect(ca).toBeDefined();
      expect(ca.caNumber).toMatch(/^CA-\d{6}$/);
      expect(ca.status).toBe('open');
      expect(ca.actionType).toBe('corrective');
    });

    it('should complete corrective action', async () => {
      const cas = await CorrectiveActionService.getCorrectiveActionsByNC(testNonConformanceId);
      const caId = cas[0].id;

      const ca = await CorrectiveActionService.completeCorrectiveAction(caId);

      expect(ca).toBeDefined();
      expect(ca.status).toBe('completed');
      expect(ca.completedDate).toBeDefined();
    });

    it('should verify corrective action effectiveness', async () => {
      const cas = await CorrectiveActionService.getCorrectiveActionsByNC(testNonConformanceId);
      const caId = cas[0].id;

      const ca = await CorrectiveActionService.verifyCorrectiveAction(
        caId,
        'quality-manager',
        'effective'
      );

      expect(ca).toBeDefined();
      expect(ca.status).toBe('verified');
      expect(ca.effectiveness).toBe('effective');
      expect(ca.verifiedBy).toBe('quality-manager');
    });
  });
});
