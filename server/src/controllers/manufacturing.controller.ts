/**
 * Manufacturing Controller
 * Handles BOM, MRP, Production Orders, Material Consumption, and Quality Inspection
 */

import { Request, Response } from 'express';
import manufacturingService from '../services/manufacturing.service';

export class ManufacturingController {
  
  // ==================== BOM Management ====================
  
  /**
   * Create Bill of Materials
   */
  static async createBOM(req: Request, res: Response) {
    try {
      const bom = await manufacturingService.createBOM(req.body);
      res.status(201).json({ success: true, data: bom });
    } catch (error) {
      console.error('Error creating BOM:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create BOM' 
      });
    }
  }
  
  /**
   * Get BOM details
   */
  static async getBOM(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bom = await manufacturingService.getBOM(id);
      
      if (!bom) {
        res.status(404).json({ success: false, message: 'BOM not found' });
        return;
      }
      
      res.json({ success: true, data: bom });
    } catch (error) {
      console.error('Error fetching BOM:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch BOM' 
      });
    }
  }
  
  /**
   * Explode BOM to get all material requirements
   */
  static async explodeBOM(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity } = req.query;
      
      const qty = quantity ? parseFloat(quantity as string) : 1;
      const requirements = await manufacturingService.explodeBOM(id, qty);
      
      res.json({ success: true, data: requirements });
    } catch (error) {
      console.error('Error exploding BOM:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to explode BOM' 
      });
    }
  }
  
  /**
   * Update BOM version
   */
  static async updateBOMVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { version } = req.body;
      
      const bom = await manufacturingService.updateBOMVersion(id, version);
      res.json({ success: true, data: bom });
    } catch (error) {
      console.error('Error updating BOM version:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update BOM version' 
      });
    }
  }
  
  // ==================== MRP ====================
  
  /**
   * Run Material Requirements Planning
   */
  static async runMRP(req: Request, res: Response) {
    try {
      const { planningHorizon, notes } = req.body;
      const userId = (req as any).user?.id;
      
      const mrpRun = await manufacturingService.runMRP({
        planningHorizon: planningHorizon || 30,
        createdBy: userId,
        notes
      });
      
      res.status(201).json({ success: true, data: mrpRun });
    } catch (error) {
      console.error('Error running MRP:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to run MRP' 
      });
    }
  }
  
  /**
   * Get MRP run details
   */
  static async getMRPRun(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const mrpRun = await manufacturingService.getMRPRun(id);
      
      if (!mrpRun) {
        res.status(404).json({ success: false, message: 'MRP run not found' });
        return;
      }
      
      res.json({ success: true, data: mrpRun });
    } catch (error) {
      console.error('Error fetching MRP run:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch MRP run' 
      });
    }
  }
  
  // ==================== Production Orders ====================
  
  /**
   * Create production order
   */
  static async createProductionOrder(req: Request, res: Response) {
    try {
      const productionOrder = await manufacturingService.createProductionOrder(req.body);
      res.status(201).json({ success: true, data: productionOrder });
    } catch (error) {
      console.error('Error creating production order:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create production order' 
      });
    }
  }
  
  /**
   * Get production order details
   */
  static async getProductionOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await manufacturingService.getProductionOrder(id);
      
      if (!order) {
        res.status(404).json({ success: false, message: 'Production order not found' });
        return;
      }
      
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Error fetching production order:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch production order' 
      });
    }
  }
  
  /**
   * List production orders
   */
  static async listProductionOrders(req: Request, res: Response) {
    try {
      const { status, productId, startDate, endDate, priority } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (productId) filters.productId = productId as string;
      if (priority) filters.priority = priority as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const orders = await manufacturingService.listProductionOrders(filters);
      res.json({ success: true, data: orders });
    } catch (error) {
      console.error('Error listing production orders:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to list production orders' 
      });
    }
  }
  
  /**
   * Release production order
   */
  static async releaseProductionOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await manufacturingService.releaseProductionOrder(id);
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Error releasing production order:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to release production order' 
      });
    }
  }
  
  /**
   * Start production order
   */
  static async startProductionOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await manufacturingService.startProductionOrder(id);
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Error starting production order:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to start production order' 
      });
    }
  }
  
  /**
   * Complete production order
   */
  static async completeProductionOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { actualOutput, scrapQuantity } = req.body;
      
      const order = await manufacturingService.completeProductionOrder(
        id,
        actualOutput,
        scrapQuantity || 0
      );
      
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Error completing production order:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to complete production order' 
      });
    }
  }
  
  /**
   * Update operation status
   */
  static async updateOperationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, operatorId } = req.body;
      
      const operation = await manufacturingService.updateOperationStatus(id, status, operatorId);
      res.json({ success: true, data: operation });
    } catch (error) {
      console.error('Error updating operation status:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update operation status' 
      });
    }
  }
  
  // ==================== Material Consumption ====================
  
  /**
   * Record material consumption
   */
  static async recordMaterialConsumption(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const consumption = await manufacturingService.recordMaterialConsumption({
        ...req.body,
        consumedBy: userId
      });
      
      res.status(201).json({ success: true, data: consumption });
    } catch (error) {
      console.error('Error recording material consumption:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to record material consumption' 
      });
    }
  }
  
  /**
   * Backflush materials
   */
  static async backflushMaterials(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { outputQuantity } = req.body;
      const userId = (req as any).user?.id;
      
      const consumptions = await manufacturingService.backflushMaterials(
        id,
        outputQuantity,
        userId
      );
      
      res.json({ success: true, data: consumptions });
    } catch (error) {
      console.error('Error backflushing materials:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to backflush materials' 
      });
    }
  }
  
  /**
   * Record finished goods receipt
   */
  static async recordFinishedGoodsReceipt(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      const userId = (req as any).user?.id;
      
      const result = await manufacturingService.recordFinishedGoodsReceipt(
        id,
        quantity,
        userId
      );
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error recording finished goods receipt:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to record finished goods receipt' 
      });
    }
  }
  
  // ==================== Quality Inspection ====================
  
  /**
   * Create quality inspection
   */
  static async createQualityInspection(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const inspection = await manufacturingService.createQualityInspection({
        ...req.body,
        inspectorId: userId
      });
      
      res.status(201).json({ success: true, data: inspection });
    } catch (error) {
      console.error('Error creating quality inspection:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create quality inspection' 
      });
    }
  }
  
  /**
   * Record inspection results
   */
  static async recordInspectionResults(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const inspection = await manufacturingService.recordInspectionResults(id, req.body);
      res.json({ success: true, data: inspection });
    } catch (error) {
      console.error('Error recording inspection results:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to record inspection results' 
      });
    }
  }
  
  /**
   * Get quality inspection details
   */
  static async getQualityInspection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const inspection = await manufacturingService.getQualityInspection(id);
      
      if (!inspection) {
        res.status(404).json({ success: false, message: 'Quality inspection not found' });
        return;
      }
      
      res.json({ success: true, data: inspection });
    } catch (error) {
      console.error('Error fetching quality inspection:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch quality inspection' 
      });
    }
  }
  
  /**
   * List quality inspections
   */
  static async listQualityInspections(req: Request, res: Response) {
    try {
      const { productId, productionOrderId, status, inspectionType, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (productId) filters.productId = productId as string;
      if (productionOrderId) filters.productionOrderId = productionOrderId as string;
      if (status) filters.status = status as string;
      if (inspectionType) filters.inspectionType = inspectionType as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const inspections = await manufacturingService.listQualityInspections(filters);
      res.json({ success: true, data: inspections });
    } catch (error) {
      console.error('Error listing quality inspections:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to list quality inspections' 
      });
    }
  }
  
  // ==================== Work Centers ====================
  
  /**
   * Create work center
   */
  static async createWorkCenter(req: Request, res: Response) {
    try {
      const workCenter = await manufacturingService.createWorkCenter(req.body);
      res.status(201).json({ success: true, data: workCenter });
    } catch (error) {
      console.error('Error creating work center:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create work center' 
      });
    }
  }
  
  /**
   * Get work center details
   */
  static async getWorkCenter(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const workCenter = await manufacturingService.getWorkCenter(id);
      
      if (!workCenter) {
        res.status(404).json({ success: false, message: 'Work center not found' });
        return;
      }
      
      res.json({ success: true, data: workCenter });
    } catch (error) {
      console.error('Error fetching work center:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch work center' 
      });
    }
  }
  
  /**
   * List work centers
   */
  static async listWorkCenters(req: Request, res: Response) {
    try {
      const { isActive } = req.query;
      const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
      
      const workCenters = await manufacturingService.listWorkCenters(active);
      res.json({ success: true, data: workCenters });
    } catch (error) {
      console.error('Error listing work centers:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to list work centers' 
      });
    }
  }
}

