/**
 * Project Systems Service
 * Business logic for project management, resource allocation, cost tracking, EVM, and invoicing
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  ProjectData,
  ProjectCost,
  ProjectCostData,
  ProjectEVM,
  ProjectEVMData,
  EVMMetrics,
  ProjectInvoice,
  ProjectInvoiceData,
  ProjectInvoiceLineItem,
  ProjectTemplate,
  ProjectTemplateData,
  ProjectPhase,
  Task,
  ResourceAllocation,
  Milestone,
  ResourceType,
} from '../models/ProjectSystems';

const prisma = new PrismaClient();

export class ProjectService {
  /**
   * Task 26.1: Create project management framework
   * Create a new project with budget, timeline, phases, and milestones
   */
  async createProject(data: {
    name: string;
    description?: string;
    projectType: string;
    startDate: Date;
    endDate: Date;
    budget: number;
    customerId?: string;
    customerName?: string;
    projectManagerId?: string;
    projectManagerName?: string;
    phases?: ProjectPhase[];
    milestones?: Milestone[];
    notes?: string;
    createdBy?: string;
  }): Promise<Project> {
    // Generate project number
    const projectNumber = await this.generateProjectNumber();

    // Initialize phases and milestones
    const phases = data.phases || [];
    const milestones = data.milestones || [];

    const projectRecord = await prisma.project.create({
      data: {
        id: uuidv4(),
        projectNumber,
        name: data.name,
        description: data.description,
        projectType: data.projectType,
        status: 'planning',
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget,
        actualCost: 0,
        phases: phases as any,
        resources: [],
        milestones: milestones as any,
        customerId: data.customerId,
        customerName: data.customerName,
        projectManagerId: data.projectManagerId,
        projectManagerName: data.projectManagerName,
        notes: data.notes,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });

    return new Project({
      ...projectRecord,
      phases: projectRecord.phases as ProjectPhase[],
      resources: projectRecord.resources as ResourceAllocation[],
      milestones: projectRecord.milestones as Milestone[],
      createdAt: projectRecord.createdAt,
      updatedAt: projectRecord.updatedAt,
    });
  }

  /**
   * Create project from template
   */
  async createProjectFromTemplate(
    templateId: string,
    data: {
      name: string;
      startDate: Date;
      budget: number;
      customerId?: string;
      customerName?: string;
      projectManagerId?: string;
      projectManagerName?: string;
      createdBy?: string;
    }
  ): Promise<Project> {
    const template = await prisma.projectTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Project template not found');
    }

    // Calculate end date based on template duration
    const endDate = new Date(data.startDate);
    endDate.setDate(endDate.getDate() + template.defaultDuration);

    // Convert template phases and milestones to project structure
    const phases = (template.phases as any[]).map((phase: any) => ({
      ...phase,
      tasks: [],
    }));

    const milestones = (template.milestones as any[]).map((milestone: any) => ({
      ...milestone,
      id: uuidv4(),
      status: 'pending',
      completionPercentage: 0,
    }));

    return this.createProject({
      ...data,
      projectType: template.projectType,
      endDate,
      phases,
      milestones,
    });
  }

  /**
   * Task 26.2: Implement resource allocation
   * Allocate human, equipment, and material resources to a project
   */
  async allocateResources(
    projectId: string,
    resources: ResourceAllocation[],
    userId?: string
  ): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check for resource conflicts
    await this.checkResourceConflicts(resources);

    // Add resources to project
    const existingResources = (project.resources as ResourceAllocation[]) || [];
    const updatedResources = [...existingResources, ...resources];

    await prisma.project.update({
      where: { id: projectId },
      data: {
        resources: updatedResources as any,
        updatedBy: userId,
      },
    });
  }

  /**
   * Check for resource availability conflicts
   */
  private async checkResourceConflicts(resources: ResourceAllocation[]): Promise<void> {
    // Get all projects with overlapping dates
    const allProjects = await prisma.project.findMany({
      where: {
        status: { in: ['planning', 'active'] },
      },
    });

    for (const resource of resources) {
      for (const project of allProjects) {
        const projectResources = project.resources as ResourceAllocation[];
        
        for (const existingResource of projectResources) {
          if (existingResource.resourceId === resource.resourceId) {
            // Check date overlap
            const hasOverlap =
              resource.startDate <= existingResource.endDate &&
              resource.endDate >= existingResource.startDate;

            if (hasOverlap && resource.resourceType === 'human') {
              // Check if allocation exceeds 100%
              const totalAllocation = existingResource.allocation + resource.allocation;
              if (totalAllocation > 100) {
                throw new Error(
                  `Resource conflict: ${resource.resourceName} is over-allocated (${totalAllocation}%)`
                );
              }
            }
          }
        }
      }
    }
  }

  /**
   * Generate resource utilization report
   */
  async analyzeResourceUtilization(startDate: Date, endDate: Date): Promise<any> {
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['planning', 'active'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    const resourceUtilization: Record<string, any> = {};

    for (const project of projects) {
      const resources = project.resources as ResourceAllocation[];
      
      for (const resource of resources) {
        if (!resourceUtilization[resource.resourceId]) {
          resourceUtilization[resource.resourceId] = {
            resourceId: resource.resourceId,
            resourceName: resource.resourceName,
            resourceType: resource.resourceType,
            totalAllocation: 0,
            projects: [],
          };
        }

        resourceUtilization[resource.resourceId].totalAllocation += resource.allocation;
        resourceUtilization[resource.resourceId].projects.push({
          projectId: project.id,
          projectName: project.name,
          allocation: resource.allocation,
          startDate: resource.startDate,
          endDate: resource.endDate,
        });
      }
    }

    return Object.values(resourceUtilization);
  }

  /**
   * Task 26.3: Implement project cost tracking
   * Track actual costs against budget
   */
  async trackProjectCosts(
    projectId: string,
    costData: {
      costType: 'labor' | 'material' | 'equipment' | 'overhead' | 'other';
      description: string;
      amount: number;
      date: Date;
      phaseId?: string;
      taskId?: string;
      resourceId?: string;
      invoiceId?: string;
      notes?: string;
    },
    userId?: string
  ): Promise<ProjectCost> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Create cost record
    const costRecord = await prisma.projectCost.create({
      data: {
        id: uuidv4(),
        projectId,
        costType: costData.costType,
        description: costData.description,
        amount: costData.amount,
        date: costData.date,
        phaseId: costData.phaseId,
        taskId: costData.taskId,
        resourceId: costData.resourceId,
        invoiceId: costData.invoiceId,
        notes: costData.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Update project actual cost
    await prisma.project.update({
      where: { id: projectId },
      data: {
        actualCost: project.actualCost + costData.amount,
        updatedBy: userId,
      },
    });

    return new ProjectCost({
      ...costRecord,
      createdAt: costRecord.createdAt,
      updatedAt: costRecord.updatedAt,
    });
  }

  /**
   * Generate cost variance report
   */
  async generateCostVarianceReport(projectId: string): Promise<any> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        costs: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const costsByType: Record<string, number> = {};
    for (const cost of project.costs) {
      if (!costsByType[cost.costType]) {
        costsByType[cost.costType] = 0;
      }
      costsByType[cost.costType] += cost.amount;
    }

    const variance = project.budget - project.actualCost;
    const variancePercentage = (variance / project.budget) * 100;

    return {
      projectId: project.id,
      projectName: project.name,
      budget: project.budget,
      actualCost: project.actualCost,
      variance,
      variancePercentage,
      status: variance >= 0 ? 'under_budget' : 'over_budget',
      costsByType,
    };
  }

  /**
   * Task 26.4: Implement Earned Value Management (EVM)
   * Calculate EVM metrics including CPI and SPI
   */
  async calculateEarnedValue(projectId: string, userId?: string): Promise<EVMMetrics> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        costs: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Calculate completion percentage based on tasks
    const completionPercentage = this.calculateProjectCompletion(project);

    // Calculate EVM metrics
    const budgetAtCompletion = project.budget; // BAC
    const actualCost = project.actualCost; // AC
    const earnedValue = (completionPercentage / 100) * budgetAtCompletion; // EV
    
    // Calculate planned value based on schedule
    const plannedValue = this.calculatePlannedValue(project); // PV

    // Calculate variances
    const costVariance = earnedValue - actualCost; // CV = EV - AC
    const scheduleVariance = earnedValue - plannedValue; // SV = EV - PV

    // Calculate performance indices
    const costPerformanceIndex = actualCost > 0 ? earnedValue / actualCost : 1; // CPI = EV / AC
    const schedulePerformanceIndex = plannedValue > 0 ? earnedValue / plannedValue : 1; // SPI = EV / PV

    // Calculate estimates
    const estimateAtCompletion = costPerformanceIndex > 0 ? budgetAtCompletion / costPerformanceIndex : budgetAtCompletion; // EAC = BAC / CPI
    const estimateToComplete = estimateAtCompletion - actualCost; // ETC = EAC - AC
    const varianceAtCompletion = budgetAtCompletion - estimateAtCompletion; // VAC = BAC - EAC

    const metrics: EVMMetrics = {
      plannedValue,
      earnedValue,
      actualCost,
      costVariance,
      scheduleVariance,
      costPerformanceIndex,
      schedulePerformanceIndex,
      estimateAtCompletion,
      estimateToComplete,
      varianceAtCompletion,
      budgetAtCompletion,
    };

    // Save EVM report
    await prisma.projectEVM.create({
      data: {
        id: uuidv4(),
        projectId,
        reportDate: new Date(),
        metrics: metrics as any,
        completionPercentage,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return metrics;
  }

  /**
   * Calculate project completion percentage based on tasks
   */
  private calculateProjectCompletion(project: any): number {
    const phases = project.phases as ProjectPhase[];
    
    if (!phases || phases.length === 0) {
      return 0;
    }

    let totalTasks = 0;
    let completedTasks = 0;
    let totalProgress = 0;

    for (const phase of phases) {
      if (phase.tasks && phase.tasks.length > 0) {
        for (const task of phase.tasks) {
          totalTasks++;
          totalProgress += task.progress || 0;
          if (task.status === 'completed') {
            completedTasks++;
          }
        }
      }
    }

    if (totalTasks === 0) {
      return 0;
    }

    // Use average of task progress
    return totalProgress / totalTasks;
  }

  /**
   * Calculate planned value based on project schedule
   */
  private calculatePlannedValue(project: any): number {
    const now = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const budget = project.budget;

    // If project hasn't started, PV = 0
    if (now < startDate) {
      return 0;
    }

    // If project is complete, PV = BAC
    if (now >= endDate) {
      return budget;
    }

    // Calculate PV based on linear schedule
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    const scheduledPercentage = (elapsedDuration / totalDuration) * 100;

    return (scheduledPercentage / 100) * budget;
  }

  /**
   * Task 26.5: Implement milestone tracking
   * Track milestone completion status and deliverables
   */
  async updateMilestoneStatus(
    projectId: string,
    milestoneId: string,
    status: string,
    completionPercentage: number,
    userId?: string
  ): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const milestones = project.milestones as Milestone[];
    const milestoneIndex = milestones.findIndex((m) => m.id === milestoneId);

    if (milestoneIndex === -1) {
      throw new Error('Milestone not found');
    }

    milestones[milestoneIndex].status = status as any;
    milestones[milestoneIndex].completionPercentage = completionPercentage;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        milestones: milestones as any,
        updatedBy: userId,
      },
    });
  }

  /**
   * Generate milestone report
   */
  async generateMilestoneReport(projectId: string): Promise<any> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const milestones = project.milestones as Milestone[];
    const now = new Date();

    const report = {
      projectId: project.id,
      projectName: project.name,
      totalMilestones: milestones.length,
      completed: milestones.filter((m) => m.status === 'completed').length,
      inProgress: milestones.filter((m) => m.status === 'in_progress').length,
      pending: milestones.filter((m) => m.status === 'pending').length,
      delayed: milestones.filter((m) => m.status === 'delayed' || (m.status === 'pending' && new Date(m.date) < now)).length,
      milestones: milestones.map((m) => ({
        id: m.id,
        name: m.name,
        date: m.date,
        status: m.status,
        completionPercentage: m.completionPercentage,
        deliverables: m.deliverables,
        isOverdue: new Date(m.date) < now && m.status !== 'completed',
      })),
    };

    return report;
  }

  /**
   * Task 26.6: Implement project invoicing
   * Generate invoices based on time and materials or milestones
   */
  async generateProjectInvoice(
    projectId: string,
    data: {
      billingType: 'time_and_materials' | 'milestone' | 'fixed_price';
      startDate: Date;
      endDate: Date;
      milestoneId?: string;
      taxRate?: number;
      dueInDays?: number;
    },
    userId?: string
  ): Promise<ProjectInvoice> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        costs: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.customerId || !project.customerName) {
      throw new Error('Project must have a customer to generate invoice');
    }

    let lineItems: ProjectInvoiceLineItem[] = [];
    let subtotal = 0;

    if (data.billingType === 'time_and_materials') {
      // Bill based on actual costs incurred
      const costs = project.costs.filter(
        (c) => c.date >= data.startDate && c.date <= data.endDate
      );

      const costsByType: Record<string, number> = {};
      for (const cost of costs) {
        if (!costsByType[cost.costType]) {
          costsByType[cost.costType] = 0;
        }
        costsByType[cost.costType] += cost.amount;
      }

      lineItems = Object.entries(costsByType).map(([type, amount]) => ({
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} costs`,
        quantity: 1,
        unitPrice: amount,
        amount,
      }));

      subtotal = costs.reduce((sum, c) => sum + c.amount, 0);
    } else if (data.billingType === 'milestone') {
      // Bill based on milestone completion
      if (!data.milestoneId) {
        throw new Error('Milestone ID required for milestone billing');
      }

      const milestones = project.milestones as Milestone[];
      const milestone = milestones.find((m) => m.id === data.milestoneId);

      if (!milestone) {
        throw new Error('Milestone not found');
      }

      if (milestone.status !== 'completed') {
        throw new Error('Milestone must be completed to generate invoice');
      }

      // Calculate milestone value as percentage of total budget
      const milestoneValue = project.budget / milestones.length;

      lineItems = [
        {
          description: `Milestone: ${milestone.name}`,
          quantity: 1,
          unitPrice: milestoneValue,
          amount: milestoneValue,
          milestoneId: milestone.id,
        },
      ];

      subtotal = milestoneValue;
    } else if (data.billingType === 'fixed_price') {
      // Bill fixed amount
      lineItems = [
        {
          description: `Project: ${project.name}`,
          quantity: 1,
          unitPrice: project.budget,
          amount: project.budget,
        },
      ];

      subtotal = project.budget;
    }

    const taxRate = data.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const invoiceNumber = await this.generateInvoiceNumber();
    const dueDate = new Date(data.endDate);
    dueDate.setDate(dueDate.getDate() + (data.dueInDays || 30));

    const invoiceRecord = await prisma.projectInvoice.create({
      data: {
        id: uuidv4(),
        invoiceNumber,
        projectId,
        customerId: project.customerId,
        customerName: project.customerName,
        billingType: data.billingType,
        startDate: data.startDate,
        endDate: data.endDate,
        subtotal,
        taxAmount,
        total,
        status: 'draft',
        dueDate,
        lineItems: lineItems as any,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return new ProjectInvoice({
      ...invoiceRecord,
      lineItems: invoiceRecord.lineItems as ProjectInvoiceLineItem[],
      createdAt: invoiceRecord.createdAt,
      updatedAt: invoiceRecord.updatedAt,
    });
  }

  /**
   * Task 26.7: Implement project forecasting
   * Forecast project completion date and final cost
   */
  async forecastProjectCompletion(projectId: string): Promise<any> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        costs: true,
        evmReports: {
          orderBy: { reportDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const completionPercentage = this.calculateProjectCompletion(project);
    const now = new Date();
    const startDate = new Date(project.startDate);
    const plannedEndDate = new Date(project.endDate);

    // Calculate elapsed time
    const elapsedDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Forecast completion date based on current progress
    let forecastedEndDate: Date;
    let forecastedDuration: number;

    if (completionPercentage > 0) {
      const estimatedTotalDays = (elapsedDays / completionPercentage) * 100;
      forecastedDuration = Math.ceil(estimatedTotalDays);
      forecastedEndDate = new Date(startDate);
      forecastedEndDate.setDate(forecastedEndDate.getDate() + forecastedDuration);
    } else {
      forecastedEndDate = plannedEndDate;
      forecastedDuration = Math.floor((plannedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate schedule variance in days
    const scheduleVarianceDays = Math.floor((forecastedEndDate.getTime() - plannedEndDate.getTime()) / (1000 * 60 * 60 * 24));

    // Forecast final cost using EVM
    let forecastedFinalCost = project.budget;
    let costPerformanceIndex = 1;

    if (project.evmReports.length > 0) {
      const latestEVM = project.evmReports[0];
      const metrics = latestEVM.metrics as EVMMetrics;
      forecastedFinalCost = metrics.estimateAtCompletion;
      costPerformanceIndex = metrics.costPerformanceIndex;
    } else if (completionPercentage > 0) {
      // Simple forecast based on current spending rate
      forecastedFinalCost = (project.actualCost / completionPercentage) * 100;
    }

    const costVariance = project.budget - forecastedFinalCost;

    return {
      projectId: project.id,
      projectName: project.name,
      currentStatus: {
        completionPercentage,
        actualCost: project.actualCost,
        elapsedDays,
      },
      forecast: {
        forecastedEndDate,
        forecastedDuration,
        scheduleVarianceDays,
        scheduleStatus: scheduleVarianceDays <= 0 ? 'on_schedule' : 'delayed',
        forecastedFinalCost,
        costVariance,
        costStatus: costVariance >= 0 ? 'under_budget' : 'over_budget',
        costPerformanceIndex,
      },
      plannedEndDate,
      budget: project.budget,
    };
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<Project | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        costs: true,
        evmReports: {
          orderBy: { reportDate: 'desc' },
          take: 5,
        },
        invoices: true,
      },
    });

    if (!project) {
      return null;
    }

    return new Project({
      ...project,
      phases: project.phases as ProjectPhase[],
      resources: project.resources as ResourceAllocation[],
      milestones: project.milestones as Milestone[],
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  }

  /**
   * List projects with filters
   */
  async listProjects(filters?: {
    status?: string;
    projectType?: string;
    projectManagerId?: string;
    customerId?: string;
  }): Promise<Project[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.projectType) {
      where.projectType = filters.projectType;
    }
    if (filters?.projectManagerId) {
      where.projectManagerId = filters.projectManagerId;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return projects.map(
      (p) =>
        new Project({
          ...p,
          phases: p.phases as ProjectPhase[],
          resources: p.resources as ResourceAllocation[],
          milestones: p.milestones as Milestone[],
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })
    );
  }

  /**
   * Update project status
   */
  async updateProjectStatus(projectId: string, status: string, userId?: string): Promise<void> {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status,
        updatedBy: userId,
      },
    });
  }

  /**
   * Create project template
   */
  async createProjectTemplate(data: {
    name: string;
    description?: string;
    projectType: string;
    defaultDuration: number;
    phases: Omit<ProjectPhase, 'tasks'>[];
    milestones: Omit<Milestone, 'id' | 'status' | 'completionPercentage'>[];
    createdBy?: string;
  }): Promise<ProjectTemplate> {
    const templateRecord = await prisma.projectTemplate.create({
      data: {
        id: uuidv4(),
        name: data.name,
        description: data.description,
        projectType: data.projectType,
        defaultDuration: data.defaultDuration,
        phases: data.phases as any,
        milestones: data.milestones as any,
        isActive: true,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
    });

    return new ProjectTemplate({
      ...templateRecord,
      phases: templateRecord.phases as Omit<ProjectPhase, 'tasks'>[],
      milestones: templateRecord.milestones as Omit<Milestone, 'id' | 'status' | 'completionPercentage'>[],
      createdAt: templateRecord.createdAt,
      updatedAt: templateRecord.updatedAt,
    });
  }

  /**
   * Generate unique project number
   */
  private async generateProjectNumber(): Promise<string> {
    const count = await prisma.project.count();
    return `PRJ-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const count = await prisma.projectInvoice.count();
    return `PINV-${String(count + 1).padStart(6, '0')}`;
  }
}

export default new ProjectService();
