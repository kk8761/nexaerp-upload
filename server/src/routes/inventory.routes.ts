/**
 * Advanced Inventory Management Routes
 */

import { Router } from 'express';
import inventoryController from '../controllers/inventory.controller';

const router = Router();

// Batch tracking routes
router.post('/batch/assign', inventoryController.assignBatch);
router.get('/batch/select', inventoryController.selectBatchForIssue);

// Serial number tracking routes
router.post('/serial/assign', inventoryController.assignSerialNumbers);
router.get('/serial/select', inventoryController.selectSerialNumbersForIssue);

// Expiry tracking routes
router.get('/expiring', inventoryController.getExpiringBatches);
router.post('/expiring/mark', inventoryController.markExpiredBatches);

// Cycle counting routes
router.post('/cycle-count', inventoryController.createCycleCount);
router.get('/cycle-count/:id', inventoryController.getCycleCount);
router.put('/cycle-count/:id/record', inventoryController.recordCycleCountResults);
router.post('/cycle-count/:id/adjust', inventoryController.generateCycleCountAdjustments);

// Bin location routes
router.post('/bin-location', inventoryController.createBinLocation);
router.post('/bin-location/assign', inventoryController.assignToBinLocation);

// Warehouse transfer routes
router.post('/transfer', inventoryController.createWarehouseTransfer);
router.get('/transfer/:id', inventoryController.getWarehouseTransfer);
router.post('/transfer/:id/complete', inventoryController.completeWarehouseTransfer);

// Reorder point monitoring
router.post('/reorder-check', inventoryController.checkReorderPoints);

// Inventory valuation
router.post('/valuation', inventoryController.calculateInventoryValuation);

export default router;
