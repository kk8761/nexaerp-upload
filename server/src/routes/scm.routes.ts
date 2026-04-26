/**
 * Supply Chain Management Routes
 */

import { Router } from 'express';
import scmController from '../controllers/scm.controller';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// ==================== Demand Forecasting Routes ====================

router.post('/demand-forecast', scmController.createDemandForecast);
router.get('/demand-forecast/:id', scmController.getDemandForecast);
router.get('/demand-forecasts', scmController.listDemandForecasts);

// ==================== Supply Planning Routes ====================

router.post('/supply-plan', scmController.createSupplyPlan);
router.post('/supply-plan/:id/approve', scmController.approveSupplyPlan);
router.get('/supply-plan/:id', scmController.getSupplyPlan);
router.get('/supply-plans', scmController.listSupplyPlans);

// ==================== Shipment Tracking Routes ====================

router.post('/shipment', scmController.createShipment);
router.put('/shipment/:id/status', scmController.updateShipmentStatus);
router.get('/shipment/:id', scmController.getShipment);
router.get('/shipment/track/:trackingNumber', scmController.trackShipment);
router.get('/shipments', scmController.listShipments);

// ==================== Supplier Performance Routes ====================

router.post('/supplier-performance/calculate', scmController.calculateSupplierPerformance);
router.get('/supplier/:id/scorecard', scmController.getSupplierScorecard);
router.get('/supplier-performance', scmController.listSupplierPerformance);

// ==================== Global Inventory Visibility Routes ====================

router.get('/inventory/global', scmController.getGlobalInventoryVisibility);
router.post('/supplier/:id/lead-times/calculate', scmController.calculateSupplierLeadTimes);
router.get('/supplier/:id/lead-times', scmController.getSupplierLeadTimes);

// ==================== Vendor Collaboration Portal Routes ====================

router.post('/vendor-portal/access', scmController.createVendorPortalAccess);
router.post('/vendor-portal/purchase-order', scmController.sharePurchaseOrderWithVendor);
router.post('/vendor-portal/purchase-order/:id/confirm', scmController.vendorConfirmPurchaseOrder);
router.put('/vendor-portal/purchase-order/:id/status', scmController.vendorUpdatePurchaseOrderStatus);
router.get('/vendor-portal/purchase-orders', scmController.getVendorPurchaseOrders);
router.get('/vendor-portal/purchase-order/:id', scmController.getVendorPurchaseOrder);

export default router;
