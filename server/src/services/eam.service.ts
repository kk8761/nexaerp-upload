/**
 * Enterprise Asset Management (EAM) Service
 * Handles asset lifecycle, maintenance, spare parts, and equipment monitoring
 */

import prisma from '../config/prisma';

export class EAMService {
  
  // ==================== Task 25.1: Asset Registry ====================
  
  /**
   * Register new asset
   */
  async registerAsset(data: {
    name: string;
    category: string;
    location: string;
    department?: string;
    acquisitionDate: Date;
    acquisitionCost: number;
    depreciationMethod?: string;
    usefulLife?: number;
    salvageValue?: number;
    specifications?: Record<string, string>;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    warrantyExpiry?: Date;
    parentAssetId?: string;
    notes?: string;
  }) {
    const assetNumber = `AST-${Date.now()}`;
    
    // Generate QR code data (in real implementation, this would generate actual QR code image)
    const qrCode = `QR-${assetNumber}`;
    
    return prisma.asset.create({
      data: {
        assetNumber,
        name: data.name,
        category: data.category as any,
        location: data.location,
        department: data.department,
        status: 'operational',
        acquisitionDate: data.acquisitionDate,
        acquisitionCost: data.acquisitionCost,
        currentValue: data.acquisitionCost,
        depreciationMethod: data.depreciationMethod as any,
        usefulLife: data.usefulLife,
        salvageValue: data.salvageValue || 0,
        specifications: data.specifications || {},
        qrCode,
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        model: data.model,
        warrantyExpiry: data.warrantyExpiry,
        parentAssetId: data.parentAssetId,
        notes: data.notes
      }
    });
  }
  
  /**
   * Get asset with hierarchy (parent and children)
   */
  async getAssetWithHierarchy(assetId: string) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        parent: true,
        children: true,
        maintenancePlans: {
          where: { isActive: true }
        },
        maintenanceTasks: {
          orderBy: { scheduledDate: 'desc' },
          take: 10
        }
      }
    });
    
    return asset;
  }
  
  /**
   * Update asset location
   */
  async updateAssetLocation(assetId: string, location: string, department?: string) {
    return prisma.asset.update({
      where: { id: assetId },
      data: {
        location,
        department,
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Update asset status
   */
  async updateAssetStatus(assetId: string, status: string) {
    return prisma.asset.update({
      where: { id: assetId },
      data: {
        status: status as any,
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Get asset by QR code
   */
  async getAssetByQRCode(qrCode: string) {
    return prisma.asset.findFirst({
      where: { qrCode },
      include: {
        maintenancePlans: {
          where: { isActive: true }
        },
        maintenanceTasks: {
          where: { status: { in: ['scheduled', 'in_progress'] } },
          orderBy: { scheduledDate: 'asc' }
        }
      }
    });
  }
  
  /**
   * List assets with filters
   */
  async listAssets(filters?: {
    category?: string;
    status?: string;
    location?: string;
    department?: string;
  }) {
    const where: any = {};
    
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.location) {
      where.location = filters.location;
    }
    if (filters?.department) {
      where.department = filters.department;
    }
    
    return prisma.asset.findMany({
      where,
      include: {
        _count: {
          select: {
            maintenanceTasks: true,
            maintenancePlans: true
          }
        }
      },
      orderBy: {
        assetNumber: 'asc'
      }
    });
  }
  
  // ==================== Task 25.2: Preventive Maintenance ====================
  
  /**
   * Create maintenance plan
   */
  async createMaintenancePlan(data: {
    assetId: string;
    name: string;
    description?: string;
    frequency: string;
    frequencyValue?: number;
    tasks: string[];
    estimatedDuration: number;
    requiredParts?: string[];
  }) {
    const planNumber = `MP-${Date.now()}`;
    
    // Calculate next scheduled date based on frequency
    const nextScheduled = this.calculateNextScheduledDate(data.frequency);
    
    return prisma.maintenancePlan.create({
      data: {
        planNumber,
        assetId: data.assetId,
        name: data.name,
        description: data.description,
        frequency: data.frequency as any,
        frequencyValue: data.frequencyValue,
        tasks: data.tasks,
        estimatedDuration: data.estimatedDuration,
        requiredParts: data.requiredParts || [],
        isActive: true,
        nextScheduled
      }
    });
  }
  
  /**
   * Calculate next scheduled date based on frequency
   */
  private calculateNextScheduledDate(frequency: string): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }
  }
  
  /**
   * Schedule preventive maintenance tasks
   * Automatically generates work orders from maintenance plans
   */
  async schedulePreventiveMaintenance(planId: string) {
    const plan = await prisma.maintenancePlan.findUnique({
      where: { id: planId },
      include: { asset: true }
    });
    
    if (!plan || !plan.isActive) {
      throw new Error('Maintenance plan not found or inactive');
    }
    
    const taskNumber = `MT-${Date.now()}`;
    
    // Create maintenance task
    const task = await prisma.maintenanceTask.create({
      data: {
        taskNumber,
        assetId: plan.assetId,
        planId: plan.id,
        taskType: 'preventive',
        description: `Preventive maintenance: ${plan.name}`,
        priority: 'medium',
        scheduledDate: plan.nextScheduled || new Date(),
        status: 'scheduled'
      }
    });
    
    // Update plan's last executed and next scheduled dates
    const nextScheduled = this.calculateNextScheduledDate(plan.frequency);
    await prisma.maintenancePlan.update({
      where: { id: planId },
      data: {
        lastExecuted: new Date(),
        nextScheduled,
        updatedAt: new Date()
      }
    });
    
    return task;
  }
  
  /**
   * Create maintenance task (work order)
   */
  async createMaintenanceTask(data: {
    assetId: string;
    planId?: string;
    taskType: string;
    description: string;
    priority?: string;
    scheduledDate: Date;
    technicianId?: string;
    technicianName?: string;
  }) {
    const taskNumber = `MT-${Date.now()}`;
    
    return prisma.maintenanceTask.create({
      data: {
        taskNumber,
        assetId: data.assetId,
        planId: data.planId,
        taskType: data.taskType as any,
        description: data.description,
        priority: (data.priority as any) || 'medium',
        scheduledDate: data.scheduledDate,
        technicianId: data.technicianId,
        technicianName: data.technicianName,
        status: 'scheduled'
      }
    });
  }
  
  /**
   * Update maintenance task status
   */
  async updateMaintenanceTaskStatus(taskId: string, status: string) {
    return prisma.maintenanceTask.update({
      where: { id: taskId },
      data: {
        status: status as any,
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Get maintenance history for asset
   */
  async getMaintenanceHistory(assetId: string) {
    return prisma.maintenanceTask.findMany({
      where: {
        assetId,
        status: 'completed'
      },
      include: {
        maintenanceRecords: true
      },
      orderBy: {
        completedDate: 'desc'
      }
    });
  }
  
  // ==================== Task 25.3: Spare Parts Management ====================
  
  /**
   * Record maintenance completion with spare parts usage
   */
  async recordMaintenanceCompletion(taskId: string, data: {
    technicianId: string;
    technicianName: string;
    actualDuration: number;
    laborCost: number;
    spareParts: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
    }>;
    workPerformed: string;
    findings?: string;
    recommendations?: string;
  }) {
    const task = await prisma.maintenanceTask.findUnique({
      where: { id: taskId }
    });
    
    if (!task) {
      throw new Error('Maintenance task not found');
    }
    
    // Calculate costs
    const partsCost = data.spareParts.reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
    const totalCost = data.laborCost + partsCost;
    
    // Create maintenance record
    const record = await prisma.maintenanceRecord.create({
      data: {
        taskId,
        assetId: task.assetId,
        completedDate: new Date(),
        technicianId: data.technicianId,
        technicianName: data.technicianName,
        actualDuration: data.actualDuration,
        spareParts: data.spareParts.map(part => ({
          ...part,
          totalCost: part.quantity * part.unitCost
        })) as any,
        laborCost: data.laborCost,
        partsCost,
        totalCost,
        workPerformed: data.workPerformed,
        findings: data.findings,
        recommendations: data.recommendations
      }
    });
    
    // Update task
    await prisma.maintenanceTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedDate: new Date(),
        technicianId: data.technicianId,
        technicianName: data.technicianName,
        actualDuration: data.actualDuration,
        laborCost: data.laborCost,
        partsCost,
        totalCost,
        updatedAt: new Date()
      }
    });
    
    // Update inventory for spare parts (if inventory module is available)
    for (const part of data.spareParts) {
      try {
        // This would integrate with inventory service to update stock
        await this.updateSparePartInventory(part.productId, part.quantity);
      } catch (error) {
        console.warn(`Failed to update inventory for part ${part.productId}:`, error);
      }
    }
    
    return record;
  }
  
  /**
   * Update spare part inventory
   * Integrates with inventory module
   */
  private async updateSparePartInventory(productId: string, quantityUsed: number) {
    // Find product in inventory
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      console.warn(`Product ${productId} not found in inventory`);
      return;
    }
    
    // Update stock quantity
    await prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          decrement: quantityUsed
        },
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Get spare parts linked to asset
   */
  async getAssetSpareParts(assetId: string) {
    // Get all maintenance plans for the asset
    const plans = await prisma.maintenancePlan.findMany({
      where: {
        assetId,
        isActive: true
      }
    });
    
    // Extract unique part IDs
    const partIds = [...new Set(plans.flatMap(plan => plan.requiredParts as string[]))];
    
    // Get product details
    if (partIds.length === 0) {
      return [];
    }
    
    return prisma.product.findMany({
      where: {
        id: { in: partIds }
      }
    });
  }
  
  // ==================== Task 25.4: Asset Health Monitoring ====================
  
  /**
   * Calculate and update asset health score
   */
  async calculateAssetHealth(assetId: string) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        maintenanceTasks: {
          where: {
            completedDate: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
            }
          }
        }
      }
    });
    
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Calculate health score based on multiple factors
    let healthScore = 100;
    
    // Factor 1: Age of asset (max -20 points)
    const ageInYears = (Date.now() - asset.acquisitionDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const usefulLife = asset.usefulLife || 10;
    const ageDeduction = Math.min(20, (ageInYears / usefulLife) * 20);
    healthScore -= ageDeduction;
    
    // Factor 2: Maintenance frequency (max -30 points)
    const breakdownTasks = asset.maintenanceTasks.filter(t => t.taskType === 'breakdown').length;
    const maintenanceDeduction = Math.min(30, breakdownTasks * 5);
    healthScore -= maintenanceDeduction;
    
    // Factor 3: Current status (max -30 points)
    if (asset.status === 'breakdown') {
      healthScore -= 30;
    } else if (asset.status === 'maintenance') {
      healthScore -= 15;
    }
    
    // Factor 4: Warranty status (max -10 points)
    if (asset.warrantyExpiry && asset.warrantyExpiry < new Date()) {
      healthScore -= 10;
    }
    
    // Ensure score is between 0 and 100
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    // Determine status based on score
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (healthScore >= 90) status = 'excellent';
    else if (healthScore >= 75) status = 'good';
    else if (healthScore >= 60) status = 'fair';
    else if (healthScore >= 40) status = 'poor';
    else status = 'critical';
    
    // Calculate MTBF and MTTR
    const completedTasks = asset.maintenanceTasks.filter(t => t.status === 'completed');
    const mttr = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length
      : 0;
    
    // Create or update asset health record
    const existingHealth = await prisma.assetHealth.findFirst({
      where: { assetId }
    });
    
    if (existingHealth) {
      return prisma.assetHealth.update({
        where: { id: existingHealth.id },
        data: {
          healthScore,
          status,
          mttr,
          updatedAt: new Date()
        }
      });
    } else {
      return prisma.assetHealth.create({
        data: {
          assetId,
          healthScore,
          status,
          metrics: [],
          mttr
        }
      });
    }
  }
  
  /**
   * Get asset health report
   */
  async getAssetHealthReport(assetId: string) {
    return prisma.assetHealth.findFirst({
      where: { assetId },
      include: {
        asset: true
      }
    });
  }
  
  // ==================== Task 25.5: Maintenance Cost Forecasting ====================
  
  /**
   * Forecast maintenance costs for an asset
   */
  async forecastMaintenanceCosts(assetId: string, startDate: Date, endDate: Date) {
    // Get historical maintenance costs
    const historicalTasks = await prisma.maintenanceTask.findMany({
      where: {
        assetId,
        status: 'completed',
        completedDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
        }
      }
    });
    
    // Calculate average cost per maintenance type
    const preventiveCosts = historicalTasks.filter(t => t.taskType === 'preventive');
    const correctiveCosts = historicalTasks.filter(t => t.taskType === 'corrective');
    const breakdownCosts = historicalTasks.filter(t => t.taskType === 'breakdown');
    
    const avgPreventiveCost = preventiveCosts.length > 0
      ? preventiveCosts.reduce((sum, t) => sum + (t.totalCost || 0), 0) / preventiveCosts.length
      : 0;
    
    const avgCorrectiveCost = correctiveCosts.length > 0
      ? correctiveCosts.reduce((sum, t) => sum + (t.totalCost || 0), 0) / correctiveCosts.length
      : 0;
    
    const avgBreakdownCost = breakdownCosts.length > 0
      ? breakdownCosts.reduce((sum, t) => sum + (t.totalCost || 0), 0) / breakdownCosts.length
      : 0;
    
    // Get scheduled maintenance plans
    const plans = await prisma.maintenancePlan.findMany({
      where: {
        assetId,
        isActive: true
      }
    });
    
    // Calculate number of scheduled maintenances in forecast period
    const daysInPeriod = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    let scheduledMaintenances = 0;
    
    for (const plan of plans) {
      switch (plan.frequency) {
        case 'daily':
          scheduledMaintenances += daysInPeriod;
          break;
        case 'weekly':
          scheduledMaintenances += daysInPeriod / 7;
          break;
        case 'monthly':
          scheduledMaintenances += daysInPeriod / 30;
          break;
        case 'quarterly':
          scheduledMaintenances += daysInPeriod / 90;
          break;
        case 'yearly':
          scheduledMaintenances += daysInPeriod / 365;
          break;
      }
    }
    
    // Forecast costs
    const forecastedPreventiveCost = scheduledMaintenances * avgPreventiveCost;
    
    // Estimate corrective maintenance (assume 20% of preventive)
    const forecastedCorrectiveCost = scheduledMaintenances * 0.2 * avgCorrectiveCost;
    
    // Estimate breakdown maintenance (assume 10% of preventive)
    const forecastedBreakdownCost = scheduledMaintenances * 0.1 * avgBreakdownCost;
    
    const totalForecastedCost = forecastedPreventiveCost + forecastedCorrectiveCost + forecastedBreakdownCost;
    
    return {
      assetId,
      startDate,
      endDate,
      forecast: {
        preventive: {
          count: Math.round(scheduledMaintenances),
          avgCost: avgPreventiveCost,
          totalCost: forecastedPreventiveCost
        },
        corrective: {
          count: Math.round(scheduledMaintenances * 0.2),
          avgCost: avgCorrectiveCost,
          totalCost: forecastedCorrectiveCost
        },
        breakdown: {
          count: Math.round(scheduledMaintenances * 0.1),
          avgCost: avgBreakdownCost,
          totalCost: forecastedBreakdownCost
        },
        total: totalForecastedCost
      },
      historical: {
        preventive: {
          count: preventiveCosts.length,
          avgCost: avgPreventiveCost
        },
        corrective: {
          count: correctiveCosts.length,
          avgCost: avgCorrectiveCost
        },
        breakdown: {
          count: breakdownCosts.length,
          avgCost: avgBreakdownCost
        }
      }
    };
  }
  
  // ==================== Task 25.6: Asset Utilization Tracking ====================
  
  /**
   * Calculate asset utilization
   */
  async calculateAssetUtilization(assetId: string, period: Date) {
    // Get maintenance tasks for the period
    const startOfMonth = new Date(period.getFullYear(), period.getMonth(), 1);
    const endOfMonth = new Date(period.getFullYear(), period.getMonth() + 1, 0);
    
    const maintenanceTasks = await prisma.maintenanceTask.findMany({
      where: {
        assetId,
        completedDate: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        status: 'completed'
      }
    });
    
    // Calculate hours
    const totalHours = (endOfMonth.getTime() - startOfMonth.getTime()) / (60 * 60 * 1000);
    const maintenanceHours = maintenanceTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
    
    // Get breakdown hours (tasks with type 'breakdown')
    const breakdownTasks = maintenanceTasks.filter(t => t.taskType === 'breakdown');
    const downtimeHours = breakdownTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0);
    
    const operationalHours = totalHours - maintenanceHours - downtimeHours;
    const utilizationRate = (operationalHours / totalHours) * 100;
    const efficiency = operationalHours > 0 ? ((operationalHours - downtimeHours) / operationalHours) * 100 : 0;
    
    // Create or update utilization record
    const existing = await prisma.assetUtilization.findFirst({
      where: {
        assetId,
        period: startOfMonth
      }
    });
    
    if (existing) {
      return prisma.assetUtilization.update({
        where: { id: existing.id },
        data: {
          totalHours,
          operationalHours,
          maintenanceHours,
          downtimeHours,
          utilizationRate,
          efficiency,
          updatedAt: new Date()
        }
      });
    } else {
      return prisma.assetUtilization.create({
        data: {
          assetId,
          period: startOfMonth,
          totalHours,
          operationalHours,
          maintenanceHours,
          downtimeHours,
          utilizationRate,
          efficiency
        }
      });
    }
  }
  
  /**
   * Get asset utilization report
   */
  async getAssetUtilizationReport(assetId: string, startDate: Date, endDate: Date) {
    return prisma.assetUtilization.findMany({
      where: {
        assetId,
        period: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        period: 'asc'
      }
    });
  }
  
  // ==================== Task 25.7: Plant Shutdown Planning ====================
  
  /**
   * Create plant shutdown plan
   */
  async createPlantShutdown(data: {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    assetIds: string[];
  }) {
    const shutdownNumber = `SD-${Date.now()}`;
    
    // Get assets and their maintenance plans
    const assets = await prisma.asset.findMany({
      where: {
        id: { in: data.assetIds }
      },
      include: {
        maintenancePlans: {
          where: { isActive: true }
        }
      }
    });
    
    // Create shutdown asset entries
    const shutdownAssets = assets.map(asset => ({
      assetId: asset.id,
      assetName: asset.name,
      maintenanceTasks: asset.maintenancePlans.flatMap(plan => plan.tasks as string[]),
      estimatedDuration: asset.maintenancePlans.reduce((sum, plan) => sum + plan.estimatedDuration, 0),
      status: 'pending' as const
    }));
    
    // Estimate total cost
    const totalEstimatedCost = shutdownAssets.reduce((sum, sa) => sum + (sa.estimatedDuration * 50), 0); // $50/hour estimate
    
    return prisma.plantShutdown.create({
      data: {
        shutdownNumber,
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'planned',
        assets: shutdownAssets as any,
        totalEstimatedCost,
        completionPercentage: 0
      }
    });
  }
  
  /**
   * Update shutdown asset status
   */
  async updateShutdownAssetStatus(shutdownId: string, assetId: string, status: string, technicianId?: string) {
    const shutdown = await prisma.plantShutdown.findUnique({
      where: { id: shutdownId }
    });
    
    if (!shutdown) {
      throw new Error('Shutdown not found');
    }
    
    // Update asset status in shutdown
    const assets = shutdown.assets as any[];
    const assetIndex = assets.findIndex(a => a.assetId === assetId);
    
    if (assetIndex === -1) {
      throw new Error('Asset not found in shutdown plan');
    }
    
    assets[assetIndex].status = status;
    if (technicianId) {
      assets[assetIndex].assignedTechnician = technicianId;
    }
    
    // Calculate completion percentage
    const completedAssets = assets.filter(a => a.status === 'completed').length;
    const completionPercentage = (completedAssets / assets.length) * 100;
    
    // Update shutdown status if all assets completed
    const newStatus = completionPercentage === 100 ? 'completed' : shutdown.status;
    
    return prisma.plantShutdown.update({
      where: { id: shutdownId },
      data: {
        assets: assets as any,
        completionPercentage,
        status: newStatus as any,
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Get shutdown details
   */
  async getPlantShutdown(shutdownId: string) {
    return prisma.plantShutdown.findUnique({
      where: { id: shutdownId }
    });
  }
  
  /**
   * List plant shutdowns
   */
  async listPlantShutdowns(status?: string) {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    return prisma.plantShutdown.findMany({
      where,
      orderBy: {
        startDate: 'desc'
      }
    });
  }
}

export default new EAMService();
