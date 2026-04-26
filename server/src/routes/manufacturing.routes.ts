/**
 * Manufacturing Routes
 * Routes for BOM, MRP, Production Orders, Material Consumption, and Quality Inspection
 */

import { Router, RequestHandler } from 'express';
import { ManufacturingController } from '../controllers/manufacturing.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate as RequestHandler);

// ==================== BOM Routes ====================

/**
 * @route   POST /api/manufacturing/bom
 * @desc    Create a new Bill of Materials
 * @access  Private
 */
router.post('/bom', ManufacturingController.createBOM);

/**
 * @route   GET /api/manufacturing/bom/:id
 * @desc    Get BOM details
 * @access  Private
 */
router.get('/bom/:id', ManufacturingController.getBOM);

/**
 * @route   GET /api/manufacturing/bom/:id/explode
 * @desc    Explode BOM to get all material requirements
 * @access  Private
 */
router.get('/bom/:id/explode', ManufacturingController.explodeBOM);

/**
 * @route   PATCH /api/manufacturing/bom/:id/version
 * @desc    Update BOM version
 * @access  Private
 */
router.patch('/bom/:id/version', ManufacturingController.updateBOMVersion);

// ==================== MRP Routes ====================

/**
 * @route   POST /api/manufacturing/mrp/run
 * @desc    Run Material Requirements Planning
 * @access  Private
 */
router.post('/mrp/run', ManufacturingController.runMRP);

/**
 * @route   GET /api/manufacturing/mrp/:id
 * @desc    Get MRP run details
 * @access  Private
 */
router.get('/mrp/:id', ManufacturingController.getMRPRun);

// ==================== Production Order Routes ====================

/**
 * @route   POST /api/manufacturing/production-orders
 * @desc    Create a new production order
 * @access  Private
 */
router.post('/production-orders', ManufacturingController.createProductionOrder);

/**
 * @route   GET /api/manufacturing/production-orders
 * @desc    List production orders with filters
 * @access  Private
 */
router.get('/production-orders', ManufacturingController.listProductionOrders);

/**
 * @route   GET /api/manufacturing/production-orders/:id
 * @desc    Get production order details
 * @access  Private
 */
router.get('/production-orders/:id', ManufacturingController.getProductionOrder);

/**
 * @route   POST /api/manufacturing/production-orders/:id/release
 * @desc    Release production order
 * @access  Private
 */
router.post('/production-orders/:id/release', ManufacturingController.releaseProductionOrder);

/**
 * @route   POST /api/manufacturing/production-orders/:id/start
 * @desc    Start production order
 * @access  Private
 */
router.post('/production-orders/:id/start', ManufacturingController.startProductionOrder);

/**
 * @route   POST /api/manufacturing/production-orders/:id/complete
 * @desc    Complete production order
 * @access  Private
 */
router.post('/production-orders/:id/complete', ManufacturingController.completeProductionOrder);

/**
 * @route   PATCH /api/manufacturing/operations/:id/status
 * @desc    Update operation status
 * @access  Private
 */
router.patch('/operations/:id/status', ManufacturingController.updateOperationStatus);

// ==================== Material Consumption Routes ====================

/**
 * @route   POST /api/manufacturing/material-consumption
 * @desc    Record material consumption
 * @access  Private
 */
router.post('/material-consumption', ManufacturingController.recordMaterialConsumption);

/**
 * @route   POST /api/manufacturing/production-orders/:id/backflush
 * @desc    Backflush materials for production order
 * @access  Private
 */
router.post('/production-orders/:id/backflush', ManufacturingController.backflushMaterials);

/**
 * @route   POST /api/manufacturing/production-orders/:id/finished-goods
 * @desc    Record finished goods receipt
 * @access  Private
 */
router.post('/production-orders/:id/finished-goods', ManufacturingController.recordFinishedGoodsReceipt);

// ==================== Quality Inspection Routes ====================

/**
 * @route   POST /api/manufacturing/quality-inspections
 * @desc    Create a new quality inspection
 * @access  Private
 */
router.post('/quality-inspections', ManufacturingController.createQualityInspection);

/**
 * @route   GET /api/manufacturing/quality-inspections
 * @desc    List quality inspections with filters
 * @access  Private
 */
router.get('/quality-inspections', ManufacturingController.listQualityInspections);

/**
 * @route   GET /api/manufacturing/quality-inspections/:id
 * @desc    Get quality inspection details
 * @access  Private
 */
router.get('/quality-inspections/:id', ManufacturingController.getQualityInspection);

/**
 * @route   PATCH /api/manufacturing/quality-inspections/:id/results
 * @desc    Record inspection results
 * @access  Private
 */
router.patch('/quality-inspections/:id/results', ManufacturingController.recordInspectionResults);

// ==================== Work Center Routes ====================

/**
 * @route   POST /api/manufacturing/work-centers
 * @desc    Create a new work center
 * @access  Private
 */
router.post('/work-centers', ManufacturingController.createWorkCenter);

/**
 * @route   GET /api/manufacturing/work-centers
 * @desc    List all work centers
 * @access  Private
 */
router.get('/work-centers', ManufacturingController.listWorkCenters);

/**
 * @route   GET /api/manufacturing/work-centers/:id
 * @desc    Get work center details
 * @access  Private
 */
router.get('/work-centers/:id', ManufacturingController.getWorkCenter);

export default router;
