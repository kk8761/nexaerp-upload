/**
 * Project Systems Controller
 * Handles HTTP requests for project management, resource allocation, cost tracking, EVM, and invoicing
 */

import { Request, Response } from 'express';
import projectService from '../services/project.service';

class ProjectController {
  /**
   * Create new project
   */
  async createProject(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const project = await projectService.createProject({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create project',
      });
    }
  }

  /**
   * Create project from template
   */
  async createProjectFromTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.params;
      const userId = (req as any).user?.id;
      const project = await projectService.createProjectFromTemplate(templateId, {
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create project from template',
      });
    }
  }

  /**
   * Get project by ID
   */
  async getProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const project = await projectService.getProject(projectId);
      
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get project',
      });
    }
  }

  /**
   * List projects
   */
  async listProjects(req: Request, res: Response) {
    try {
      const { status, projectType, projectManagerId, customerId } = req.query;
      const projects = await projectService.listProjects({
        status: status as string,
        projectType: projectType as string,
        projectManagerId: projectManagerId as string,
        customerId: customerId as string,
      });
      res.json(projects);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list projects',
      });
    }
  }

  /**
   * Update project status
   */
  async updateProjectStatus(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { status } = req.body;
      const userId = (req as any).user?.id;
      
      await projectService.updateProjectStatus(projectId, status, userId);
      res.json({ message: 'Project status updated successfully' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update project status',
      });
    }
  }

  /**
   * Allocate resources to project
   */
  async allocateResources(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { resources } = req.body;
      const userId = (req as any).user?.id;
      
      await projectService.allocateResources(projectId, resources, userId);
      res.json({ message: 'Resources allocated successfully' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to allocate resources',
      });
    }
  }

  /**
   * Analyze resource utilization
   */
  async analyzeResourceUtilization(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }
      
      const utilization = await projectService.analyzeResourceUtilization(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(utilization);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to analyze resource utilization',
      });
    }
  }

  /**
   * Track project costs
   */
  async trackProjectCosts(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      
      const cost = await projectService.trackProjectCosts(projectId, req.body, userId);
      res.status(201).json(cost);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to track project costs',
      });
    }
  }

  /**
   * Generate cost variance report
   */
  async generateCostVarianceReport(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const report = await projectService.generateCostVarianceReport(projectId);
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate cost variance report',
      });
    }
  }

  /**
   * Calculate earned value metrics
   */
  async calculateEarnedValue(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      
      const metrics = await projectService.calculateEarnedValue(projectId, userId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to calculate earned value',
      });
    }
  }

  /**
   * Update milestone status
   */
  async updateMilestoneStatus(req: Request, res: Response) {
    try {
      const { projectId, milestoneId } = req.params;
      const { status, completionPercentage } = req.body;
      const userId = (req as any).user?.id;
      
      await projectService.updateMilestoneStatus(
        projectId,
        milestoneId,
        status,
        completionPercentage,
        userId
      );
      res.json({ message: 'Milestone status updated successfully' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update milestone status',
      });
    }
  }

  /**
   * Generate milestone report
   */
  async generateMilestoneReport(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const report = await projectService.generateMilestoneReport(projectId);
      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate milestone report',
      });
    }
  }

  /**
   * Generate project invoice
   */
  async generateProjectInvoice(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      
      const invoice = await projectService.generateProjectInvoice(projectId, req.body, userId);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate project invoice',
      });
    }
  }

  /**
   * Forecast project completion
   */
  async forecastProjectCompletion(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const forecast = await projectService.forecastProjectCompletion(projectId);
      res.json(forecast);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to forecast project completion',
      });
    }
  }

  /**
   * Create project template
   */
  async createProjectTemplate(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const template = await projectService.createProjectTemplate({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create project template',
      });
    }
  }
}

export default new ProjectController();
