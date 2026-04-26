/**
 * Workflow Routes
 * API routes for workflow management
 */

import { Router } from 'express';
import workflowController from '../controllers/workflow.controller';

const router = Router();

// Workflow CRUD
router.post('/workflows', workflowController.createWorkflow.bind(workflowController));
router.get('/workflows', workflowController.listWorkflows.bind(workflowController));
router.get('/workflows/:id', workflowController.getWorkflow.bind(workflowController));
router.put('/workflows/:id', workflowController.updateWorkflow.bind(workflowController));
router.delete('/workflows/:id', workflowController.deleteWorkflow.bind(workflowController));

// Workflow activation
router.post('/workflows/:id/activate', workflowController.activateWorkflow.bind(workflowController));
router.post('/workflows/:id/deactivate', workflowController.deactivateWorkflow.bind(workflowController));

// Workflow testing and triggering
router.post('/workflows/:id/test', workflowController.testWorkflow.bind(workflowController));
router.post('/workflows/:id/trigger', workflowController.triggerWorkflow.bind(workflowController));
router.post('/workflows/webhook/:id', workflowController.webhookTrigger.bind(workflowController));

// Execution history
router.get('/workflows/:id/executions', workflowController.getExecutionHistory.bind(workflowController));
router.get('/workflows/executions/:executionId', workflowController.getExecutionDetails.bind(workflowController));

// Templates
router.get('/workflows/templates/categories', workflowController.getTemplateCategories.bind(workflowController));
router.get('/workflows/templates', workflowController.getTemplates.bind(workflowController));
router.post('/workflows/templates/:templateId/instantiate', workflowController.createFromTemplate.bind(workflowController));

export default router;
