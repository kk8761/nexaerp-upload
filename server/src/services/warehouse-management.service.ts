/**
 * Warehouse Management System (WMS) Service
 * Handles advanced warehouse operations including putaway strategies,
 * wave picking, pick lists, packing slips, and labor management
 */

import { PrismaClient } from '@prisma/client';
import {
  PutawayStrategyType,
  PutawayTaskStatus,
  WavePickStatus,
  PickingMethod,
  PickListStatus,
  PickListItemStatus,
  PackingSlipStatus,
  WarehouseWorkerRole,
  TaskType,
  TaskAssignmentStatus,
} from '../models/WarehouseManagement';

const prisma = new PrismaClient();

export class WarehouseManagementService {
  // ─── Putaway Strategy Management ──────────────────────────

  /**
   * Create a putaway strategy
   */
  async createPutawayStrategy(data: {
    name: string;
    strategyType: PutawayStrategyType;
    warehouseId?: string;
    priority?: number;
    rules?: Record<string, unknown>;
    description?: string;
  }) {
    return await prisma.putawayStrategy.create({
      data: {
        name: data.name,
        strategyType: data.strategyType,
        warehouseId: data.warehouseId,
        priority: data.priority || 0,
        rules: data.rules,
        description: data.description,
        isActive: true,
      },
    });
  }

  /**
   * Determine bin location based on putaway strategy
   */
  async determinePutawayLocation(
    strategyId: string,
    productId: string,
    warehouseId: string,
    quantity: number
  ): Promise<string | null> {
    const strategy = await prisma.putawayStrategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      throw new Error('Putaway strategy not found');
    }

    switch (strategy.strategyType) {
      case 'fixed':
        // Fixed location: Find the designated bin for this product
        const fixedBin = await prisma.binInventory.findFirst({
          where: {
            productId,
            binLocation: {
              warehouseId,
              isActive: true,
            },
          },
          include: {
            binLocation: true,
          },
        });
        return fixedBin?.binLocationId || null;

      case 'random':
        // Random location: Find any available bin with capacity
        const randomBin = await prisma.binLocation.findFirst({
          where: {
            warehouseId,
            isActive: true,
            capacity: {
              gt: prisma.binLocation.fields.currentLoad,
            },
          },
          orderBy: {
            currentLoad: 'asc', // Prefer bins with more space
          },
        });
        return randomBin?.id || null;

      case 'directed':
        // Directed putaway: Use rules to determine optimal location
        // Rules might consider: product velocity, size, weight, etc.
        const rules = strategy.rules as Record<string, unknown> | undefined;
        
        // Example: Fast-moving items go to easily accessible locations
        if (rules?.fastMoving) {
          const directedBin = await prisma.binLocation.findFirst({
            where: {
              warehouseId,
              isActive: true,
              aisle: '1', // Front aisles for fast-moving items
              capacity: {
                gt: prisma.binLocation.fields.currentLoad,
              },
            },
            orderBy: {
              currentLoad: 'asc',
            },
          });
          return directedBin?.id || null;
        }

        // Default to random if no specific rule applies
        const defaultBin = await prisma.binLocation.findFirst({
          where: {
            warehouseId,
            isActive: true,
          },
        });
        return defaultBin?.id || null;

      default:
        return null;
    }
  }

  /**
   * Create a putaway task
   */
  async createPutawayTask(data: {
    strategyId: string;
    warehouseId: string;
    productId: string;
    quantity: number;
    fromLocation?: string;
    priority?: number;
    notes?: string;
  }) {
    // Determine bin location based on strategy
    const toBinLocationId = await this.determinePutawayLocation(
      data.strategyId,
      data.productId,
      data.warehouseId,
      data.quantity
    );

    // Generate task number
    const taskCount = await prisma.putawayTask.count();
    const taskNumber = `PUT-${String(taskCount + 1).padStart(6, '0')}`;

    return await prisma.putawayTask.create({
      data: {
        taskNumber,
        strategyId: data.strategyId,
        warehouseId: data.warehouseId,
        productId: data.productId,
        quantity: data.quantity,
        fromLocation: data.fromLocation || 'RECEIVING',
        toBinLocationId,
        status: 'pending',
        priority: data.priority || 0,
        notes: data.notes,
      },
    });
  }

  /**
   * Assign putaway task to worker
   */
  async assignPutawayTask(taskId: string, workerId: string) {
    const task = await prisma.putawayTask.update({
      where: { id: taskId },
      data: {
        assignedTo: workerId,
        status: 'assigned',
      },
    });

    // Create task assignment record
    await prisma.warehouseTaskAssignment.create({
      data: {
        workerId,
        taskType: 'putaway',
        taskId,
        warehouseId: task.warehouseId,
        priority: task.priority,
        status: 'assigned',
        assignedAt: new Date(),
      },
    });

    return task;
  }

  /**
   * Complete putaway task
   */
  async completePutawayTask(taskId: string, workerId: string) {
    const task = await prisma.putawayTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Putaway task not found');
    }

    // Update bin inventory
    if (task.toBinLocationId) {
      await prisma.binInventory.upsert({
        where: {
          binLocationId_productId_batchNumber: {
            binLocationId: task.toBinLocationId,
            productId: task.productId,
            batchNumber: null,
          },
        },
        create: {
          binLocationId: task.toBinLocationId,
          productId: task.productId,
          quantity: task.quantity,
        },
        update: {
          quantity: {
            increment: task.quantity,
          },
        },
      });

      // Update bin location load
      await prisma.binLocation.update({
        where: { id: task.toBinLocationId },
        data: {
          currentLoad: {
            increment: task.quantity,
          },
        },
      });
    }

    // Update task status
    const updatedTask = await prisma.putawayTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Update task assignment
    await prisma.warehouseTaskAssignment.updateMany({
      where: {
        taskId,
        taskType: 'putaway',
        workerId,
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    return updatedTask;
  }

  // ─── Wave Picking Management ──────────────────────────────

  /**
   * Create a wave pick
   */
  async createWavePick(data: {
    warehouseId: string;
    pickingMethod: PickingMethod;
    priority?: number;
    scheduledDate?: Date;
    notes?: string;
  }) {
    const waveCount = await prisma.wavePick.count();
    const waveNumber = `WAVE-${String(waveCount + 1).padStart(6, '0')}`;

    return await prisma.wavePick.create({
      data: {
        waveNumber,
        warehouseId: data.warehouseId,
        status: 'created',
        pickingMethod: data.pickingMethod,
        priority: data.priority || 0,
        scheduledDate: data.scheduledDate,
        notes: data.notes,
      },
    });
  }

  /**
   * Release wave for picking
   */
  async releaseWavePick(waveId: string) {
    return await prisma.wavePick.update({
      where: { id: waveId },
      data: {
        status: 'released',
        releasedAt: new Date(),
      },
    });
  }

  /**
   * Complete wave pick
   */
  async completeWavePick(waveId: string) {
    // Check if all pick lists in the wave are completed
    const incompleteLists = await prisma.pickList.count({
      where: {
        wavePickId: waveId,
        status: {
          notIn: ['picked', 'packed', 'cancelled'],
        },
      },
    });

    if (incompleteLists > 0) {
      throw new Error('Cannot complete wave: some pick lists are not yet completed');
    }

    return await prisma.wavePick.update({
      where: { id: waveId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  // ─── Pick List Management ─────────────────────────────────

  /**
   * Create a pick list
   */
  async createPickList(data: {
    warehouseId: string;
    orderId?: string;
    wavePickId?: string;
    priority?: number;
    items: Array<{
      productId: string;
      quantityOrdered: number;
      binLocationId?: string;
      batchNumber?: string;
      pickSequence: number;
    }>;
  }) {
    const pickListCount = await prisma.pickList.count();
    const pickListNumber = `PICK-${String(pickListCount + 1).padStart(6, '0')}`;

    return await prisma.pickList.create({
      data: {
        pickListNumber,
        warehouseId: data.warehouseId,
        orderId: data.orderId,
        wavePickId: data.wavePickId,
        status: 'pending',
        priority: data.priority || 0,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityPicked: 0,
            binLocationId: item.binLocationId,
            batchNumber: item.batchNumber,
            pickSequence: item.pickSequence,
            status: 'pending',
            serialNumbers: [],
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  /**
   * Assign pick list to worker
   */
  async assignPickList(pickListId: string, workerId: string) {
    const pickList = await prisma.pickList.update({
      where: { id: pickListId },
      data: {
        assignedTo: workerId,
        status: 'assigned',
      },
    });

    // Create task assignment
    await prisma.warehouseTaskAssignment.create({
      data: {
        workerId,
        taskType: 'picking',
        taskId: pickListId,
        warehouseId: pickList.warehouseId,
        priority: pickList.priority,
        status: 'assigned',
        assignedAt: new Date(),
      },
    });

    return pickList;
  }

  /**
   * Start picking
   */
  async startPicking(pickListId: string) {
    return await prisma.pickList.update({
      where: { id: pickListId },
      data: {
        status: 'picking',
        pickingStarted: new Date(),
      },
    });
  }

  /**
   * Record picked item
   */
  async recordPickedItem(
    pickListItemId: string,
    quantityPicked: number,
    serialNumbers?: string[]
  ) {
    const item = await prisma.pickListItem.findUnique({
      where: { id: pickListItemId },
    });

    if (!item) {
      throw new Error('Pick list item not found');
    }

    const status: PickListItemStatus =
      quantityPicked >= item.quantityOrdered
        ? 'picked'
        : quantityPicked > 0
        ? 'short_picked'
        : 'pending';

    return await prisma.pickListItem.update({
      where: { id: pickListItemId },
      data: {
        quantityPicked,
        serialNumbers: serialNumbers || [],
        status,
      },
    });
  }

  /**
   * Complete pick list
   */
  async completePickList(pickListId: string) {
    // Check if all items are picked
    const unpickedItems = await prisma.pickListItem.count({
      where: {
        pickListId,
        status: 'pending',
      },
    });

    if (unpickedItems > 0) {
      throw new Error('Cannot complete pick list: some items are not yet picked');
    }

    return await prisma.pickList.update({
      where: { id: pickListId },
      data: {
        status: 'picked',
        pickingCompleted: new Date(),
      },
    });
  }

  // ─── Packing Slip Management ──────────────────────────────

  /**
   * Create packing slip from pick list
   */
  async createPackingSlip(data: {
    pickListId: string;
    orderId?: string;
    warehouseId: string;
  }) {
    const slipCount = await prisma.packingSlip.count();
    const slipNumber = `PACK-${String(slipCount + 1).padStart(6, '0')}`;

    return await prisma.packingSlip.create({
      data: {
        slipNumber,
        pickListId: data.pickListId,
        orderId: data.orderId,
        warehouseId: data.warehouseId,
        status: 'pending',
      },
    });
  }

  /**
   * Start packing
   */
  async startPacking(packingSlipId: string, workerId: string) {
    return await prisma.packingSlip.update({
      where: { id: packingSlipId },
      data: {
        status: 'packing',
        packedBy: workerId,
        packingStarted: new Date(),
      },
    });
  }

  /**
   * Complete packing
   */
  async completePacking(
    packingSlipId: string,
    data: {
      weight?: number;
      dimensions?: {
        length: number;
        width: number;
        height: number;
        unit: string;
      };
      shippingCarrier?: string;
      trackingNumber?: string;
    }
  ) {
    return await prisma.packingSlip.update({
      where: { id: packingSlipId },
      data: {
        status: 'packed',
        packingCompleted: new Date(),
        weight: data.weight,
        dimensions: data.dimensions,
        shippingCarrier: data.shippingCarrier,
        trackingNumber: data.trackingNumber,
      },
    });
  }

  /**
   * Mark as shipped
   */
  async markAsShipped(packingSlipId: string) {
    return await prisma.packingSlip.update({
      where: { id: packingSlipId },
      data: {
        status: 'shipped',
      },
    });
  }

  // ─── Warehouse Worker Management ──────────────────────────

  /**
   * Create warehouse worker
   */
  async createWarehouseWorker(data: {
    workerId: string;
    name: string;
    email?: string;
    warehouseId: string;
    role: WarehouseWorkerRole;
    shiftStart?: string;
    shiftEnd?: string;
  }) {
    return await prisma.warehouseWorker.create({
      data: {
        workerId: data.workerId,
        name: data.name,
        email: data.email,
        warehouseId: data.warehouseId,
        role: data.role,
        isActive: true,
        shiftStart: data.shiftStart,
        shiftEnd: data.shiftEnd,
      },
    });
  }

  /**
   * Get worker productivity
   */
  async getWorkerProductivity(workerId: string, startDate: Date, endDate: Date) {
    return await prisma.warehouseProductivityLog.findMany({
      where: {
        workerId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Log worker productivity
   */
  async logWorkerProductivity(data: {
    workerId: string;
    warehouseId: string;
    date: Date;
    taskType: TaskType;
    tasksCompleted: number;
    unitsProcessed: number;
    hoursWorked: number;
    notes?: string;
  }) {
    const efficiency = data.hoursWorked > 0 ? data.unitsProcessed / data.hoursWorked : 0;

    return await prisma.warehouseProductivityLog.upsert({
      where: {
        workerId_date_taskType: {
          workerId: data.workerId,
          date: data.date,
          taskType: data.taskType,
        },
      },
      create: {
        workerId: data.workerId,
        warehouseId: data.warehouseId,
        date: data.date,
        taskType: data.taskType,
        tasksCompleted: data.tasksCompleted,
        unitsProcessed: data.unitsProcessed,
        hoursWorked: data.hoursWorked,
        efficiency,
        notes: data.notes,
      },
      update: {
        tasksCompleted: data.tasksCompleted,
        unitsProcessed: data.unitsProcessed,
        hoursWorked: data.hoursWorked,
        efficiency,
        notes: data.notes,
      },
    });
  }

  /**
   * Generate labor utilization report
   */
  async generateLaborUtilizationReport(warehouseId: string, startDate: Date, endDate: Date) {
    const logs = await prisma.warehouseProductivityLog.findMany({
      where: {
        warehouseId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        worker: true,
      },
    });

    // Aggregate by worker
    const workerStats = logs.reduce((acc, log) => {
      const workerId = log.workerId;
      if (!acc[workerId]) {
        acc[workerId] = {
          workerId,
          workerName: log.worker.name,
          role: log.worker.role,
          totalTasksCompleted: 0,
          totalUnitsProcessed: 0,
          totalHoursWorked: 0,
          averageEfficiency: 0,
        };
      }

      acc[workerId].totalTasksCompleted += log.tasksCompleted;
      acc[workerId].totalUnitsProcessed += log.unitsProcessed;
      acc[workerId].totalHoursWorked += log.hoursWorked;

      return acc;
    }, {} as Record<string, unknown>);

    // Calculate average efficiency
    Object.values(workerStats).forEach((stats: unknown) => {
      const s = stats as {
        totalUnitsProcessed: number;
        totalHoursWorked: number;
        averageEfficiency: number;
      };
      s.averageEfficiency =
        s.totalHoursWorked > 0 ? s.totalUnitsProcessed / s.totalHoursWorked : 0;
    });

    return Object.values(workerStats);
  }

  /**
   * Get pending tasks for worker
   */
  async getPendingTasksForWorker(workerId: string) {
    return await prisma.warehouseTaskAssignment.findMany({
      where: {
        workerId,
        status: {
          in: ['assigned', 'in_progress'],
        },
      },
      orderBy: [
        { priority: 'desc' },
        { assignedAt: 'asc' },
      ],
    });
  }

  /**
   * Optimize cycle counting schedule
   */
  async optimizeCycleCountSchedule(warehouseId: string) {
    // Get products with high movement frequency
    const highMovementProducts = await prisma.$queryRaw<Array<{ productId: string; movementCount: number }>>`
      SELECT "productId", COUNT(*) as "movementCount"
      FROM "StockMovement"
      WHERE "warehouseId" = ${warehouseId}
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY "productId"
      ORDER BY "movementCount" DESC
      LIMIT 50
    `;

    // Get products that haven't been counted recently
    const uncountedProducts = await prisma.$queryRaw<Array<{ productId: string }>>`
      SELECT DISTINCT bi."productId"
      FROM "BinInventory" bi
      INNER JOIN "BinLocation" bl ON bi."binLocationId" = bl.id
      WHERE bl."warehouseId" = ${warehouseId}
        AND bi."productId" NOT IN (
          SELECT DISTINCT cci."productId"
          FROM "CycleCountItem" cci
          INNER JOIN "CycleCount" cc ON cci."cycleCountId" = cc.id
          WHERE cc."warehouseId" = ${warehouseId}
            AND cc."completedDate" >= NOW() - INTERVAL '90 days'
        )
      LIMIT 50
    `;

    return {
      highMovementProducts,
      uncountedProducts,
      recommendation: 'Prioritize high-movement and uncounted products for cycle counting',
    };
  }
}

export default new WarehouseManagementService();
