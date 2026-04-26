/**
 * Workflow Template Service
 * Manages workflow templates for common scenarios
 * Implements Requirement 7.8
 */

import { PrismaClient } from '@prisma/client';
import { WorkflowTemplate, WorkflowDefinition, TriggerType, StepType, ActionType } from '../types/workflow.types';
import workflowService from './workflow.service';

const prisma = new PrismaClient();

export class WorkflowTemplateService {
  /**
   * Initialize default workflow templates
   * Requirement 7.8: Pre-built workflow templates
   */
  async initializeDefaultTemplates() {
    const templates = this.getDefaultTemplates();

    for (const template of templates) {
      const existing = await prisma.workflowTemplateLibrary.findFirst({
        where: { name: template.name },
      });

      if (!existing) {
        await prisma.workflowTemplateLibrary.create({
          data: {
            name: template.name,
            description: template.description,
            category: template.category,
            icon: template.icon,
            templateData: template.templateData as any,
            isPublic: true,
          },
        });
      }
    }

    console.log(`Initialized ${templates.length} workflow templates`);
  }

  /**
   * Get default workflow templates
   */
  private getDefaultTemplates(): WorkflowTemplate[] {
    return [
      // Inventory: Low stock alert
      {
        name: 'Low Stock Alert',
        description: 'Send notification when product stock falls below minimum level',
        category: 'inventory',
        icon: '📦',
        templateData: {
          name: 'Low Stock Alert',
          description: 'Automatically notify when stock is low',
          isActive: false,
          trigger: {
            type: TriggerType.RECORD_UPDATED,
            entity: 'product',
          },
          steps: [
            {
              stepOrder: 1,
              stepType: StepType.CONDITION,
              condition: {
                field: 'stock',
                operator: 'less_than' as any,
                value: 'minStock',
              },
            },
            {
              stepOrder: 2,
              stepType: StepType.ACTION,
              action: {
                type: ActionType.SEND_NOTIFICATION,
                config: {
                  userIds: [],
                  title: 'Low Stock Alert',
                  message: 'Product {{name}} is running low on stock',
                  priority: 'high',
                },
              },
            },
          ],
        },
      },

      // Sales: New order notification
      {
        name: 'New Order Notification',
        description: 'Send notification when a new order is created',
        category: 'sales',
        icon: '🛒',
        templateData: {
          name: 'New Order Notification',
          description: 'Notify team when new order is placed',
          isActive: false,
          trigger: {
            type: TriggerType.RECORD_CREATED,
            entity: 'order',
          },
          steps: [
            {
              stepOrder: 1,
              stepType: StepType.ACTION,
              action: {
                type: ActionType.SEND_NOTIFICATION,
                config: {
                  userIds: [],
                  title: 'New Order',
                  message: 'New order {{orderNo}} received from {{customerName}}',
                  priority: 'medium',
                },
              },
            },
          ],
        },
      },

      // Finance: Invoice approval workflow
      {
        name: 'Invoice Approval Workflow',
        description: 'Automatically route invoices for approval based on amount',
        category: 'finance',
        icon: '💰',
        templateData: {
          name: 'Invoice Approval Workflow',
          description: 'Route high-value invoices for approval',
          isActive: false,
          trigger: {
            type: TriggerType.RECORD_CREATED,
            entity: 'invoice',
          },
          steps: [
            {
              stepOrder: 1,
              stepType: StepType.CONDITION,
              condition: {
                field: 'total',
                operator: 'greater_than' as any,
                value: 10000,
              },
            },
            {
              stepOrder: 2,
              stepType: StepType.ACTION,
              action: {
                type: ActionType.SEND_NOTIFICATION,
                config: {
                  userIds: [],
                  title: 'Invoice Approval Required',
                  message: 'Invoice {{invoiceNo}} requires approval (Amount: {{total}})',
                  priority: 'high',
                },
              },
            },
          ],
        },
      },

      // HR: Leave request notification
      {
        name: 'Leave Request Notification',
        description: 'Notify manager when employee submits leave request',
        category: 'hr',
        icon: '🏖️',
        templateData: {
          name: 'Leave Request Notification',
          description: 'Notify manager of new leave requests',
          isActive: false,
          trigger: {
            type: TriggerType.RECORD_CREATED,
            entity: 'leaveRequest',
          },
          steps: [
            {
              stepOrder: 1,
              stepType: StepType.ACTION,
              action: {
                type: ActionType.SEND_NOTIFICATION,
                config: {
                  userIds: [],
                  title: 'Leave Request',
                  message: 'Employee {{employeeName}} has requested leave from {{startDate}} to {{endDate}}',
                  priority: 'medium',
                },
              },
            },
          ],
        },
      },

      // CRM: Lead follow-up reminder
      {
        name: 'Lead Follow-up Reminder',
        description: 'Send reminder to follow up with leads after 3 days',
        category: 'crm',
        icon: '👤',
        templateData: {
          name: 'Lead Follow-up Reminder',
          description: 'Automated follow-up reminders for leads',
          isActive: false,
          trigger: {
            type: TriggerType.SCHEDULED,
            cronExpression: '0 9 * * *', // Daily at 9 AM
          },
          steps: [
            {
              stepOrder: 1,
              stepType: StepType.ACTION,
              action: {
                type: ActionType.SEND_NOTIFICATION,
                config: {
                  userIds: [],
                  title: 'Lead Follow-up',
                  message: 'Time to follow up with your leads',
                  priority: 'medium',
                },
              },
            },
          ],
        },
      },

      // Document: Expiring document alert
      {
        name: 'Expiring Document Alert',
        description: 'Alert when documents are about to expire',
        category: 'document',
        icon: '📄',
        templateData: {
          name: 'Expiring Document Alert',
          description: 'Notify before document expiration',
          isActive: false,
          trigger: {
            type: TriggerType.SCHEDULED,
            cronExpression: '0 8 * * MON', // Every Monday at 8 AM
          },
          steps: [
            {
              stepOrder: 1,
              stepType: StepType.ACTION,
              action: {
                type: ActionType.SEND_NOTIFICATION,
                config: {
                  userIds: [],
                  title: 'Document Expiration',
                  message: 'Some documents are expiring soon',
                  priority: 'high',
                },
              },
            },
          ],
        },
      },
    ];
  }

  /**
   * Get all workflow templates
   */
  async getTemplates(category?: string) {
    return await prisma.workflowTemplateLibrary.findMany({
      where: category ? { category, isPublic: true } : { isPublic: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string) {
    return await prisma.workflowTemplateLibrary.findUnique({
      where: { id },
    });
  }

  /**
   * Create workflow from template
   * Requirement 7.8: Template instantiation
   */
  async createFromTemplate(templateId: string, customizations?: Partial<WorkflowDefinition>, userId?: string) {
    const template = await this.getTemplate(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    // Merge template data with customizations
    const workflowData: WorkflowDefinition = {
      ...(template.templateData as any),
      ...customizations,
    };

    // Create workflow from template
    const workflow = await workflowService.createWorkflow(workflowData, userId);

    // Increment usage count
    await prisma.workflowTemplateLibrary.update({
      where: { id: templateId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    return workflow;
  }

  /**
   * Create custom template
   */
  async createTemplate(template: WorkflowTemplate) {
    return await prisma.workflowTemplateLibrary.create({
      data: {
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        templateData: template.templateData as any,
        isPublic: false,
      },
    });
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: Partial<WorkflowTemplate>) {
    return await prisma.workflowTemplateLibrary.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        icon: data.icon,
        templateData: data.templateData as any,
      },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string) {
    return await prisma.workflowTemplateLibrary.delete({
      where: { id },
    });
  }

  /**
   * Get template categories
   */
  async getCategories() {
    const templates = await prisma.workflowTemplateLibrary.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category'],
    });

    return templates.map((t) => t.category);
  }
}

export default new WorkflowTemplateService();
