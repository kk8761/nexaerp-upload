/**
 * Quality Management Routes
 * Task 21: Implement Quality Management System
 */

import { Router } from 'express';
import {
  InspectionPlanController,
  InspectionResultController,
  NonConformanceController,
  CorrectiveActionController,
} from '../controllers/qualityManagement.controller';

const router = Router();

// ─── Inspection Plan Routes ────────────────────────────────

router.post('/inspection-plans', InspectionPlanController.createInspectionPlan);
router.get('/inspection-plans', InspectionPlanController.getInspectionPlans);
router.get('/inspection-plans/:id', InspectionPlanController.getInspectionPlanById);
router.get(
  '/inspection-plans/product/:productId',
  InspectionPlanController.getInspectionPlansByProduct
);
router.put('/inspection-plans/:id', InspectionPlanController.updateInspectionPlan);
router.delete('/inspection-plans/:id', InspectionPlanController.deactivateInspectionPlan);

// ─── Inspection Result Routes ──────────────────────────────

router.post('/inspection-results', InspectionResultController.createInspectionResult);
router.post(
  '/inspection-results/:id/checkpoints',
  InspectionResultController.recordCheckpointResult
);
router.post('/inspection-results/:id/complete', InspectionResultController.completeInspection);
router.get('/inspection-results/:id', InspectionResultController.getInspectionResultById);
router.get(
  '/inspection-results/product/:productId',
  InspectionResultController.getInspectionResultsByProduct
);
router.get(
  '/inspection-results/batch/:batchNumber',
  InspectionResultController.getInspectionResultsByBatch
);
router.get('/inspection-results/statistics', InspectionResultController.getInspectionStatistics);

// ─── Non-Conformance Routes ────────────────────────────────

router.post('/non-conformances', NonConformanceController.createNonConformance);
router.put('/non-conformances/:id', NonConformanceController.updateNonConformance);
router.post('/non-conformances/:id/close', NonConformanceController.closeNonConformance);
router.get('/non-conformances/:id', NonConformanceController.getNonConformanceById);
router.get('/non-conformances', NonConformanceController.getNonConformances);
router.get('/non-conformances/statistics', NonConformanceController.getNonConformanceStatistics);

// ─── Corrective Action Routes ──────────────────────────────

router.post('/corrective-actions', CorrectiveActionController.createCorrectiveAction);
router.put('/corrective-actions/:id', CorrectiveActionController.updateCorrectiveAction);
router.post('/corrective-actions/:id/complete', CorrectiveActionController.completeCorrectiveAction);
router.post('/corrective-actions/:id/verify', CorrectiveActionController.verifyCorrectiveAction);
router.get('/corrective-actions/:id', CorrectiveActionController.getCorrectiveActionById);
router.get('/corrective-actions/nc/:ncId', CorrectiveActionController.getCorrectiveActionsByNC);
router.get(
  '/corrective-actions/assigned/:userId',
  CorrectiveActionController.getCorrectiveActionsByAssignee
);
router.get('/corrective-actions/overdue', CorrectiveActionController.getOverdueCorrectiveActions);

export default router;
