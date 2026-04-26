/**
 * Approval Routes
 * API routes for approval workflow management
 * 
 * Requirements: 5.5 - Multi-level approval hierarchies
 * Task 17.1: Create approval workflow framework
 */

import { Router } from 'express';
import approvalController from '../controllers/approval.controller';
import approvalDashboardController from '../controllers/approval-dashboard.controller';

const router = Router();

// Workflow management
router.post('/workflows', approvalController.createWorkflow.bind(approvalController));

// Approval submission and processing
router.post('/submit', approvalController.submitForApproval.bind(approvalController));
router.post('/:id/process', approvalController.processApproval.bind(approvalController));
router.post('/:id/cancel', approvalController.cancelApprovalRequest.bind(approvalController));
router.post('/:id/delegate', approvalController.delegateApproval.bind(approvalController));

// Approval queries
router.get('/pending', approvalController.getPendingApprovals.bind(approvalController));
router.get('/:id', approvalController.getApprovalRequest.bind(approvalController));
router.get('/history/:entityType/:entityId', approvalController.getApprovalHistory.bind(approvalController));

// Dashboard endpoints
router.get('/dashboard', approvalDashboardController.getDashboard.bind(approvalDashboardController));
router.get('/dashboard/pending', approvalDashboardController.getPendingWithDetails.bind(approvalDashboardController));
router.get('/dashboard/stats', approvalDashboardController.getStatistics.bind(approvalDashboardController));
router.get('/dashboard/workflows', approvalDashboardController.getWorkflowTemplates.bind(approvalDashboardController));

export default router;
