/**
 * Project Systems Routes
 * API routes for project management, resource allocation, cost tracking, EVM, and invoicing
 */

import { Router } from 'express';
import projectController from '../controllers/project.controller';

const router = Router();

// ─── Project Management Routes ────────────────────────────

// Create and list projects
router.post('/projects', projectController.createProject);
router.get('/projects', projectController.listProjects);
router.get('/projects/:projectId', projectController.getProject);
router.put('/projects/:projectId/status', projectController.updateProjectStatus);

// Project templates
router.post('/projects/templates', projectController.createProjectTemplate);
router.post('/projects/templates/:templateId/instantiate', projectController.createProjectFromTemplate);

// ─── Resource Allocation Routes ───────────────────────────

router.post('/projects/:projectId/resources', projectController.allocateResources);
router.get('/projects/resources/utilization', projectController.analyzeResourceUtilization);

// ─── Cost Tracking Routes ─────────────────────────────────

router.post('/projects/:projectId/costs', projectController.trackProjectCosts);
router.get('/projects/:projectId/costs/variance', projectController.generateCostVarianceReport);

// ─── Earned Value Management Routes ───────────────────────

router.post('/projects/:projectId/evm/calculate', projectController.calculateEarnedValue);

// ─── Milestone Tracking Routes ────────────────────────────

router.put('/projects/:projectId/milestones/:milestoneId', projectController.updateMilestoneStatus);
router.get('/projects/:projectId/milestones/report', projectController.generateMilestoneReport);

// ─── Project Invoicing Routes ─────────────────────────────

router.post('/projects/:projectId/invoices', projectController.generateProjectInvoice);

// ─── Project Forecasting Routes ───────────────────────────

router.get('/projects/:projectId/forecast', projectController.forecastProjectCompletion);

export default router;
