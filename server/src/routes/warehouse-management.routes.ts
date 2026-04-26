/**
 * Warehouse Management System (WMS) Routes
 */

import { Router } from 'express';
import warehouseManagementController from '../controllers/warehouse-management.controller';

const router = Router();

// ─── Putaway Strategy Routes ──────────────────────────────

router.post('/putaway-strategies', warehouseManagementController.createPutawayStrategy);
router.post('/putaway-tasks', warehouseManagementController.createPutawayTask);
router.put('/putaway-tasks/:taskId/assign', warehouseManagementController.assignPutawayTask);
router.put('/putaway-tasks/:taskId/complete', warehouseManagementController.completePutawayTask);

// ─── Wave Picking Routes ──────────────────────────────────

router.post('/wave-picks', warehouseManagementController.createWavePick);
router.put('/wave-picks/:waveId/release', warehouseManagementController.releaseWavePick);
router.put('/wave-picks/:waveId/complete', warehouseManagementController.completeWavePick);

// ─── Pick List Routes ─────────────────────────────────────

router.post('/pick-lists', warehouseManagementController.createPickList);
router.put('/pick-lists/:pickListId/assign', warehouseManagementController.assignPickList);
router.put('/pick-lists/:pickListId/start', warehouseManagementController.startPicking);
router.put('/pick-lists/:pickListId/complete', warehouseManagementController.completePickList);
router.put('/pick-list-items/:itemId/pick', warehouseManagementController.recordPickedItem);

// ─── Packing Slip Routes ──────────────────────────────────

router.post('/packing-slips', warehouseManagementController.createPackingSlip);
router.put('/packing-slips/:packingSlipId/start', warehouseManagementController.startPacking);
router.put('/packing-slips/:packingSlipId/complete', warehouseManagementController.completePacking);
router.put('/packing-slips/:packingSlipId/ship', warehouseManagementController.markAsShipped);

// ─── Warehouse Worker Routes ──────────────────────────────

router.post('/workers', warehouseManagementController.createWarehouseWorker);
router.get('/workers/:workerId/productivity', warehouseManagementController.getWorkerProductivity);
router.post('/workers/productivity', warehouseManagementController.logWorkerProductivity);
router.get('/workers/:workerId/tasks', warehouseManagementController.getPendingTasksForWorker);

// ─── Labor Management Routes ──────────────────────────────

router.get('/warehouses/:warehouseId/labor-utilization', warehouseManagementController.generateLaborUtilizationReport);

// ─── Cycle Count Optimization Routes ──────────────────────

router.get('/warehouses/:warehouseId/cycle-count-optimization', warehouseManagementController.optimizeCycleCountSchedule);

export default router;
