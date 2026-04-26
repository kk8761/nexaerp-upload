/**
 * Warehouse Management System (WMS) Controller
 * Handles HTTP requests for warehouse operations
 */

import { Request, Response } from 'express';
import warehouseManagementService from '../services/warehouse-management.service';

export class WarehouseManagementController {
  // ─── Putaway Strategy Endpoints ───────────────────────────

  async createPutawayStrategy(req: Request, res: Response) {
    try {
      const strategy = await warehouseManagementService.createPutawayStrategy(req.body);
      res.status(201).json(strategy);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async createPutawayTask(req: Request, res: Response) {
    try {
      const task = await warehouseManagementService.createPutawayTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async assignPutawayTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const { workerId } = req.body;
      const task = await warehouseManagementService.assignPutawayTask(taskId, workerId);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async completePutawayTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const { workerId } = req.body;
      const task = await warehouseManagementService.completePutawayTask(taskId, workerId);
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ─── Wave Picking Endpoints ───────────────────────────────

  async createWavePick(req: Request, res: Response) {
    try {
      const wave = await warehouseManagementService.createWavePick(req.body);
      res.status(201).json(wave);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async releaseWavePick(req: Request, res: Response) {
    try {
      const { waveId } = req.params;
      const wave = await warehouseManagementService.releaseWavePick(waveId);
      res.json(wave);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async completeWavePick(req: Request, res: Response) {
    try {
      const { waveId } = req.params;
      const wave = await warehouseManagementService.completeWavePick(waveId);
      res.json(wave);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ─── Pick List Endpoints ──────────────────────────────────

  async createPickList(req: Request, res: Response) {
    try {
      const pickList = await warehouseManagementService.createPickList(req.body);
      res.status(201).json(pickList);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async assignPickList(req: Request, res: Response) {
    try {
      const { pickListId } = req.params;
      const { workerId } = req.body;
      const pickList = await warehouseManagementService.assignPickList(pickListId, workerId);
      res.json(pickList);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async startPicking(req: Request, res: Response) {
    try {
      const { pickListId } = req.params;
      const pickList = await warehouseManagementService.startPicking(pickListId);
      res.json(pickList);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async recordPickedItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const { quantityPicked, serialNumbers } = req.body;
      const item = await warehouseManagementService.recordPickedItem(
        itemId,
        quantityPicked,
        serialNumbers
      );
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async completePickList(req: Request, res: Response) {
    try {
      const { pickListId } = req.params;
      const pickList = await warehouseManagementService.completePickList(pickListId);
      res.json(pickList);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ─── Packing Slip Endpoints ───────────────────────────────

  async createPackingSlip(req: Request, res: Response) {
    try {
      const slip = await warehouseManagementService.createPackingSlip(req.body);
      res.status(201).json(slip);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async startPacking(req: Request, res: Response) {
    try {
      const { packingSlipId } = req.params;
      const { workerId } = req.body;
      const slip = await warehouseManagementService.startPacking(packingSlipId, workerId);
      res.json(slip);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async completePacking(req: Request, res: Response) {
    try {
      const { packingSlipId } = req.params;
      const slip = await warehouseManagementService.completePacking(packingSlipId, req.body);
      res.json(slip);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async markAsShipped(req: Request, res: Response) {
    try {
      const { packingSlipId } = req.params;
      const slip = await warehouseManagementService.markAsShipped(packingSlipId);
      res.json(slip);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // ─── Warehouse Worker Endpoints ───────────────────────────

  async createWarehouseWorker(req: Request, res: Response) {
    try {
      const worker = await warehouseManagementService.createWarehouseWorker(req.body);
      res.status(201).json(worker);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getWorkerProductivity(req: Request, res: Response) {
    try {
      const { workerId } = req.params;
      const { startDate, endDate } = req.query;
      
      const productivity = await warehouseManagementService.getWorkerProductivity(
        workerId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(productivity);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async logWorkerProductivity(req: Request, res: Response) {
    try {
      const log = await warehouseManagementService.logWorkerProductivity(req.body);
      res.status(201).json(log);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async generateLaborUtilizationReport(req: Request, res: Response) {
    try {
      const { warehouseId } = req.params;
      const { startDate, endDate } = req.query;
      
      const report = await warehouseManagementService.generateLaborUtilizationReport(
        warehouseId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getPendingTasksForWorker(req: Request, res: Response) {
    try {
      const { workerId } = req.params;
      const tasks = await warehouseManagementService.getPendingTasksForWorker(workerId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async optimizeCycleCountSchedule(req: Request, res: Response) {
    try {
      const { warehouseId } = req.params;
      const schedule = await warehouseManagementService.optimizeCycleCountSchedule(warehouseId);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export default new WarehouseManagementController();
