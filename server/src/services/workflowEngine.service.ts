/**
 * Workflow Engine Service
 * Core execution engine for workflow automation
 * Implements Requirements 7.4, 7.5
 */

import { PrismaClient } from '@prisma/client';
import {
  WorkflowExecutionContext,
  StepExecutionResult,
  ExecutionStatus,
  StepExecutionStatus,
  StepType,
  WorkflowExecutionError,
  ConditionOperator,
} from '../types/workflow.types';

const prisma = new PrismaClient();

export class WorkflowEngineService {
  /**
   * Execute a workflow
   * Requirement 7.4: Workflow execution with actions
   * Requirement 7.5: Error handling and retry logic
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, unknown>
  ): Promise<string> {
    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        status: ExecutionStatus.RUNNING,
        triggerData: triggerData as any,
        startedAt: new Date(),
      },
    });

    try {
      // Load workflow with steps
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
          },
        },
      });

      if (!workflow) {
        throw new WorkflowExecutionError('Workflow not found');
      }

      if (!workflow.isActive) {
        throw new WorkflowExecutionError('Workflow is not active');
      }

      // Create execution context
      const context: WorkflowExecutionContext = {
        workflowId,
        executionId: execution.id,
        triggerData,
        variables: {},
      };

      // Execute steps sequentially
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(step, context);

        // Create step execution record
        await prisma.workflowExecutionStep.create({
          data: {
            executionId: execution.id,
            stepOrder: step.stepOrder,
            stepType: step.stepType,
            status: stepResult.status,
            result: stepResult.result as any,
            errorMessage: stepResult.error,
            retryCount: stepResult.retryCount || 0,
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });

        // Handle step failure
        if (stepResult.status === StepExecutionStatus.FAILED) {
          // Update execution with error
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: ExecutionStatus.FAILED,
              errorMessage: stepResult.error,
              errorStep: step.stepOrder,
              completedAt: new Date(),
            },
          });

          throw new WorkflowExecutionError(
            stepResult.error || 'Step execution failed',
            step.stepOrder
          );
        }

        // Handle skipped step (condition not met)
        if (stepResult.status === StepExecutionStatus.SKIPPED) {
          continue;
        }
      }

      // Mark execution as completed
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      return execution.id;
    } catch (error) {
      // Update execution with error
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Execute a single workflow step
   * Handles conditions and actions with retry logic
   */
  private async executeStep(
    step: any,
    context: WorkflowExecutionContext
  ): Promise<StepExecutionResult> {
    try {
      if (step.stepType === StepType.CONDITION) {
        // Evaluate condition
        const conditionMet = this.evaluateCondition(
          step.conditionField,
          step.conditionOperator,
          step.conditionValue,
          context.triggerData
        );

        if (!conditionMet) {
          return {
            status: StepExecutionStatus.SKIPPED,
            result: { conditionMet: false },
          };
        }

        return {
          status: StepExecutionStatus.COMPLETED,
          result: { conditionMet: true },
        };
      } else if (step.stepType === StepType.ACTION) {
        // Execute action with retry logic
        return await this.executeActionWithRetry(
          step.actionType,
          step.actionConfig,
          context,
          step.retryOnFailure,
          step.maxRetries
        );
      }

      return {
        status: StepExecutionStatus.COMPLETED,
      };
    } catch (error) {
      return {
        status: StepExecutionStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute action with retry logic
   * Requirement 7.5: Retry mechanism for failed actions
   */
  private async executeActionWithRetry(
    actionType: string,
    actionConfig: any,
    context: WorkflowExecutionContext,
    retryOnFailure: boolean,
    maxRetries: number
  ): Promise<StepExecutionResult> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= (retryOnFailure ? maxRetries : 0)) {
      try {
        const result = await this.executeAction(actionType, actionConfig, context);
        return {
          status: StepExecutionStatus.COMPLETED,
          result,
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;

        if (!retryOnFailure || retryCount > maxRetries) {
          break;
        }

        // Wait before retry (exponential backoff)
        await this.sleep(Math.pow(2, retryCount) * 1000);
      }
    }

    return {
      status: StepExecutionStatus.FAILED,
      error: lastError?.message || 'Action execution failed',
      retryCount,
    };
  }

  /**
   * Execute a workflow action
   * Requirement 7.4: Action execution
   */
  private async executeAction(
    actionType: string,
    actionConfig: any,
    context: WorkflowExecutionContext
  ): Promise<unknown> {
    switch (actionType) {
      case 'send_email':
        return await this.executeSendEmailAction(actionConfig, context);
      case 'send_notification':
        return await this.executeSendNotificationAction(actionConfig, context);
      case 'create_record':
        return await this.executeCreateRecordAction(actionConfig, context);
      case 'update_record':
        return await this.executeUpdateRecordAction(actionConfig, context);
      case 'delete_record':
        return await this.executeDeleteRecordAction(actionConfig, context);
      case 'call_webhook':
        return await this.executeCallWebhookAction(actionConfig, context);
      default:
        throw new WorkflowExecutionError(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Evaluate a condition
   * Requirement 7.3: Condition evaluation
   */
  private evaluateCondition(
    field: string,
    operator: string,
    expectedValue: any,
    data: Record<string, unknown>
  ): boolean {
    const actualValue = this.getNestedValue(data, field);

    switch (operator) {
      case ConditionOperator.EQUALS:
        return actualValue == expectedValue;
      case ConditionOperator.NOT_EQUALS:
        return actualValue != expectedValue;
      case ConditionOperator.GREATER_THAN:
        return Number(actualValue) > Number(expectedValue);
      case ConditionOperator.LESS_THAN:
        return Number(actualValue) < Number(expectedValue);
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return Number(actualValue) >= Number(expectedValue);
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return Number(actualValue) <= Number(expectedValue);
      case ConditionOperator.CONTAINS:
        return String(actualValue).includes(String(expectedValue));
      case ConditionOperator.NOT_CONTAINS:
        return !String(actualValue).includes(String(expectedValue));
      case ConditionOperator.STARTS_WITH:
        return String(actualValue).startsWith(String(expectedValue));
      case ConditionOperator.ENDS_WITH:
        return String(actualValue).endsWith(String(expectedValue));
      case ConditionOperator.IS_EMPTY:
        return !actualValue || actualValue === '' || actualValue === null;
      case ConditionOperator.IS_NOT_EMPTY:
        return !!actualValue && actualValue !== '' && actualValue !== null;
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key: string) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Send email action
   */
  private async executeSendEmailAction(
    config: any,
    _context: WorkflowExecutionContext
  ): Promise<unknown> {
    // TODO: Implement email sending using nodemailer
    // For now, just log the action
    console.log('Send email action:', config);
    return { sent: true, recipients: config.to };
  }

  /**
   * Send notification action
   */
  private async executeSendNotificationAction(
    config: any,
    _context: WorkflowExecutionContext
  ): Promise<unknown> {
    // Create notifications for specified users
    const notifications = await Promise.all(
      config.userIds.map((userId: string) =>
        prisma.notification.create({
          data: {
            userId,
            title: config.title || 'Workflow Notification',
            message: config.message,
            type: 'workflow',
            isRead: false,
          },
        })
      )
    );

    return { created: notifications.length };
  }

  /**
   * Create record action
   */
  private async executeCreateRecordAction(
    config: any,
    _context: WorkflowExecutionContext
  ): Promise<unknown> {
    // Dynamically create record based on entity type
    const { entity, data } = config;

    // Get the Prisma model
    const model = (prisma as any)[entity];
    if (!model) {
      throw new WorkflowExecutionError(`Unknown entity: ${entity}`);
    }

    const record = await model.create({ data });
    return record;
  }

  /**
   * Update record action
   */
  private async executeUpdateRecordAction(
    config: any,
    _context: WorkflowExecutionContext
  ): Promise<unknown> {
    const { entity, recordId, data } = config;

    const model = (prisma as any)[entity];
    if (!model) {
      throw new WorkflowExecutionError(`Unknown entity: ${entity}`);
    }

    const record = await model.update({
      where: { id: recordId },
      data,
    });

    return record;
  }

  /**
   * Delete record action
   */
  private async executeDeleteRecordAction(
    config: any,
    _context: WorkflowExecutionContext
  ): Promise<unknown> {
    const { entity, recordId } = config;

    const model = (prisma as any)[entity];
    if (!model) {
      throw new WorkflowExecutionError(`Unknown entity: ${entity}`);
    }

    const record = await model.delete({
      where: { id: recordId },
    });

    return record;
  }

  /**
   * Call webhook action
   */
  private async executeCallWebhookAction(
    config: any,
    _context: WorkflowExecutionContext
  ): Promise<unknown> {
    const { url, method, headers, body } = config;

    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new WorkflowExecutionError(
        `Webhook call failed: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get workflow execution history
   * Requirement 7.6: Execution history tracking
   */
  async getExecutionHistory(workflowId: string, limit = 50) {
    return await prisma.workflowExecution.findMany({
      where: { workflowId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get execution details
   */
  async getExecutionDetails(executionId: string) {
    return await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });
  }
}

export default new WorkflowEngineService();
