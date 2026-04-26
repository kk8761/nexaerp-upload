/**
 * Workflow Service
 * CRUD operations for workflows and workflow management
 */

import { PrismaClient } from '@prisma/client';
import { WorkflowDefinition, WorkflowValidationError } from '../types/workflow.types';
import workflowTriggerService from './workflowTrigger.service';

const prisma = new PrismaClient();

export class WorkflowService {
  /**
   * Create a new workflow
   * Requirement 7.1: Visual workflow designer
   */
  async createWorkflow(data: WorkflowDefinition, userId?: string) {
    // Validate workflow
    this.validateWorkflow(data);

    // Create workflow
    const workflow = await prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        triggerType: data.trigger.type,
        triggerEntity: data.trigger.entity,
        triggerFields: data.trigger.fields || [],
        cronExpression: data.trigger.cronExpression,
        webhookUrl: data.trigger.webhookUrl,
        createdBy: userId,
        steps: {
          create: data.steps.map((step) => ({
            stepOrder: step.stepOrder,
            stepType: step.stepType,
            conditionField: step.condition?.field,
            conditionOperator: step.condition?.operator,
            conditionValue: step.condition?.value?.toString(),
            logicalOperator: step.condition?.logicalOperator,
            actionType: step.action?.type,
            actionConfig: step.action?.config as any,
            retryOnFailure: step.action?.retryOnFailure || false,
            maxRetries: step.action?.maxRetries || 3,
          })),
        },
      },
      include: {
        steps: true,
      },
    });

    // If workflow is active and scheduled, schedule it
    if (workflow.isActive && workflow.triggerType === 'scheduled' && workflow.cronExpression) {
      workflowTriggerService.scheduleWorkflow(workflow.id, workflow.cronExpression);
    }

    return workflow;
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(id: string, data: Partial<WorkflowDefinition>) {
    // Validate workflow if steps are provided
    if (data.steps) {
      this.validateWorkflow(data as WorkflowDefinition);
    }

    // Get existing workflow
    const existing = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Workflow not found');
    }

    // Delete existing steps if new steps are provided
    if (data.steps) {
      await prisma.workflowStep.deleteMany({
        where: { workflowId: id },
      });
    }

    // Update workflow
    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        triggerType: data.trigger?.type,
        triggerEntity: data.trigger?.entity,
        triggerFields: data.trigger?.fields || [],
        cronExpression: data.trigger?.cronExpression,
        webhookUrl: data.trigger?.webhookUrl,
        steps: data.steps
          ? {
              create: data.steps.map((step) => ({
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                conditionField: step.condition?.field,
                conditionOperator: step.condition?.operator,
                conditionValue: step.condition?.value?.toString(),
                logicalOperator: step.condition?.logicalOperator,
                actionType: step.action?.type,
                actionConfig: step.action?.config as any,
                retryOnFailure: step.action?.retryOnFailure || false,
                maxRetries: step.action?.maxRetries || 3,
              })),
            }
          : undefined,
      },
      include: {
        steps: true,
      },
    });

    // Update scheduled task if needed
    if (existing.triggerType === 'scheduled' && existing.cronExpression) {
      workflowTriggerService.stopScheduledWorkflow(id);
    }

    if (workflow.isActive && workflow.triggerType === 'scheduled' && workflow.cronExpression) {
      workflowTriggerService.scheduleWorkflow(workflow.id, workflow.cronExpression);
    }

    return workflow;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string) {
    // Stop scheduled task if any
    workflowTriggerService.stopScheduledWorkflow(id);

    // Delete workflow (cascade will delete steps and executions)
    return await prisma.workflow.delete({
      where: { id },
    });
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string) {
    return await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }

  /**
   * List all workflows
   */
  async listWorkflows(filters?: {
    isActive?: boolean;
    triggerType?: string;
    triggerEntity?: string;
  }) {
    return await prisma.workflow.findMany({
      where: filters,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(id: string) {
    const workflow = await prisma.workflow.update({
      where: { id },
      data: { isActive: true },
    });

    // Schedule if it's a scheduled workflow
    if (workflow.triggerType === 'scheduled' && workflow.cronExpression) {
      workflowTriggerService.scheduleWorkflow(workflow.id, workflow.cronExpression);
    }

    return workflow;
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(id: string) {
    const workflow = await prisma.workflow.update({
      where: { id },
      data: { isActive: false },
    });

    // Stop scheduled task if any
    workflowTriggerService.stopScheduledWorkflow(id);

    return workflow;
  }

  /**
   * Validate workflow definition
   * Requirement 7.1: Workflow validation
   */
  private validateWorkflow(workflow: WorkflowDefinition) {
    if (!workflow.name || workflow.name.trim() === '') {
      throw new WorkflowValidationError('Workflow name is required');
    }

    if (!workflow.trigger || !workflow.trigger.type) {
      throw new WorkflowValidationError('Workflow trigger is required');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new WorkflowValidationError('Workflow must have at least one step');
    }

    // Validate trigger configuration
    if (workflow.trigger.type === 'scheduled' && !workflow.trigger.cronExpression) {
      throw new WorkflowValidationError('Cron expression is required for scheduled triggers');
    }

    if (
      ['record_created', 'record_updated', 'field_changed'].includes(workflow.trigger.type) &&
      !workflow.trigger.entity
    ) {
      throw new WorkflowValidationError('Entity is required for record triggers');
    }

    if (workflow.trigger.type === 'field_changed' && !workflow.trigger.fields?.length) {
      throw new WorkflowValidationError('Fields are required for field change triggers');
    }

    // Validate steps
    for (const step of workflow.steps) {
      if (step.stepType === 'condition') {
        if (!step.condition) {
          throw new WorkflowValidationError(
            `Condition is required for step ${step.stepOrder}`,
            step.stepOrder
          );
        }
        if (!step.condition.field || !step.condition.operator) {
          throw new WorkflowValidationError(
            `Condition field and operator are required for step ${step.stepOrder}`,
            step.stepOrder
          );
        }
      } else if (step.stepType === 'action') {
        if (!step.action) {
          throw new WorkflowValidationError(
            `Action is required for step ${step.stepOrder}`,
            step.stepOrder
          );
        }
        if (!step.action.type) {
          throw new WorkflowValidationError(
            `Action type is required for step ${step.stepOrder}`,
            step.stepOrder
          );
        }
        if (!step.action.config) {
          throw new WorkflowValidationError(
            `Action configuration is required for step ${step.stepOrder}`,
            step.stepOrder
          );
        }
      }
    }
  }

  /**
   * Test a workflow with sample data
   * Requirement 7.7: Workflow testing mode
   */
  async testWorkflow(id: string, testData: Record<string, unknown>) {
    const workflow = await this.getWorkflow(id);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Create a test execution (marked as test)
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: id,
        status: 'running',
        triggerData: {
          ...testData,
          _test: true,
        },
        startedAt: new Date(),
      },
    });

    return execution;
  }
}

export default new WorkflowService();
