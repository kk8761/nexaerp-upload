/**
 * Workflow Trigger Service
 * Handles workflow triggers: record events, schedules, webhooks
 * Implements Requirement 7.2
 */

import { PrismaClient } from '@prisma/client';
import * as cron from 'node-cron';
import { TriggerType } from '../types/workflow.types';
import workflowEngineService from './workflowEngine.service';

const prisma = new PrismaClient();

export class WorkflowTriggerService {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all active scheduled workflows
   */
  async initializeScheduledWorkflows() {
    const scheduledWorkflows = await prisma.workflow.findMany({
      where: {
        isActive: true,
        triggerType: TriggerType.SCHEDULED,
      },
    });

    for (const workflow of scheduledWorkflows) {
      if (workflow.cronExpression) {
        this.scheduleWorkflow(workflow.id, workflow.cronExpression);
      }
    }

    console.log(`Initialized ${scheduledWorkflows.length} scheduled workflows`);
  }

  /**
   * Schedule a workflow with cron expression
   * Requirement 7.2: Schedule triggers
   */
  scheduleWorkflow(workflowId: string, cronExpression: string) {
    // Stop existing task if any
    this.stopScheduledWorkflow(workflowId);

    try {
      const task = cron.schedule(cronExpression, async () => {
        console.log(`Executing scheduled workflow: ${workflowId}`);
        try {
          await workflowEngineService.executeWorkflow(workflowId, {
            trigger: 'scheduled',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error executing scheduled workflow ${workflowId}:`, error);
        }
      });

      this.scheduledTasks.set(workflowId, task);
      console.log(`Scheduled workflow ${workflowId} with cron: ${cronExpression}`);
    } catch (error) {
      console.error(`Error scheduling workflow ${workflowId}:`, error);
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
  }

  /**
   * Stop a scheduled workflow
   */
  stopScheduledWorkflow(workflowId: string) {
    const task = this.scheduledTasks.get(workflowId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(workflowId);
      console.log(`Stopped scheduled workflow: ${workflowId}`);
    }
  }

  /**
   * Trigger workflows on record creation
   * Requirement 7.2: Record event triggers
   */
  async triggerOnRecordCreated(entity: string, record: Record<string, unknown>) {
    const workflows = await prisma.workflow.findMany({
      where: {
        isActive: true,
        triggerType: TriggerType.RECORD_CREATED,
        triggerEntity: entity,
      },
    });

    for (const workflow of workflows) {
      try {
        await workflowEngineService.executeWorkflow(workflow.id, {
          trigger: 'record_created',
          entity,
          record,
        });
      } catch (error) {
        console.error(`Error executing workflow ${workflow.id}:`, error);
      }
    }
  }

  /**
   * Trigger workflows on record update
   * Requirement 7.2: Record event triggers
   */
  async triggerOnRecordUpdated(
    entity: string,
    recordId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ) {
    const workflows = await prisma.workflow.findMany({
      where: {
        isActive: true,
        triggerType: TriggerType.RECORD_UPDATED,
        triggerEntity: entity,
      },
    });

    for (const workflow of workflows) {
      try {
        await workflowEngineService.executeWorkflow(workflow.id, {
          trigger: 'record_updated',
          entity,
          recordId,
          oldData,
          newData,
          changes: this.getChangedFields(oldData, newData),
        });
      } catch (error) {
        console.error(`Error executing workflow ${workflow.id}:`, error);
      }
    }
  }

  /**
   * Trigger workflows on field change
   * Requirement 7.2: Field change triggers
   */
  async triggerOnFieldChanged(
    entity: string,
    recordId: string,
    field: string,
    oldValue: unknown,
    newValue: unknown
  ) {
    const workflows = await prisma.workflow.findMany({
      where: {
        isActive: true,
        triggerType: TriggerType.FIELD_CHANGED,
        triggerEntity: entity,
      },
    });

    for (const workflow of workflows) {
      // Check if this workflow watches this specific field
      if (workflow.triggerFields && workflow.triggerFields.includes(field)) {
        try {
          await workflowEngineService.executeWorkflow(workflow.id, {
            trigger: 'field_changed',
            entity,
            recordId,
            field,
            oldValue,
            newValue,
          });
        } catch (error) {
          console.error(`Error executing workflow ${workflow.id}:`, error);
        }
      }
    }
  }

  /**
   * Trigger workflow via webhook
   * Requirement 7.2: Webhook triggers
   */
  async triggerViaWebhook(workflowId: string, payload: Record<string, unknown>) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    if (workflow.triggerType !== TriggerType.WEBHOOK) {
      throw new Error('Workflow is not configured for webhook triggers');
    }

    return await workflowEngineService.executeWorkflow(workflowId, {
      trigger: 'webhook',
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Manually trigger a workflow
   */
  async triggerManually(workflowId: string, data: Record<string, unknown> = {}) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    return await workflowEngineService.executeWorkflow(workflowId, {
      trigger: 'manual',
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get changed fields between old and new data
   */
  private getChangedFields(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ): string[] {
    const changed: string[] = [];

    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changed.push(key);
      }
    }

    return changed;
  }

  /**
   * Cleanup - stop all scheduled tasks
   */
  cleanup() {
    for (const task of this.scheduledTasks.values()) {
      task.stop();
    }
    this.scheduledTasks.clear();
    console.log('Stopped all scheduled workflows');
  }
}

export default new WorkflowTriggerService();
