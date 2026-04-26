/**
 * EAM Module Tests
 * Tests for Enterprise Asset Management functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import prisma from '../config/prisma';
import eamService from '../services/eam.service';

describe('EAM Module', () => {
  let testAssetId: string;
  let testPlanId: string;
  let testTaskId: string;
  
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.maintenanceRecord.deleteMany({
      where: {
        asset: {
          assetNumber: { startsWith: 'AST-TEST' }
        }
      }
    });
    
    await prisma.maintenanceTask.deleteMany({
      where: {
        asset: {
          assetNumber: { startsWith: 'AST-TEST' }
        }
      }
    });
    
    await prisma.maintenancePlan.deleteMany({
      where: {
        asset: {
          assetNumber: { startsWith: 'AST-TEST' }
        }
      }
    });
    
    await prisma.asset.deleteMany({
      where: {
        assetNumber: { startsWith: 'AST-TEST' }
      }
    });
  });
  
  afterAll(async () => {
    // Clean up test data
    if (testAssetId) {
      await prisma.maintenanceRecord.deleteMany({
        where: { assetId: testAssetId }
      });
      
      await prisma.maintenanceTask.deleteMany({
        where: { assetId: testAssetId }
      });
      
      await prisma.maintenancePlan.deleteMany({
        where: { assetId: testAssetId }
      });
      
      await prisma.assetHealth.deleteMany({
        where: { assetId: testAssetId }
      });
      
      await prisma.assetUtilization.deleteMany({
        where: { assetId: testAssetId }
      });
      
      await prisma.asset.delete({
        where: { id: testAssetId }
      });
    }
  });
  
  // ==================== Task 25.1: Asset Registry ====================
  
  describe('Task 25.1: Asset Registry', () => {
    it('should register a new asset with specifications', async () => {
      const assetData = {
        name: 'Test CNC Machine',
        category: 'machinery',
        location: 'Factory Floor A',
        department: 'Manufacturing',
        acquisitionDate: new Date('2023-01-15'),
        acquisitionCost: 150000,
        depreciationMethod: 'straight_line',
        usefulLife: 10,
        salvageValue: 15000,
        specifications: {
          manufacturer: 'HAAS',
          model: 'VF-2',
          serialNumber: 'SN123456',
          maxRPM: '8100',
          toolCapacity: '20'
        },
        serialNumber: 'SN123456',
        manufacturer: 'HAAS',
        model: 'VF-2'
      };
      
      const asset = await eamService.registerAsset(assetData);
      testAssetId = asset.id;
      
      expect(asset).toBeDefined();
      expect(asset.assetNumber).toMatch(/^AST-/);
      expect(asset.name).toBe('Test CNC Machine');
      expect(asset.category).toBe('machinery');
      expect(asset.location).toBe('Factory Floor A');
      expect(asset.acquisitionCost).toBe(150000);
      expect(asset.currentValue).toBe(150000);
      expect(asset.status).toBe('operational');
      expect(asset.qrCode).toBeDefined();
      expect(asset.specifications).toHaveProperty('manufacturer', 'HAAS');
    });
    
    it('should get asset with hierarchy', async () => {
      const asset = await eamService.getAssetWithHierarchy(testAssetId);
      
      expect(asset).toBeDefined();
      expect(asset?.id).toBe(testAssetId);
      expect(asset?.maintenancePlans).toBeDefined();
      expect(asset?.maintenanceTasks).toBeDefined();
    });
    
    it('should update asset location', async () => {
      const updatedAsset = await eamService.updateAssetLocation(
        testAssetId,
        'Factory Floor B',
        'Production'
      );
      
      expect(updatedAsset.location).toBe('Factory Floor B');
      expect(updatedAsset.department).toBe('Production');
    });
    
    it('should update asset status', async () => {
      const updatedAsset = await eamService.updateAssetStatus(testAssetId, 'maintenance');
      
      expect(updatedAsset.status).toBe('maintenance');
      
      // Reset to operational for other tests
      await eamService.updateAssetStatus(testAssetId, 'operational');
    });
  });
  
  // ==================== Task 25.2: Preventive Maintenance ====================
  
  describe('Task 25.2: Preventive Maintenance', () => {
    it('should create a maintenance plan', async () => {
      const planData = {
        assetId: testAssetId,
        name: 'Monthly Preventive Maintenance',
        description: 'Regular monthly maintenance for CNC machine',
        frequency: 'monthly',
        tasks: [
          'Check oil levels',
          'Inspect belts and chains',
          'Clean filters',
          'Calibrate axes'
        ],
        estimatedDuration: 4,
        requiredParts: []
      };
      
      const plan = await eamService.createMaintenancePlan(planData);
      testPlanId = plan.id;
      
      expect(plan).toBeDefined();
      expect(plan.planNumber).toMatch(/^MP-/);
      expect(plan.name).toBe('Monthly Preventive Maintenance');
      expect(plan.frequency).toBe('monthly');
      expect(plan.tasks).toHaveLength(4);
      expect(plan.isActive).toBe(true);
      expect(plan.nextScheduled).toBeDefined();
    });
    
    it('should schedule preventive maintenance from plan', async () => {
      const task = await eamService.schedulePreventiveMaintenance(testPlanId);
      testTaskId = task.id;
      
      expect(task).toBeDefined();
      expect(task.taskNumber).toMatch(/^MT-/);
      expect(task.assetId).toBe(testAssetId);
      expect(task.planId).toBe(testPlanId);
      expect(task.taskType).toBe('preventive');
      expect(task.status).toBe('scheduled');
    });
    
    it('should create a corrective maintenance task', async () => {
      const taskData = {
        assetId: testAssetId,
        taskType: 'corrective',
        description: 'Fix spindle alignment issue',
        priority: 'high',
        scheduledDate: new Date(),
        technicianName: 'John Smith'
      };
      
      const task = await eamService.createMaintenanceTask(taskData);
      
      expect(task).toBeDefined();
      expect(task.taskType).toBe('corrective');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('scheduled');
    });
    
    it('should get maintenance history', async () => {
      // First complete a task
      await eamService.updateMaintenanceTaskStatus(testTaskId, 'completed');
      await prisma.maintenanceTask.update({
        where: { id: testTaskId },
        data: { completedDate: new Date() }
      });
      
      const history = await eamService.getMaintenanceHistory(testAssetId);
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });
  
  // ==================== Task 25.3: Spare Parts Management ====================
  
  describe('Task 25.3: Spare Parts Management', () => {
    it('should record maintenance completion with spare parts', async () => {
      // Create a new task for completion
      const task = await eamService.createMaintenanceTask({
        assetId: testAssetId,
        taskType: 'preventive',
        description: 'Replace filters',
        scheduledDate: new Date()
      });
      
      const completionData = {
        technicianId: 'tech-001',
        technicianName: 'John Smith',
        actualDuration: 3.5,
        laborCost: 175,
        spareParts: [
          {
            productId: 'part-001',
            productName: 'Air Filter',
            quantity: 2,
            unitCost: 25
          },
          {
            productId: 'part-002',
            productName: 'Oil Filter',
            quantity: 1,
            unitCost: 35
          }
        ],
        workPerformed: 'Replaced air and oil filters, checked all fluid levels',
        findings: 'Filters were heavily clogged',
        recommendations: 'Consider more frequent filter changes'
      };
      
      const record = await eamService.recordMaintenanceCompletion(task.id, completionData);
      
      expect(record).toBeDefined();
      expect(record.assetId).toBe(testAssetId);
      expect(record.technicianName).toBe('John Smith');
      expect(record.actualDuration).toBe(3.5);
      expect(record.laborCost).toBe(175);
      expect(record.partsCost).toBe(85); // (2 * 25) + (1 * 35)
      expect(record.totalCost).toBe(260); // 175 + 85
      expect(record.spareParts).toHaveLength(2);
    });
  });
  
  // ==================== Task 25.4: Asset Health Monitoring ====================
  
  describe('Task 25.4: Asset Health Monitoring', () => {
    it('should calculate asset health score', async () => {
      const health = await eamService.calculateAssetHealth(testAssetId);
      
      expect(health).toBeDefined();
      expect(health.assetId).toBe(testAssetId);
      expect(health.healthScore).toBeGreaterThanOrEqual(0);
      expect(health.healthScore).toBeLessThanOrEqual(100);
      expect(health.status).toMatch(/excellent|good|fair|poor|critical/);
    });
    
    it('should get asset health report', async () => {
      const report = await eamService.getAssetHealthReport(testAssetId);
      
      expect(report).toBeDefined();
      expect(report?.assetId).toBe(testAssetId);
      expect(report?.asset).toBeDefined();
    });
  });
  
  // ==================== Task 25.5: Maintenance Cost Forecasting ====================
  
  describe('Task 25.5: Maintenance Cost Forecasting', () => {
    it('should forecast maintenance costs', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      
      const forecast = await eamService.forecastMaintenanceCosts(testAssetId, startDate, endDate);
      
      expect(forecast).toBeDefined();
      expect(forecast.assetId).toBe(testAssetId);
      expect(forecast.forecast).toBeDefined();
      expect(forecast.forecast.total).toBeGreaterThanOrEqual(0);
      expect(forecast.forecast.preventive).toBeDefined();
      expect(forecast.forecast.corrective).toBeDefined();
      expect(forecast.forecast.breakdown).toBeDefined();
      expect(forecast.historical).toBeDefined();
    });
  });
  
  // ==================== Task 25.6: Asset Utilization Tracking ====================
  
  describe('Task 25.6: Asset Utilization Tracking', () => {
    it('should calculate asset utilization', async () => {
      const period = new Date();
      
      const utilization = await eamService.calculateAssetUtilization(testAssetId, period);
      
      expect(utilization).toBeDefined();
      expect(utilization.assetId).toBe(testAssetId);
      expect(utilization.totalHours).toBeGreaterThan(0);
      expect(utilization.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(utilization.utilizationRate).toBeLessThanOrEqual(100);
    });
    
    it('should get asset utilization report', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      
      const report = await eamService.getAssetUtilizationReport(testAssetId, startDate, endDate);
      
      expect(report).toBeDefined();
      expect(Array.isArray(report)).toBe(true);
    });
  });
  
  // ==================== Task 25.7: Plant Shutdown Planning ====================
  
  describe('Task 25.7: Plant Shutdown Planning', () => {
    let testShutdownId: string;
    
    it('should create a plant shutdown plan', async () => {
      const shutdownData = {
        name: 'Q1 2024 Maintenance Shutdown',
        description: 'Quarterly maintenance shutdown for all production equipment',
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-03-17'),
        assetIds: [testAssetId]
      };
      
      const shutdown = await eamService.createPlantShutdown(shutdownData);
      testShutdownId = shutdown.id;
      
      expect(shutdown).toBeDefined();
      expect(shutdown.shutdownNumber).toMatch(/^SD-/);
      expect(shutdown.name).toBe('Q1 2024 Maintenance Shutdown');
      expect(shutdown.status).toBe('planned');
      expect(shutdown.assets).toHaveLength(1);
      expect(shutdown.completionPercentage).toBe(0);
    });
    
    it('should update shutdown asset status', async () => {
      const updated = await eamService.updateShutdownAssetStatus(
        testShutdownId,
        testAssetId,
        'in_progress',
        'tech-001'
      );
      
      expect(updated).toBeDefined();
      const assets = updated.assets as any[];
      const asset = assets.find(a => a.assetId === testAssetId);
      expect(asset?.status).toBe('in_progress');
      expect(asset?.assignedTechnician).toBe('tech-001');
    });
    
    it('should complete shutdown when all assets are done', async () => {
      const updated = await eamService.updateShutdownAssetStatus(
        testShutdownId,
        testAssetId,
        'completed'
      );
      
      expect(updated.completionPercentage).toBe(100);
      expect(updated.status).toBe('completed');
    });
    
    it('should list plant shutdowns', async () => {
      const shutdowns = await eamService.listPlantShutdowns();
      
      expect(shutdowns).toBeDefined();
      expect(Array.isArray(shutdowns)).toBe(true);
      expect(shutdowns.length).toBeGreaterThan(0);
    });
    
    afterAll(async () => {
      // Clean up shutdown
      if (testShutdownId) {
        await prisma.plantShutdown.delete({
          where: { id: testShutdownId }
        });
      }
    });
  });
});
