/**
 * Advanced Inventory Management Service
 * Handles batch/serial tracking, cycle counting, multi-warehouse, and valuation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InventoryService {
  /**
   * Task 11.1: Assign batch number to inventory on receipt
   */
  async assignBatchNumber(data: {
    productId: string;
    warehouseId: string;
    batchNumber: string;
    quantity: number;
    manufacturingDate?: Date;
    expiryDate?: Date;
    costPerUnit: number;
  }) {
    // Check if product uses batch tracking
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { trackingType: true, name: true }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.trackingType !== 'batch') {
      throw new Error(`Product ${product.name} is not configured for batch tracking`);
    }

    // Create or update batch
    const batch = await prisma.inventoryBatch.upsert({
      where: {
        productId_batchNumber_warehouseId: {
          productId: data.productId,
          batchNumber: data.batchNumber,
          warehouseId: data.warehouseId
        }
      },
      create: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        batchNumber: data.batchNumber,
        quantity: data.quantity,
        manufacturingDate: data.manufacturingDate,
        expiryDate: data.expiryDate,
        costPerUnit: data.costPerUnit,
        status: 'active'
      },
      update: {
        quantity: { increment: data.quantity }
      }
    });

    return batch;
  }

  /**
   * Task 11.1: Assign serial numbers to inventory on receipt
   */
  async assignSerialNumbers(data: {
    productId: string;
    warehouseId: string;
    serialNumbers: string[];
    purchaseDate?: Date;
  }) {
    // Check if product uses serial tracking
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { trackingType: true, name: true }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.trackingType !== 'serial') {
      throw new Error(`Product ${product.name} is not configured for serial number tracking`);
    }

    // Check for duplicate serial numbers
    const existing = await prisma.serialNumber.findMany({
      where: {
        serialNumber: { in: data.serialNumbers }
      }
    });

    if (existing.length > 0) {
      throw new Error(`Serial numbers already exist: ${existing.map(s => s.serialNumber).join(', ')}`);
    }

    // Create serial numbers
    const serialNumbers = await prisma.serialNumber.createMany({
      data: data.serialNumbers.map(sn => ({
        serialNumber: sn,
        productId: data.productId,
        warehouseId: data.warehouseId,
        status: 'available',
        purchaseDate: data.purchaseDate || new Date()
      }))
    });

    return serialNumbers;
  }

  /**
   * Task 11.1: Select batch for issue (FEFO - First Expired First Out)
   */
  async selectBatchForIssue(productId: string, warehouseId: string, quantity: number) {
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        productId,
        warehouseId,
        status: 'active',
        quantity: { gt: 0 }
      },
      orderBy: [
        { expiryDate: 'asc' }, // FEFO logic
        { createdAt: 'asc' }   // Then FIFO
      ]
    });

    const selectedBatches: Array<{ batchNumber: string; quantity: number }> = [];
    let remainingQty = quantity;

    for (const batch of batches) {
      if (remainingQty <= 0) break;

      const qtyToTake = Math.min(batch.quantity, remainingQty);
      selectedBatches.push({
        batchNumber: batch.batchNumber,
        quantity: qtyToTake
      });
      remainingQty -= qtyToTake;
    }

    if (remainingQty > 0) {
      throw new Error(`Insufficient batch inventory. Required: ${quantity}, Available: ${quantity - remainingQty}`);
    }

    return selectedBatches;
  }

  /**
   * Task 11.1: Select serial numbers for issue
   */
  async selectSerialNumbersForIssue(productId: string, warehouseId: string, quantity: number) {
    const serialNumbers = await prisma.serialNumber.findMany({
      where: {
        productId,
        warehouseId,
        status: 'available'
      },
      take: quantity,
      orderBy: { createdAt: 'asc' }
    });

    if (serialNumbers.length < quantity) {
      throw new Error(`Insufficient serial numbers. Required: ${quantity}, Available: ${serialNumbers.length}`);
    }

    return serialNumbers.map(sn => sn.serialNumber);
  }

  /**
   * Task 11.2: Get products with expiring batches
   */
  async getExpiringBatches(daysBeforeExpiry: number = 30) {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + daysBeforeExpiry);

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        expiryDate: {
          lte: expiryThreshold,
          gte: new Date()
        },
        status: 'active',
        quantity: { gt: 0 }
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true }
        },
        warehouse: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });

    return batches;
  }

  /**
   * Task 11.2: Mark expired batches
   */
  async markExpiredBatches() {
    const result = await prisma.inventoryBatch.updateMany({
      where: {
        expiryDate: { lt: new Date() },
        status: 'active'
      },
      data: {
        status: 'expired'
      }
    });

    return result;
  }

  /**
   * Task 11.3: Create cycle count
   */
  async createCycleCount(data: {
    warehouseId: string;
    scheduledDate: Date;
    productIds?: string[];
  }) {
    const countNumber = `CC-${Date.now()}`;

    // Get products to count
    const products = await prisma.product.findMany({
      where: data.productIds ? { id: { in: data.productIds } } : {},
      select: { id: true }
    });

    // Get current inventory for these products
    const inventory = await prisma.inventoryBatch.findMany({
      where: {
        warehouseId: data.warehouseId,
        productId: { in: products.map(p => p.id) },
        status: 'active'
      }
    });

    // Create cycle count with items
    const cycleCount = await prisma.cycleCount.create({
      data: {
        countNumber,
        warehouseId: data.warehouseId,
        scheduledDate: data.scheduledDate,
        status: 'scheduled',
        items: {
          create: inventory.map(inv => ({
            productId: inv.productId,
            batchNumber: inv.batchNumber,
            expectedQty: inv.quantity,
            countedQty: null,
            variance: null
          }))
        }
      },
      include: {
        items: true,
        warehouse: true
      }
    });

    return cycleCount;
  }

  /**
   * Task 11.3: Record cycle count results
   */
  async recordCycleCountResults(cycleCountId: string, counts: Array<{
    itemId: string;
    countedQty: number;
    reason?: string;
  }>) {
    const cycleCount = await prisma.cycleCount.findUnique({
      where: { id: cycleCountId },
      include: { items: true }
    });

    if (!cycleCount) {
      throw new Error('Cycle count not found');
    }

    // Update each item with counted quantity and variance
    for (const count of counts) {
      const item = cycleCount.items.find(i => i.id === count.itemId);
      if (!item) continue;

      const variance = count.countedQty - item.expectedQty;
      const variancePercent = item.expectedQty > 0 
        ? (variance / item.expectedQty) * 100 
        : 0;

      await prisma.cycleCountItem.update({
        where: { id: count.itemId },
        data: {
          countedQty: count.countedQty,
          variance,
          variancePercent,
          reason: count.reason
        }
      });
    }

    // Update cycle count status
    await prisma.cycleCount.update({
      where: { id: cycleCountId },
      data: {
        status: 'completed',
        completedDate: new Date()
      }
    });

    return this.getCycleCount(cycleCountId);
  }

  /**
   * Task 11.3: Get cycle count with variance analysis
   */
  async getCycleCount(cycleCountId: string) {
    return prisma.cycleCount.findUnique({
      where: { id: cycleCountId },
      include: {
        items: true,
        warehouse: true
      }
    });
  }

  /**
   * Task 11.3: Generate adjustment entries for cycle count variances
   */
  async generateCycleCountAdjustments(cycleCountId: string, userId: string) {
    const cycleCount = await prisma.cycleCount.findUnique({
      where: { id: cycleCountId },
      include: { items: true }
    });

    if (!cycleCount) {
      throw new Error('Cycle count not found');
    }

    const adjustments = [];

    for (const item of cycleCount.items) {
      if (item.variance === null || item.variance === 0 || item.adjusted) {
        continue;
      }

      // Create stock movement for adjustment
      const movement = await prisma.stockMovement.create({
        data: {
          type: 'adjustment',
          productId: item.productId,
          warehouseId: cycleCount.warehouseId,
          quantity: item.variance,
          batchNumber: item.batchNumber || undefined,
          referenceId: cycleCount.countNumber,
          notes: `Cycle count adjustment: ${item.reason || 'Variance detected'}`,
          userId
        }
      });

      // Update batch quantity if batch tracked
      if (item.batchNumber) {
        await prisma.inventoryBatch.updateMany({
          where: {
            productId: item.productId,
            batchNumber: item.batchNumber,
            warehouseId: cycleCount.warehouseId
          },
          data: {
            quantity: { increment: item.variance }
          }
        });
      }

      // Mark item as adjusted
      await prisma.cycleCountItem.update({
        where: { id: item.id },
        data: { adjusted: true }
      });

      adjustments.push(movement);
    }

    return adjustments;
  }

  /**
   * Task 11.4: Create bin location
   */
  async createBinLocation(data: {
    warehouseId: string;
    code: string;
    aisle?: string;
    rack?: string;
    shelf?: string;
    capacity?: number;
  }) {
    return prisma.binLocation.create({
      data: {
        warehouseId: data.warehouseId,
        code: data.code,
        aisle: data.aisle,
        rack: data.rack,
        shelf: data.shelf,
        capacity: data.capacity,
        currentLoad: 0,
        isActive: true
      }
    });
  }

  /**
   * Task 11.4: Assign inventory to bin location
   */
  async assignToBinLocation(data: {
    binLocationId: string;
    productId: string;
    quantity: number;
    batchNumber?: string;
  }) {
    return prisma.binInventory.upsert({
      where: {
        binLocationId_productId_batchNumber: {
          binLocationId: data.binLocationId,
          productId: data.productId,
          batchNumber: data.batchNumber || ''
        }
      },
      create: {
        binLocationId: data.binLocationId,
        productId: data.productId,
        quantity: data.quantity,
        batchNumber: data.batchNumber
      },
      update: {
        quantity: { increment: data.quantity }
      }
    });
  }

  /**
   * Task 11.4: Create warehouse transfer
   */
  async createWarehouseTransfer(data: {
    fromWarehouseId: string;
    toWarehouseId: string;
    requestedBy: string;
    items: Array<{
      productId: string;
      quantity: number;
      batchNumber?: string;
      serialNumbers?: string[];
    }>;
    notes?: string;
  }) {
    const transferNumber = `WT-${Date.now()}`;

    const transfer = await prisma.warehouseTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        requestedBy: data.requestedBy,
        status: 'pending',
        notes: data.notes,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            batchNumber: item.batchNumber,
            serialNumbers: item.serialNumbers || []
          }))
        }
      },
      include: {
        items: true
      }
    });

    return transfer;
  }

  /**
   * Task 11.4: Complete warehouse transfer
   */
  async completeWarehouseTransfer(transferId: string, userId: string) {
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id: transferId },
      include: { items: true }
    });

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    // Create stock movements for each item
    for (const item of transfer.items) {
      // Deduct from source warehouse
      await prisma.stockMovement.create({
        data: {
          type: 'transfer',
          productId: item.productId,
          warehouseId: transfer.fromWarehouseId,
          quantity: -item.quantity,
          batchNumber: item.batchNumber || undefined,
          referenceId: transfer.transferNumber,
          notes: `Transfer to warehouse`,
          userId
        }
      });

      // Add to destination warehouse
      await prisma.stockMovement.create({
        data: {
          type: 'transfer',
          productId: item.productId,
          warehouseId: transfer.toWarehouseId,
          quantity: item.quantity,
          batchNumber: item.batchNumber || undefined,
          referenceId: transfer.transferNumber,
          notes: `Transfer from warehouse`,
          userId
        }
      });

      // Update batch quantities if batch tracked
      if (item.batchNumber) {
        // Deduct from source
        await prisma.inventoryBatch.updateMany({
          where: {
            productId: item.productId,
            batchNumber: item.batchNumber,
            warehouseId: transfer.fromWarehouseId
          },
          data: {
            quantity: { decrement: item.quantity }
          }
        });

        // Add to destination (create if doesn't exist)
        const destBatch = await prisma.inventoryBatch.findFirst({
          where: {
            productId: item.productId,
            batchNumber: item.batchNumber,
            warehouseId: transfer.toWarehouseId
          }
        });

        if (destBatch) {
          await prisma.inventoryBatch.update({
            where: { id: destBatch.id },
            data: { quantity: { increment: item.quantity } }
          });
        } else {
          // Get source batch details
          const sourceBatch = await prisma.inventoryBatch.findFirst({
            where: {
              productId: item.productId,
              batchNumber: item.batchNumber,
              warehouseId: transfer.fromWarehouseId
            }
          });

          if (sourceBatch) {
            await prisma.inventoryBatch.create({
              data: {
                productId: item.productId,
                batchNumber: item.batchNumber,
                warehouseId: transfer.toWarehouseId,
                quantity: item.quantity,
                manufacturingDate: sourceBatch.manufacturingDate,
                expiryDate: sourceBatch.expiryDate,
                costPerUnit: sourceBatch.costPerUnit,
                status: 'active'
              }
            });
          }
        }
      }

      // Update serial numbers if serial tracked
      if (item.serialNumbers.length > 0) {
        await prisma.serialNumber.updateMany({
          where: {
            serialNumber: { in: item.serialNumbers }
          },
          data: {
            warehouseId: transfer.toWarehouseId
          }
        });
      }
    }

    // Update transfer status
    await prisma.warehouseTransfer.update({
      where: { id: transferId },
      data: {
        status: 'completed',
        receivedDate: new Date()
      }
    });

    return this.getWarehouseTransfer(transferId);
  }

  /**
   * Task 11.4: Get warehouse transfer
   */
  async getWarehouseTransfer(transferId: string) {
    return prisma.warehouseTransfer.findUnique({
      where: { id: transferId },
      include: {
        items: true
      }
    });
  }

  /**
   * Task 11.5: Check reorder points and generate purchase requisitions
   */
  async checkReorderPoints() {
    const products = await prisma.product.findMany({
      where: {
        reorderPoint: { not: null },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        reorderPoint: true,
        reorderQty: true
      }
    });

    const requisitions = [];

    for (const product of products) {
      if (product.reorderPoint && product.stock <= product.reorderPoint) {
        // Check if there's already a pending requisition
        const existing = await prisma.purchaseRequisition.findFirst({
          where: {
            productId: product.id,
            status: { in: ['pending', 'approved'] }
          }
        });

        if (!existing) {
          const requisition = await prisma.purchaseRequisition.create({
            data: {
              requisitionNo: `PR-${Date.now()}-${product.id.substring(0, 8)}`,
              productId: product.id,
              quantity: product.reorderQty || product.reorderPoint,
              requestedBy: 'system',
              reason: `Stock level (${product.stock}) below reorder point (${product.reorderPoint})`,
              status: 'pending'
            }
          });

          requisitions.push(requisition);
        }
      }
    }

    return requisitions;
  }

  /**
   * Task 11.6: Calculate inventory valuation using specified method
   */
  async calculateInventoryValuation(
    warehouseId: string,
    method: 'FIFO' | 'LIFO' | 'weighted_average' | 'standard_cost'
  ) {
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        warehouseId,
        status: 'active',
        quantity: { gt: 0 }
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, cost: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const valuations: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
      totalValue: number;
    }> = [];

    // Group by product
    const productGroups = new Map<string, typeof batches>();
    for (const batch of batches) {
      if (!productGroups.has(batch.productId)) {
        productGroups.set(batch.productId, []);
      }
      productGroups.get(batch.productId)!.push(batch);
    }

    for (const [productId, productBatches] of productGroups) {
      const product = productBatches[0].product;
      const totalQty = productBatches.reduce((sum, b) => sum + b.quantity, 0);
      let unitCost = 0;

      switch (method) {
        case 'FIFO':
          // Use cost of oldest batch
          unitCost = productBatches[0].costPerUnit;
          break;

        case 'LIFO':
          // Use cost of newest batch
          unitCost = productBatches[productBatches.length - 1].costPerUnit;
          break;

        case 'weighted_average':
          // Calculate weighted average cost
          const totalValue = productBatches.reduce((sum, b) => sum + (b.quantity * b.costPerUnit), 0);
          unitCost = totalQty > 0 ? totalValue / totalQty : 0;
          break;

        case 'standard_cost':
          // Use standard cost from product master
          unitCost = product.cost;
          break;
      }

      valuations.push({
        productId,
        productName: product.name,
        quantity: totalQty,
        unitCost,
        totalValue: totalQty * unitCost
      });

      // Save valuation record
      await prisma.inventoryValuation.create({
        data: {
          productId,
          warehouseId,
          valuationDate: new Date(),
          method,
          quantity: totalQty,
          unitCost,
          totalValue: totalQty * unitCost
        }
      });
    }

    return {
      method,
      warehouseId,
      valuationDate: new Date(),
      items: valuations,
      totalValue: valuations.reduce((sum, v) => sum + v.totalValue, 0)
    };
  }
}

export default new InventoryService();
