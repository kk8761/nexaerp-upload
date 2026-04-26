/**
 * Manufacturing Service
 * Handles BOM management, MRP, production orders, material consumption, and quality inspection
 */

import prisma from '../config/prisma';

export class ManufacturingService {
  
  // ==================== BOM Management (Task 19.1) ====================
  
  /**
   * Create a Bill of Materials
   */
  async createBOM(data: {
    name: string;
    productId: string;
    version?: string;
    bomType?: string;
    baseQuantity?: number;
    baseUnit?: string;
    components: Array<{
      componentProductId: string;
      quantity: number;
      unit: string;
      scrapFactor?: number;
      componentType?: string;
      mandatory?: boolean;
      sequence?: number;
      notes?: string;
    }>;
    operations?: Array<{
      operationNumber: number;
      operationName: string;
      workCenterId?: string;
      setupTime?: number;
      runTime?: number;
      laborCost?: number;
      overheadCost?: number;
      description?: string;
    }>;
    validFrom?: Date;
    validTo?: Date;
  }) {
    // Calculate total material cost
    let totalMaterialCost = 0;
    for (const comp of data.components) {
      const product = await prisma.product.findUnique({
        where: { id: comp.componentProductId },
        select: { cost: true }
      });
      if (product) {
        totalMaterialCost += product.cost * comp.quantity;
      }
    }
    
    // Calculate total labor cost
    const totalLaborCost = data.operations?.reduce((sum, op) => sum + (op.laborCost || 0), 0) || 0;
    
    const bom = await prisma.billOfMaterial.create({
      data: {
        name: data.name,
        productId: data.productId,
        version: data.version || '1.0',
        bomType: data.bomType || 'production',
        baseQuantity: data.baseQuantity || 1,
        baseUnit: data.baseUnit || 'pcs',
        totalMaterialCost,
        totalLaborCost,
        validFrom: data.validFrom,
        validTo: data.validTo,
        components: {
          create: data.components.map(comp => ({
            componentProductId: comp.componentProductId,
            quantity: comp.quantity,
            unit: comp.unit,
            scrapFactor: comp.scrapFactor || 0,
            componentType: comp.componentType || 'raw_material',
            mandatory: comp.mandatory !== false,
            sequence: comp.sequence || 0,
            notes: comp.notes
          }))
        },
        operations: data.operations ? {
          create: data.operations.map(op => ({
            operationNumber: op.operationNumber,
            operationName: op.operationName,
            workCenterId: op.workCenterId,
            setupTime: op.setupTime || 0,
            runTime: op.runTime || 0,
            laborCost: op.laborCost || 0,
            overheadCost: op.overheadCost || 0,
            description: op.description
          }))
        } : undefined
      },
      include: {
        components: {
          include: {
            componentProduct: true
          }
        },
        operations: {
          include: {
            workCenter: true
          }
        },
        product: true
      }
    });
    
    return bom;
  }
  
  /**
   * Explode BOM recursively to get all material requirements
   * Implements multi-level BOM explosion algorithm
   */
  async explodeBOM(bomId: string, quantity: number, level: number = 0): Promise<Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    level: number;
    componentType: string;
  }>> {
    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: {
        components: {
          include: {
            componentProduct: {
              include: {
                bom: true
              }
            }
          }
        }
      }
    });
    
    if (!bom) {
      throw new Error('BOM not found');
    }
    
    const requirements: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      level: number;
      componentType: string;
    }> = [];
    
    // Calculate quantity multiplier based on base quantity
    const multiplier = quantity / bom.baseQuantity;
    
    for (const component of bom.components) {
      const requiredQty = component.quantity * multiplier * (1 + component.scrapFactor / 100);
      
      requirements.push({
        productId: component.componentProductId,
        productName: component.componentProduct.name,
        quantity: requiredQty,
        unit: component.unit,
        level,
        componentType: component.componentType
      });
      
      // Recursively explode if component has its own BOM
      if (component.componentProduct.bom) {
        const subRequirements = await this.explodeBOM(
          component.componentProduct.bom.id,
          requiredQty,
          level + 1
        );
        requirements.push(...subRequirements);
      }
    }
    
    return requirements;
  }
  
  /**
   * Get BOM with all details
   */
  async getBOM(bomId: string) {
    return prisma.billOfMaterial.findUnique({
      where: { id: bomId },
      include: {
        product: true,
        components: {
          include: {
            componentProduct: true
          },
          orderBy: {
            sequence: 'asc'
          }
        },
        operations: {
          include: {
            workCenter: true
          },
          orderBy: {
            operationNumber: 'asc'
          }
        }
      }
    });
  }
  
  /**
   * Update BOM version
   */
  async updateBOMVersion(bomId: string, newVersion: string) {
    return prisma.billOfMaterial.update({
      where: { id: bomId },
      data: {
        version: newVersion,
        updatedAt: new Date()
      }
    });
  }
  
  // ==================== MRP (Task 19.2) ====================
  
  /**
   * Run Material Requirements Planning
   * Calculates net requirements and generates planned orders
   */
  async runMRP(data: {
    planningHorizon: number; // days
    createdBy?: string;
    notes?: string;
  }) {
    const runNumber = `MRP-${Date.now()}`;
    const startedAt = new Date();
    
    try {
      // Get all products with reorder points
      const products = await prisma.product.findMany({
        where: {
          reorderPoint: { not: null },
          isActive: true
        },
        include: {
          bom: {
            include: {
              components: true
            }
          }
        }
      });
      
      const plannedOrders: Array<{
        productId: string;
        productName: string;
        quantity: number;
        type: 'production' | 'purchase';
        dueDate: Date;
      }> = [];
      
      const purchaseRequisitions: Array<{
        productId: string;
        productName: string;
        quantity: number;
        reason: string;
      }> = [];
      
      for (const product of products) {
        // Calculate net requirements
        const onHand = product.stock;
        const reorderPoint = product.reorderPoint || 0;
        const reorderQty = product.reorderQty || product.minStock;
        
        // Get allocated quantity (reserved in orders)
        const allocated = 0; // TODO: Calculate from pending orders
        
        // Get scheduled receipts (incoming POs and production orders)
        const scheduled = 0; // TODO: Calculate from pending receipts
        
        // Net requirement = Demand - On Hand - Scheduled + Allocated
        const netRequirement = reorderPoint - onHand - scheduled + allocated;
        
        if (netRequirement > 0) {
          const orderQty = Math.max(netRequirement, reorderQty);
          
          // If product has BOM, create production order
          if (product.bom) {
            plannedOrders.push({
              productId: product.id,
              productName: product.name,
              quantity: orderQty,
              type: 'production',
              dueDate: new Date(Date.now() + data.planningHorizon * 24 * 60 * 60 * 1000)
            });
            
            // Explode BOM to get component requirements
            const requirements = await this.explodeBOM(product.bom.id, orderQty);
            
            // Generate purchase requisitions for components
            for (const req of requirements) {
              const componentProduct = await prisma.product.findUnique({
                where: { id: req.productId }
              });
              
              if (componentProduct) {
                const componentOnHand = componentProduct.stock;
                const componentNetReq = req.quantity - componentOnHand;
                
                if (componentNetReq > 0) {
                  purchaseRequisitions.push({
                    productId: req.productId,
                    productName: req.productName,
                    quantity: componentNetReq,
                    reason: `Required for production of ${product.name}`
                  });
                }
              }
            }
          } else {
            // No BOM, create purchase requisition
            purchaseRequisitions.push({
              productId: product.id,
              productName: product.name,
              quantity: orderQty,
              reason: 'Below reorder point'
            });
          }
        }
      }
      
      // Create MRP run record
      const mrpRun = await prisma.mRPRun.create({
        data: {
          runNumber,
          planningHorizon: data.planningHorizon,
          status: 'completed',
          plannedOrders: plannedOrders as any,
          purchaseRequisitions: purchaseRequisitions as any,
          startedAt,
          completedAt: new Date(),
          createdBy: data.createdBy,
          notes: data.notes
        }
      });
      
      // Create actual purchase requisitions
      for (const pr of purchaseRequisitions) {
        await prisma.purchaseRequisition.create({
          data: {
            requisitionNo: `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productId: pr.productId,
            quantity: pr.quantity,
            requestedBy: data.createdBy || 'MRP System',
            reason: pr.reason,
            status: 'pending'
          }
        });
      }
      
      return mrpRun;
    } catch (error) {
      // Log error and create failed MRP run
      await prisma.mRPRun.create({
        data: {
          runNumber,
          planningHorizon: data.planningHorizon,
          status: 'failed',
          startedAt,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          createdBy: data.createdBy,
          notes: data.notes
        }
      });
      
      throw error;
    }
  }
  
  /**
   * Get MRP run details
   */
  async getMRPRun(runId: string) {
    return prisma.mRPRun.findUnique({
      where: { id: runId }
    });
  }
  
  // ==================== Production Order Management (Task 19.3) ====================
  
  /**
   * Create production order
   */
  async createProductionOrder(data: {
    bomId: string;
    productId: string;
    quantity: number;
    startDate: Date;
    scheduledEndDate?: Date;
    priority?: string;
    workCenterId?: string;
    notes?: string;
  }) {
    const orderNumber = `PO-${Date.now()}`;
    
    // Get BOM to create operations
    const bom = await prisma.billOfMaterial.findUnique({
      where: { id: data.bomId },
      include: {
        operations: true
      }
    });
    
    if (!bom) {
      throw new Error('BOM not found');
    }
    
    const productionOrder = await prisma.productionOrder.create({
      data: {
        orderNumber,
        bomId: data.bomId,
        productId: data.productId,
        quantity: data.quantity,
        startDate: data.startDate,
        scheduledEndDate: data.scheduledEndDate,
        priority: data.priority || 'medium',
        workCenterId: data.workCenterId,
        notes: data.notes,
        operations: {
          create: bom.operations.map(op => ({
            operationNumber: op.operationNumber,
            operationName: op.operationName,
            workCenterId: op.workCenterId || undefined,
            status: 'pending'
          }))
        }
      },
      include: {
        bom: {
          include: {
            components: {
              include: {
                componentProduct: true
              }
            }
          }
        },
        operations: true,
        workCenter: true
      }
    });
    
    return productionOrder;
  }
  
  /**
   * Release production order (change status from planned to released)
   */
  async releaseProductionOrder(orderId: string) {
    return prisma.productionOrder.update({
      where: { id: orderId },
      data: {
        status: 'released',
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Start production order
   */
  async startProductionOrder(orderId: string) {
    return prisma.productionOrder.update({
      where: { id: orderId },
      data: {
        status: 'in_progress',
        updatedAt: new Date()
      }
    });
  }
  
  /**
   * Complete production order
   */
  async completeProductionOrder(orderId: string, actualOutput: number, scrapQuantity: number = 0) {
    const order = await prisma.productionOrder.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        actualOutput,
        scrapQuantity,
        endDate: new Date(),
        updatedAt: new Date()
      },
      include: {
        bom: true
      }
    });
    
    // Update product stock
    await prisma.product.update({
      where: { id: order.productId },
      data: {
        stock: {
          increment: actualOutput
        }
      }
    });
    
    return order;
  }
  
  /**
   * Update production order operation status
   */
  async updateOperationStatus(operationId: string, status: string, operatorId?: string) {
    const updateData: any = {
      status
    };
    
    if (status === 'in_progress') {
      updateData.startTime = new Date();
      if (operatorId) {
        updateData.operatorId = operatorId;
      }
    } else if (status === 'completed') {
      updateData.endTime = new Date();
      
      // Calculate actual duration
      const operation = await prisma.productionOrderOperation.findUnique({
        where: { id: operationId }
      });
      
      if (operation?.startTime) {
        const duration = (new Date().getTime() - operation.startTime.getTime()) / (1000 * 60);
        updateData.actualDuration = duration;
      }
    }
    
    return prisma.productionOrderOperation.update({
      where: { id: operationId },
      data: updateData
    });
  }
  
  /**
   * Get production order with all details
   */
  async getProductionOrder(orderId: string) {
    return prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        bom: {
          include: {
            components: {
              include: {
                componentProduct: true
              }
            },
            operations: true
          }
        },
        operations: true,
        workCenter: true,
        materialConsumption: true,
        qualityInspections: true
      }
    });
  }
  
  /**
   * List production orders with filters
   */
  async listProductionOrders(filters: {
    status?: string;
    productId?: string;
    startDate?: Date;
    endDate?: Date;
    priority?: string;
  }) {
    const where: any = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) {
        where.startDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.startDate.lte = filters.endDate;
      }
    }
    
    return prisma.productionOrder.findMany({
      where,
      include: {
        bom: true,
        workCenter: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });
  }
  
  // ==================== Material Consumption (Task 19.4) ====================
  
  /**
   * Get default warehouse ID
   */
  private async getDefaultWarehouseId(): Promise<string | null> {
    try {
      const warehouse = await prisma.warehouse.findFirst({
        where: {
          code: 'DEFAULT'
        }
      });
      
      // If no default warehouse, get the first available warehouse
      if (!warehouse) {
        const firstWarehouse = await prisma.warehouse.findFirst({
          orderBy: {
            createdAt: 'asc'
          }
        });
        return firstWarehouse?.id || null;
      }
      
      return warehouse.id;
    } catch (error) {
      console.warn('Could not get default warehouse:', error);
      return null;
    }
  }
  
  /**
   * Record material consumption
   */
  async recordMaterialConsumption(data: {
    productionOrderId: string;
    productId: string;
    quantity: number;
    unit: string;
    batchNumber?: string;
    serialNumbers?: string[];
    consumptionType?: 'manual' | 'backflush';
    consumedBy?: string;
    notes?: string;
  }) {
    // Create consumption record
    const consumption = await prisma.materialConsumption.create({
      data: {
        productionOrderId: data.productionOrderId,
        productId: data.productId,
        quantity: data.quantity,
        unit: data.unit,
        batchNumber: data.batchNumber,
        serialNumbers: data.serialNumbers || [],
        consumptionType: data.consumptionType || 'manual',
        consumedBy: data.consumedBy,
        notes: data.notes
      }
    });
    
    // Update product stock
    await prisma.product.update({
      where: { id: data.productId },
      data: {
        stock: {
          decrement: data.quantity
        }
      }
    });
    
    // Create stock movement record (only if warehouse exists)
    const warehouseId = await this.getDefaultWarehouseId();
    if (warehouseId) {
      try {
        // Get or create a system user for stock movements
        let systemUser = await prisma.user.findFirst({
          where: { email: 'system@nexaerp.com' }
        });
        
        if (!systemUser) {
          systemUser = await prisma.user.create({
            data: {
              email: 'system@nexaerp.com',
              name: 'System User',
              password: 'N/A',
              role: 'admin'
            }
          });
        }
        
        await prisma.stockMovement.create({
          data: {
            type: 'production_consumption',
            productId: data.productId,
            warehouseId: warehouseId,
            quantity: -data.quantity,
            referenceId: data.productionOrderId,
            userId: systemUser.id,
            batchNumber: data.batchNumber,
            notes: `Consumed for production order`
          }
        });
      } catch (error) {
        console.warn('Could not create stock movement:', error);
      }
    }
    
    return consumption;
  }
  
  /**
   * Backflush materials for production order
   * Automatically consumes materials based on BOM when output is recorded
   */
  async backflushMaterials(productionOrderId: string, outputQuantity: number, consumedBy?: string) {
    const order = await prisma.productionOrder.findUnique({
      where: { id: productionOrderId },
      include: {
        bom: {
          include: {
            components: {
              include: {
                componentProduct: true
              }
            }
          }
        }
      }
    });
    
    if (!order) {
      throw new Error('Production order not found');
    }
    
    const consumptions = [];
    
    // Calculate and consume materials based on BOM
    for (const component of order.bom.components) {
      const requiredQty = (component.quantity / order.bom.baseQuantity) * outputQuantity;
      const actualQty = requiredQty * (1 + component.scrapFactor / 100);
      
      const consumption = await this.recordMaterialConsumption({
        productionOrderId,
        productId: component.componentProductId,
        quantity: actualQty,
        unit: component.unit,
        consumptionType: 'backflush',
        consumedBy,
        notes: `Backflushed for ${outputQuantity} ${order.bom.baseUnit} output`
      });
      
      consumptions.push(consumption);
    }
    
    return consumptions;
  }
  
  /**
   * Record finished goods receipt
   */
  async recordFinishedGoodsReceipt(productionOrderId: string, quantity: number, _receivedBy?: string) {
    const order = await prisma.productionOrder.findUnique({
      where: { id: productionOrderId }
    });
    
    if (!order) {
      throw new Error('Production order not found');
    }
    
    // Update production order output
    await prisma.productionOrder.update({
      where: { id: productionOrderId },
      data: {
        actualOutput: {
          increment: quantity
        }
      }
    });
    
    // Update product stock
    await prisma.product.update({
      where: { id: order.productId },
      data: {
        stock: {
          increment: quantity
        }
      }
    });
    
    // Create stock movement record (only if warehouse exists)
    const warehouseId = await this.getDefaultWarehouseId();
    if (warehouseId) {
      try {
        // Get or create a system user for stock movements
        let systemUser = await prisma.user.findFirst({
          where: { email: 'system@nexaerp.com' }
        });
        
        if (!systemUser) {
          systemUser = await prisma.user.create({
            data: {
              email: 'system@nexaerp.com',
              name: 'System User',
              password: 'N/A',
              role: 'admin'
            }
          });
        }
        
        await prisma.stockMovement.create({
          data: {
            type: 'production_receipt',
            productId: order.productId,
            warehouseId: warehouseId,
            quantity: quantity,
            referenceId: productionOrderId,
            userId: systemUser.id,
            notes: `Finished goods receipt from production`
          }
        });
      } catch (error) {
        console.warn('Could not create stock movement:', error);
      }
    }
    
    return { success: true, quantity };
  }
  
  // ==================== Quality Inspection (Task 19.5) ====================
  
  /**
   * Create quality inspection
   */
  async createQualityInspection(data: {
    productionOrderId?: string;
    productId: string;
    quantity: number;
    batchNumber?: string;
    inspectionType: string;
    inspectorId?: string;
    checkpoints?: any[];
    notes?: string;
  }) {
    const inspectionNumber = `QI-${Date.now()}`;
    
    return prisma.qualityInspection.create({
      data: {
        inspectionNumber,
        productionOrderId: data.productionOrderId,
        productId: data.productId,
        quantity: data.quantity,
        batchNumber: data.batchNumber,
        inspectionType: data.inspectionType,
        inspectorId: data.inspectorId,
        checkpoints: data.checkpoints as any,
        notes: data.notes
      }
    });
  }
  
  /**
   * Record inspection results
   */
  async recordInspectionResults(inspectionId: string, data: {
    status: string;
    result: string;
    checkpoints?: any[];
    defectsFound?: number;
    quarantined?: boolean;
    quarantineLocation?: string;
    notes?: string;
  }) {
    const inspection = await prisma.qualityInspection.update({
      where: { id: inspectionId },
      data: {
        status: data.status,
        result: data.result,
        checkpoints: data.checkpoints as any,
        defectsFound: data.defectsFound || 0,
        quarantined: data.quarantined || false,
        quarantineLocation: data.quarantineLocation,
        notes: data.notes,
        updatedAt: new Date()
      }
    });
    
    // If quarantined, update inventory status
    if (data.quarantined && inspection.batchNumber) {
      await prisma.inventoryBatch.updateMany({
        where: {
          productId: inspection.productId,
          batchNumber: inspection.batchNumber
        },
        data: {
          status: 'quarantined'
        }
      });
    }
    
    return inspection;
  }
  
  /**
   * Get quality inspection details
   */
  async getQualityInspection(inspectionId: string) {
    return prisma.qualityInspection.findUnique({
      where: { id: inspectionId },
      include: {
        productionOrder: true
      }
    });
  }
  
  /**
   * List quality inspections with filters
   */
  async listQualityInspections(filters: {
    productId?: string;
    productionOrderId?: string;
    status?: string;
    inspectionType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.productionOrderId) {
      where.productionOrderId = filters.productionOrderId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.inspectionType) {
      where.inspectionType = filters.inspectionType;
    }
    if (filters.startDate || filters.endDate) {
      where.inspectionDate = {};
      if (filters.startDate) {
        where.inspectionDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.inspectionDate.lte = filters.endDate;
      }
    }
    
    return prisma.qualityInspection.findMany({
      where,
      include: {
        productionOrder: true
      },
      orderBy: {
        inspectionDate: 'desc'
      }
    });
  }
  
  // ==================== Work Center Management ====================
  
  /**
   * Create work center
   */
  async createWorkCenter(data: {
    code: string;
    name: string;
    description?: string;
    capacity?: number;
    costPerHour?: number;
  }) {
    return prisma.workCenter.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        capacity: data.capacity || 1,
        costPerHour: data.costPerHour || 0
      }
    });
  }
  
  /**
   * Get work center details
   */
  async getWorkCenter(workCenterId: string) {
    return prisma.workCenter.findUnique({
      where: { id: workCenterId },
      include: {
        operations: true,
        productionOrders: {
          where: {
            status: {
              in: ['released', 'in_progress']
            }
          }
        }
      }
    });
  }
  
  /**
   * List all work centers
   */
  async listWorkCenters(isActive?: boolean) {
    return prisma.workCenter.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: {
        code: 'asc'
      }
    });
  }
}

export default new ManufacturingService();
