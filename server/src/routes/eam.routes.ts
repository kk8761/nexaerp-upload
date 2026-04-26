/**
 * EAM Routes
 * Enterprise Asset Management API endpoints
 */

import { Router } from 'express';
import eamController from '../controllers/eam.controller';

const router = Router();

// ==================== Asset Registry Routes ====================

/**
 * @route   POST /api/eam/assets
 * @desc    Register new asset
 * @access  Private
 */
router.post('/assets', eamController.registerAsset.bind(eamController));

/**
 * @route   GET /api/eam/assets
 * @desc    List assets with filters
 * @access  Private
 */
router.get('/assets', eamController.listAssets.bind(eamController));

/**
 * @route   GET /api/eam/assets/:assetId
 * @desc    Get asset with hierarchy
 * @access  Private
 */
router.get('/assets/:assetId', eamController.getAsset.bind(eamController));

/**
 * @route   PUT /api/eam/assets/:assetId/location
 * @desc    Update asset location
 * @access  Private
 */
router.put('/assets/:assetId/location', eamController.updateAssetLocation.bind(eamController));

/**
 * @route   PUT /api/eam/assets/:assetId/status
 * @desc    Update asset status
 * @access  Private
 */
router.put('/assets/:assetId/status', eamController.updateAssetStatus.bind(eamController));

/**
 * @route   GET /api/eam/assets/qr/:qrCode
 * @desc    Get asset by QR code
 * @access  Private
 */
router.get('/assets/qr/:qrCode', eamController.getAssetByQRCode.bind(eamController));

// ==================== Maintenance Plan Routes ====================

/**
 * @route   POST /api/eam/maintenance-plans
 * @desc    Create maintenance plan
 * @access  Private
 */
router.post('/maintenance-plans', eamController.createMaintenancePlan.bind(eamController));

/**
 * @route   POST /api/eam/maintenance-plans/:planId/schedule
 * @desc    Schedule preventive maintenance from plan
 * @access  Private
 */
router.post('/maintenance-plans/:planId/schedule', eamController.schedulePreventiveMaintenance.bind(eamController));

// ==================== Maintenance Task Routes ====================

/**
 * @route   POST /api/eam/maintenance-tasks
 * @desc    Create maintenance task
 * @access  Private
 */
router.post('/maintenance-tasks', eamController.createMaintenanceTask.bind(eamController));

/**
 * @route   PUT /api/eam/maintenance-tasks/:taskId/status
 * @desc    Update maintenance task status
 * @access  Private
 */
router.put('/maintenance-tasks/:taskId/status', eamController.updateMaintenanceTaskStatus.bind(eamController));

/**
 * @route   POST /api/eam/maintenance-tasks/:taskId/complete
 * @desc    Record maintenance completion with spare parts
 * @access  Private
 */
router.post('/maintenance-tasks/:taskId/complete', eamController.recordMaintenanceCompletion.bind(eamController));

/**
 * @route   GET /api/eam/assets/:assetId/maintenance-history
 * @desc    Get maintenance history for asset
 * @access  Private
 */
router.get('/assets/:assetId/maintenance-history', eamController.getMaintenanceHistory.bind(eamController));

// ==================== Spare Parts Routes ====================

/**
 * @route   GET /api/eam/assets/:assetId/spare-parts
 * @desc    Get spare parts linked to asset
 * @access  Private
 */
router.get('/assets/:assetId/spare-parts', eamController.getAssetSpareParts.bind(eamController));

// ==================== Asset Health Routes ====================

/**
 * @route   POST /api/eam/assets/:assetId/health/calculate
 * @desc    Calculate asset health score
 * @access  Private
 */
router.post('/assets/:assetId/health/calculate', eamController.calculateAssetHealth.bind(eamController));

/**
 * @route   GET /api/eam/assets/:assetId/health
 * @desc    Get asset health report
 * @access  Private
 */
router.get('/assets/:assetId/health', eamController.getAssetHealthReport.bind(eamController));

// ==================== Cost Forecasting Routes ====================

/**
 * @route   GET /api/eam/assets/:assetId/forecast
 * @desc    Forecast maintenance costs
 * @access  Private
 */
router.get('/assets/:assetId/forecast', eamController.forecastMaintenanceCosts.bind(eamController));

// ==================== Utilization Routes ====================

/**
 * @route   POST /api/eam/assets/:assetId/utilization/calculate
 * @desc    Calculate asset utilization
 * @access  Private
 */
router.post('/assets/:assetId/utilization/calculate', eamController.calculateAssetUtilization.bind(eamController));

/**
 * @route   GET /api/eam/assets/:assetId/utilization
 * @desc    Get asset utilization report
 * @access  Private
 */
router.get('/assets/:assetId/utilization', eamController.getAssetUtilizationReport.bind(eamController));

// ==================== Plant Shutdown Routes ====================

/**
 * @route   POST /api/eam/shutdowns
 * @desc    Create plant shutdown plan
 * @access  Private
 */
router.post('/shutdowns', eamController.createPlantShutdown.bind(eamController));

/**
 * @route   GET /api/eam/shutdowns
 * @desc    List plant shutdowns
 * @access  Private
 */
router.get('/shutdowns', eamController.listPlantShutdowns.bind(eamController));

/**
 * @route   GET /api/eam/shutdowns/:shutdownId
 * @desc    Get plant shutdown details
 * @access  Private
 */
router.get('/shutdowns/:shutdownId', eamController.getPlantShutdown.bind(eamController));

/**
 * @route   PUT /api/eam/shutdowns/:shutdownId/assets/:assetId/status
 * @desc    Update shutdown asset status
 * @access  Private
 */
router.put('/shutdowns/:shutdownId/assets/:assetId/status', eamController.updateShutdownAssetStatus.bind(eamController));

export default router;
