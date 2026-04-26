/**
 * Workflow Controller
 * HTTP endpoints for workflow management
 */

import { Request, Response } from 'express';
import workflowService from '../services/workflow.service';
import workflowEngineService from '../services/workflowEngine.service';
import workflowTriggerService from '../services/workflowTrigger.service';
import workflowTemplateService from '../services/workflowTemplate.service';

export class WorkflowController {
  /**
   * Create a new workflow
   * POST /api/workflows
   */
  async createWorkflow(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const workflow = await workflowService.createWorkflow(req.body, userId);
      res.status(201).json(workflow);
    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create workflow',
      });
    }
  }

  /**
   * Update a workflow
   * PUT /api/workflows/:id
   */
  async updateWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workflow = await workflowService.updateWorkflow(id, req.body);
      res.json(workflow);
    } catch (error) {
      console.error('Error updating workflow:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update workflow',
      });
    }
  }

  /**
   * Delete a workflow
   * DELETE /api/workflows/:id
   */
  async deleteWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await workflowService.deleteWorkflow(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to delete workflow',
      });
    }
  }

  /**
   * Get workflow by ID
   * GET /api/workflows/:id
   */
  async getWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workflow = await workflowService.getWorkflow(id);

      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      res.json(workflow);
    } catch (error) {
      console.error('Error getting workflow:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get workflow',
      });
    }
  }

  /**
   * List all workflows
   * GET /api/workflows
   */
  async listWorkflows(req: Request, res: Response) {
    try {
      const { isActive, triggerType, triggerEntity } = req.query;

      const filters: any = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (triggerType) filters.triggerType = triggerType;
      if (triggerEntity) filters.triggerEntity = triggerEntity;

      const workflows = await workflowService.listWorkflows(filters);
      res.json(workflows);
    } catch (error) {
      console.error('Error listing workflows:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list workflows',
      });
    }
  }

  /**
   * Activate a workflow
   * POST /api/workflows/:id/activate
   */
  async activateWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workflow = await workflowService.activateWorkflow(id);
      res.json(workflow);
    } catch (error) {
      console.error('Error activating workflow:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to activate workflow',
      });
    }
  }

  /**
   * Deactivate a workflow
   * POST /api/workflows/:id/deactivate
   */
  async deactivateWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const workflow = await workflowService.deactivateWorkflow(id);
      res.json(workflow);
    } catch (error) {
      console.error('Error deactivating workflow:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to deactivate workflow',
      });
    }
  }

  /**
   * Test a workflow
   * POST /api/workflows/:id/test
   */
  async testWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const testData = req.body;
      const execution = await workflowService.testWorkflow(id, testData);
      res.json(execution);
    } catch (error) {
      console.error('Error testing workflow:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to test workflow',
      });
    }
  }

  /**
   * Manually trigger a workflow
   * POST /api/workflows/:id/trigger
   */
  async triggerWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const executionId = await workflowTriggerService.triggerManually(id, data);
      res.json({ executionId });
    } catch (error) {
      console.error('Error triggering workflow:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to trigger workflow',
      });
    }
  }

  /**
   * Trigger workflow via webhook
   * POST /api/workflows/webhook/:id
   */
  async webhookTrigger(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const executionId = await workflowTriggerService.triggerViaWebhook(id, payload);
      res.json({ executionId });
    } catch (error) {
      console.error('Error triggering workflow via webhook:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to trigger workflow',
      });
    }
  }

  /**
   * Get workflow execution history
   * GET /api/workflows/:id/executions
   */
  async getExecutionHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const executions = await workflowEngineService.getExecutionHistory(id, limit);
      res.json(executions);
    } catch (error) {
      console.error('Error getting execution history:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get execution history',
      });
    }
  }

  /**
   * Get execution details
   * GET /api/workflows/executions/:executionId
   */
  async getExecutionDetails(req: Request, res: Response) {
    try {
      const { executionId } = req.params;
      const execution = await workflowEngineService.getExecutionDetails(executionId);

      if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }

      res.json(execution);
    } catch (error) {
      console.error('Error getting execution details:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get execution details',
      });
    }
  }

  /**
   * Get workflow templates
   * GET /api/workflows/templates
   */
  async getTemplates(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const templates = await workflowTemplateService.getTemplates(category as string);
      res.json(templates);
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get templates',
      });
    }
  }

  /**
   * Get template categories
   * GET /api/workflows/templates/categories
   */
  async getTemplateCategories(_req: Request, res: Response) {
    try {
      const categories = await workflowTemplateService.getCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error getting template categories:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get categories',
      });
    }
  }

  /**
   * Create workflow from template
   * POST /api/workflows/templates/:templateId/instantiate
   */
  async createFromTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.params;
      const customizations = req.body;
      const userId = (req as any).user?.id;

      const workflow = await workflowTemplateService.createFromTemplate(
        templateId,
        customizations,
        userId
      );

      res.status(201).json(workflow);
    } catch (error) {
      console.error('Error creating workflow from template:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create workflow from template',
      });
    }
  }
}

export default new WorkflowController();
