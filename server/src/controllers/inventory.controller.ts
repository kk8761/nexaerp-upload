/**
 * Advanced Inventory Management Controller
 */

import { Request, Response } from 'express';
import inventoryService from '../services/inventory.service';

export class InventoryController {
  /**
   * POST /api/inventory/batch/assign
   * Assign batch number to inventory
   */
  async assignBatch(req: Request, res: Response) {
    try {
      const { productId, warehouseId, batchNumber, quantity, manufacturingDate, expiryDate, costPerUnit } = req.body;

      const batch = await inventoryService.assignBatchNumber({
        productId,
        warehouseId,
        batchNumber,
        quantity: parseFloat(quantity),
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        costPerUnit: parseFloat(costPerUnit)
      });

      res.status(201).json({
        success: true,
        message: 'Batch assigned successfully',
        data: batch
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/serial/assign
   * Assign serial numbers to inventory
   */
  async assignSerialNumbers(req: Request, res: Response) {
    try {
      const { productId, warehouseId, serialNumbers, purchaseDate } = req.body;

      const result = await inventoryService.assignSerialNumbers({
        productId,
        warehouseId,
        serialNumbers,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined
      });

      res.status(201).json({
        success: true,
        message: `${serialNumbers.length} serial numbers assigned successfully`,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/inventory/batch/select
   * Select batch for issue (FEFO logic)
   */
  async selectBatchForIssue(req: Request, res: Response) {
    try {
      const { productId, warehouseId, quantity } = req.query;

      const batches = await inventoryService.selectBatchForIssue(
        productId as string,
        warehouseId as string,
        parseFloat(quantity as string)
      );

      res.json({
        success: true,
        data: batches
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/inventory/serial/select
   * Select serial numbers for issue
   */
  async selectSerialNumbersForIssue(req: Request, res: Response) {
    try {
      const { productId, warehouseId, quantity } = req.query;

      const serialNumbers = await inventoryService.selectSerialNumbersForIssue(
        productId as string,
        warehouseId as string,
        parseInt(quantity as string)
      );

      res.json({
        success: true,
        data: serialNumbers
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/inventory/expiring
   * Get expiring batches
   */
  async getExpiringBatches(req: Request, res: Response) {
    try {
      const { days } = req.query;
      const daysBeforeExpiry = days ? parseInt(days as string) : 30;

      const batches = await inventoryService.getExpiringBatches(daysBeforeExpiry);

      res.json({
        success: true,
        data: batches,
        count: batches.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/expiring/mark
   * Mark expired batches
   */
  async markExpiredBatches(_req: Request, res: Response) {
    try {
      const result = await inventoryService.markExpiredBatches();

      res.json({
        success: true,
        message: `${result.count} batches marked as expired`,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/cycle-count
   * Create cycle count
   */
  async createCycleCount(req: Request, res: Response) {
    try {
      const { warehouseId, scheduledDate, productIds } = req.body;

      const cycleCount = await inventoryService.createCycleCount({
        warehouseId,
        scheduledDate: new Date(scheduledDate),
        productIds
      });

      res.status(201).json({
        success: true,
        message: 'Cycle count created successfully',
        data: cycleCount
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /api/inventory/cycle-count/:id/record
   * Record cycle count results
   */
  async recordCycleCountResults(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { counts } = req.body;

      const cycleCount = await inventoryService.recordCycleCountResults(id, counts);

      res.json({
        success: true,
        message: 'Cycle count results recorded successfully',
        data: cycleCount
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/inventory/cycle-count/:id
   * Get cycle count details
   */
  async getCycleCount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const cycleCount = await inventoryService.getCycleCount(id);

      if (!cycleCount) {
        res.status(404).json({
          success: false,
          message: 'Cycle count not found'
        });
        return;
      }

      res.json({
        success: true,
        data: cycleCount
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/cycle-count/:id/adjust
   * Generate adjustment entries for cycle count
   */
  async generateCycleCountAdjustments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'system';

      const adjustments = await inventoryService.generateCycleCountAdjustments(id, userId);

      res.json({
        success: true,
        message: `${adjustments.length} adjustments generated`,
        data: adjustments
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/bin-location
   * Create bin location
   */
  async createBinLocation(req: Request, res: Response) {
    try {
      const { warehouseId, code, aisle, rack, shelf, capacity } = req.body;

      const binLocation = await inventoryService.createBinLocation({
        warehouseId,
        code,
        aisle,
        rack,
        shelf,
        capacity: capacity ? parseFloat(capacity) : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Bin location created successfully',
        data: binLocation
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/bin-location/assign
   * Assign inventory to bin location
   */
  async assignToBinLocation(req: Request, res: Response) {
    try {
      const { binLocationId, productId, quantity, batchNumber } = req.body;

      const binInventory = await inventoryService.assignToBinLocation({
        binLocationId,
        productId,
        quantity: parseFloat(quantity),
        batchNumber
      });

      res.json({
        success: true,
        message: 'Inventory assigned to bin location',
        data: binInventory
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/transfer
   * Create warehouse transfer
   */
  async createWarehouseTransfer(req: Request, res: Response) {
    try {
      const { fromWarehouseId, toWarehouseId, items, notes } = req.body;
      const requestedBy = (req as any).user?.id || 'system';

      const transfer = await inventoryService.createWarehouseTransfer({
        fromWarehouseId,
        toWarehouseId,
        requestedBy,
        items,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Warehouse transfer created successfully',
        data: transfer
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/transfer/:id/complete
   * Complete warehouse transfer
   */
  async completeWarehouseTransfer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'system';

      const transfer = await inventoryService.completeWarehouseTransfer(id, userId);

      res.json({
        success: true,
        message: 'Warehouse transfer completed successfully',
        data: transfer
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/inventory/transfer/:id
   * Get warehouse transfer details
   */
  async getWarehouseTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const transfer = await inventoryService.getWarehouseTransfer(id);

      if (!transfer) {
        res.status(404).json({
          success: false,
          message: 'Transfer not found'
        });
        return;
      }

      res.json({
        success: true,
        data: transfer
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/reorder-check
   * Check reorder points and generate requisitions
   */
  async checkReorderPoints(_req: Request, res: Response) {
    try {
      const requisitions = await inventoryService.checkReorderPoints();

      res.json({
        success: true,
        message: `${requisitions.length} purchase requisitions generated`,
        data: requisitions
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/inventory/valuation
   * Calculate inventory valuation
   */
  async calculateInventoryValuation(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId, method } = req.body;

      if (!['FIFO', 'LIFO', 'weighted_average', 'standard_cost'].includes(method)) {
        res.status(400).json({
          success: false,
          message: 'Invalid valuation method. Must be FIFO, LIFO, weighted_average, or standard_cost'
        });
        return;
      }

      const valuation = await inventoryService.calculateInventoryValuation(warehouseId, method);

      res.json({
        success: true,
        data: valuation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new InventoryController();
