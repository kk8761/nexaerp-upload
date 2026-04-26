/**
 * EAM Controller
 * Handles HTTP requests for Enterprise Asset Management
 */

import { Request, Response } from 'express';
import eamService from '../services/eam.service';

export class EAMController {
  
  // ==================== Asset Registry ====================
  
  /**
   * Register new asset
   */
  async registerAsset(req: Request, res: Response) {
    try {
      const asset = await eamService.registerAsset(req.body);
      res.status(201).json(asset);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to register asset' });
    }
  }
  
  /**
   * Get asset with hierarchy
   */
  async getAsset(req: Request, res: Response): Promise<void> {
    try {
      const { assetId } = req.params;
      const asset = await eamService.getAssetWithHierarchy(assetId);
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get asset' });
    }
  }
  
  /**
   * Update asset location
   */
  async updateAssetLocation(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const { location, department } = req.body;
      const asset = await eamService.updateAssetLocation(assetId, location, department);
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update asset location' });
    }
  }
  
  /**
   * Update asset status
   */
  async updateAssetStatus(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const { status } = req.body;
      const asset = await eamService.updateAssetStatus(assetId, status);
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update asset status' });
    }
  }
  
  /**
   * Get asset by QR code
   */
  async getAssetByQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { qrCode } = req.params;
      const asset = await eamService.getAssetByQRCode(qrCode);
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get asset' });
    }
  }
  
  /**
   * List assets
   */
  async listAssets(req: Request, res: Response) {
    try {
      const { category, status, location, department } = req.query;
      const assets = await eamService.listAssets({
        category: category as string,
        status: status as string,
        location: location as string,
        department: department as string
      });
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list assets' });
    }
  }
  
  // ==================== Preventive Maintenance ====================
  
  /**
   * Create maintenance plan
   */
  async createMaintenancePlan(req: Request, res: Response) {
    try {
      const plan = await eamService.createMaintenancePlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create maintenance plan' });
    }
  }
  
  /**
   * Schedule preventive maintenance
   */
  async schedulePreventiveMaintenance(req: Request, res: Response) {
    try {
      const { planId } = req.params;
      const task = await eamService.schedulePreventiveMaintenance(planId);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to schedule maintenance' });
    }
  }
  
  /**
   * Create maintenance task
   */
  async createMaintenanceTask(req: Request, res: Response) {
    try {
      const task = await eamService.createMaintenanceTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create maintenance task' });
    }
  }
  
  /**
   * Update maintenance task status
   */
  async updateMaintenanceTaskStatus(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const { status } = req.body;
      const task = await eamService.updateMaintenanceTaskStatus(taskId, status);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update task status' });
    }
  }
  
  /**
   * Get maintenance history
   */
  async getMaintenanceHistory(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const history = await eamService.getMaintenanceHistory(assetId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get maintenance history' });
    }
  }
  
  // ==================== Spare Parts Management ====================
  
  /**
   * Record maintenance completion
   */
  async recordMaintenanceCompletion(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const record = await eamService.recordMaintenanceCompletion(taskId, req.body);
      res.status(201).json(record);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to record maintenance completion' });
    }
  }
  
  /**
   * Get asset spare parts
   */
  async getAssetSpareParts(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const parts = await eamService.getAssetSpareParts(assetId);
      res.json(parts);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get spare parts' });
    }
  }
  
  // ==================== Asset Health Monitoring ====================
  
  /**
   * Calculate asset health
   */
  async calculateAssetHealth(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const health = await eamService.calculateAssetHealth(assetId);
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to calculate asset health' });
    }
  }
  
  /**
   * Get asset health report
   */
  async getAssetHealthReport(req: Request, res: Response): Promise<void> {
    try {
      const { assetId } = req.params;
      const report = await eamService.getAssetHealthReport(assetId);
      if (!report) {
        res.status(404).json({ error: 'Asset health report not found' });
        return;
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get health report' });
    }
  }
  
  // ==================== Maintenance Cost Forecasting ====================
  
  /**
   * Forecast maintenance costs
   */
  async forecastMaintenanceCosts(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }
      
      const forecast = await eamService.forecastMaintenanceCosts(
        assetId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to forecast costs' });
    }
  }
  
  // ==================== Asset Utilization Tracking ====================
  
  /**
   * Calculate asset utilization
   */
  async calculateAssetUtilization(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const { period } = req.body;
      const utilization = await eamService.calculateAssetUtilization(assetId, new Date(period));
      res.json(utilization);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to calculate utilization' });
    }
  }
  
  /**
   * Get asset utilization report
   */
  async getAssetUtilizationReport(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }
      
      const report = await eamService.getAssetUtilizationReport(
        assetId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get utilization report' });
    }
  }
  
  // ==================== Plant Shutdown Planning ====================
  
  /**
   * Create plant shutdown
   */
  async createPlantShutdown(req: Request, res: Response) {
    try {
      const shutdown = await eamService.createPlantShutdown(req.body);
      res.status(201).json(shutdown);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create plant shutdown' });
    }
  }
  
  /**
   * Update shutdown asset status
   */
  async updateShutdownAssetStatus(req: Request, res: Response) {
    try {
      const { shutdownId, assetId } = req.params;
      const { status, technicianId } = req.body;
      const shutdown = await eamService.updateShutdownAssetStatus(shutdownId, assetId, status, technicianId);
      res.json(shutdown);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update shutdown asset status' });
    }
  }
  
  /**
   * Get plant shutdown
   */
  async getPlantShutdown(req: Request, res: Response): Promise<void> {
    try {
      const { shutdownId } = req.params;
      const shutdown = await eamService.getPlantShutdown(shutdownId);
      if (!shutdown) {
        res.status(404).json({ error: 'Plant shutdown not found' });
        return;
      }
      res.json(shutdown);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get plant shutdown' });
    }
  }
  
  /**
   * List plant shutdowns
   */
  async listPlantShutdowns(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const shutdowns = await eamService.listPlantShutdowns(status as string);
      res.json(shutdowns);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to list plant shutdowns' });
    }
  }
}

export default new EAMController();
