/**
 * Approval Workflow Service
 * Comprehensive approval workflow framework with multi-level hierarchies,
 * delegation, and notifications
 * 
 * Requirements: 5.5 - Multi-level approval hierarchies
 * Task 17.1: Create approval workflow framework
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ApprovalWorkflowConfig {
  name: string;
  description?: string;
  module: string;
  entityType: string;
  steps: ApprovalStepConfig[];
  conditions?: ApprovalCondition[];
}

export interface ApprovalStepConfig {
  step: number;
  name: string;
  approverRoles?: string[];
  approverUserIds?: string[];
  requiredApprovals?: number; // Number of approvals needed (for parallel approvals)
  allowDelegation?: boolean;
  autoApproveCondition?: string; // JSON condition for auto-approval
  escalationTimeHours?: number; // Hours before escalation
  escalationTo?: string[]; // User IDs or roles to escalate to
}

export interface ApprovalCondition {
  field: string;
  operator: 'equals' | 'greaterThan' | 'lessThan' | 'contains';
  value: any;
}

export interface ApprovalDelegation {
  fromUserId: string;
  toUserId: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export class ApprovalService {
  /**
   * Create a new approval workflow template
   * Requirement 5.5: Multi-level approval hierarchies
   */
  async createApprovalWorkflow(config: ApprovalWorkflowConfig): Promise<any> {
    // Validate workflow configuration
    this.validateWorkflowConfig(config);

    // Create workflow template
    const workflow = await prisma.workflowTemplate.create({
      data: {
        name: config.name,
        description: config.description,
        module: config.module,
        steps: config.steps as any,
        isActive: true,
      },
    });

    return workflow;
  }

  /**
   * Submit an entity for approval
   * Creates an approval request and notifies approvers
   */
  async submitForApproval(
    entityType: string,
    entityId: string,
    requesterId: string,
    workflowName?: string
  ): Promise<any> {
    // Find appropriate workflow
    let workflow;
    
    if (workflowName) {
      workflow = await prisma.workflowTemplate.findFirst({
        where: { name: workflowName, isActive: true },
      });
    } else {
      // Find default workflow for entity type
      workflow = await prisma.workflowTemplate.findFirst({
        where: { 
          module: entityType,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!workflow) {
      throw new Error(`No approval workflow found for ${entityType}`);
    }

    // Create approval request
    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        entityType,
        entityId,
        requesterId,
        workflowId: workflow.id,
        status: 'pending',
        currentStep: 1,
      },
      include: {
        workflow: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notifications to first-level approvers
    await this.notifyApprovers(approvalRequest);

    return approvalRequest;
  }

  /**
   * Process an approval decision
   * Handles approval, rejection, and delegation
   */
  async processApproval(
    approvalRequestId: string,
    approverId: string,
    action: 'approved' | 'rejected' | 'delegated',
    comments?: string,
    delegateToUserId?: string
  ): Promise<any> {
    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { 
        workflow: true,
        requester: true,
      },
    });

    if (!approvalRequest) {
      throw new Error('Approval request not found');
    }

    if (approvalRequest.status !== 'pending') {
      throw new Error(`Approval request is ${approvalRequest.status}, cannot process`);
    }

    // Handle delegation
    if (action === 'delegated') {
      if (!delegateToUserId) {
        throw new Error('Delegate user ID is required for delegation');
      }
      return await this.delegateApproval(approvalRequestId, approverId, delegateToUserId, comments);
    }

    // Record approval history
    await prisma.approvalHistory.create({
      data: {
        requestId: approvalRequestId,
        approverId,
        action,
        comments,
        step: approvalRequest.currentStep,
      },
    });

    // Handle rejection
    if (action === 'rejected') {
      await prisma.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { status: 'rejected' },
      });

      // Notify requester of rejection
      await this.notifyRejection(approvalRequest, approverId, comments);

      return { status: 'rejected', approvalRequest };
    }

    // Handle approval - check if more steps needed
    const steps = approvalRequest.workflow.steps as any[];
    const currentStepConfig = steps[approvalRequest.currentStep - 1];
    
    // Check if current step requires multiple approvals
    const requiredApprovals = currentStepConfig?.requiredApprovals || 1;
    const currentStepApprovals = await prisma.approvalHistory.count({
      where: {
        requestId: approvalRequestId,
        step: approvalRequest.currentStep,
        action: 'approved',
      },
    });

    if (currentStepApprovals < requiredApprovals) {
      // Still need more approvals for this step
      return { 
        status: 'pending', 
        currentStep: approvalRequest.currentStep,
        approvalsReceived: currentStepApprovals,
        approvalsRequired: requiredApprovals,
      };
    }

    // Move to next step or complete
    const nextStep = approvalRequest.currentStep + 1;
    
    if (nextStep > steps.length) {
      // Final approval - complete the request
      await prisma.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { status: 'approved' },
      });

      // Notify requester of approval
      await this.notifyApproval(approvalRequest, approverId);

      return { status: 'approved', approvalRequest };
    } else {
      // Move to next approval step
      await prisma.approvalRequest.update({
        where: { id: approvalRequestId },
        data: { currentStep: nextStep },
      });

      // Notify next level approvers
      await this.notifyApprovers({
        ...approvalRequest,
        currentStep: nextStep,
      });

      return { 
        status: 'pending', 
        currentStep: nextStep,
        totalSteps: steps.length,
      };
    }
  }

  /**
   * Delegate approval to another user
   */
  async delegateApproval(
    approvalRequestId: string,
    fromUserId: string,
    toUserId: string,
    reason?: string
  ): Promise<any> {
    // Record delegation in approval history
    await prisma.approvalHistory.create({
      data: {
        requestId: approvalRequestId,
        approverId: fromUserId,
        action: 'delegated',
        comments: `Delegated to user ${toUserId}. Reason: ${reason || 'Not specified'}`,
        step: (await prisma.approvalRequest.findUnique({ 
          where: { id: approvalRequestId } 
        }))!.currentStep,
      },
    });

    // Notify delegated user
    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { workflow: true, requester: true },
    });

    if (approvalRequest) {
      await this.notifyDelegation(approvalRequest, fromUserId, toUserId, reason);
    }

    return { status: 'delegated', toUserId };
  }

  /**
   * Get approval request details with history
   */
  async getApprovalRequest(approvalRequestId: string): Promise<any> {
    return await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: {
        workflow: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        history: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(userId: string): Promise<any[]> {
    // Get user's roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const roleNames = userRoles.map(ur => ur.role.name);

    // Get all pending approval requests
    const pendingRequests = await prisma.approvalRequest.findMany({
      where: { status: 'pending' },
      include: {
        workflow: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        history: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Filter requests where user is an approver at current step
    const userApprovals = pendingRequests.filter(request => {
      const steps = request.workflow.steps as any[];
      const currentStepConfig = steps[request.currentStep - 1];
      
      if (!currentStepConfig) return false;

      // Check if user is in approver list
      const approverUserIds = currentStepConfig.approverUserIds || [];
      const approverRoles = currentStepConfig.approverRoles || [];

      return (
        approverUserIds.includes(userId) ||
        approverRoles.some((role: string) => roleNames.includes(role))
      );
    });

    return userApprovals;
  }

  /**
   * Get approval history for an entity
   */
  async getApprovalHistory(entityType: string, entityId: string): Promise<any[]> {
    const requests = await prisma.approvalRequest.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        workflow: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        history: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  /**
   * Cancel an approval request
   */
  async cancelApprovalRequest(approvalRequestId: string, userId: string, reason?: string): Promise<any> {
    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
    });

    if (!approvalRequest) {
      throw new Error('Approval request not found');
    }

    if (approvalRequest.requesterId !== userId) {
      throw new Error('Only the requester can cancel an approval request');
    }

    if (approvalRequest.status !== 'pending') {
      throw new Error('Can only cancel pending approval requests');
    }

    // Update status
    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: 'cancelled' },
    });

    // Record cancellation in history
    await prisma.approvalHistory.create({
      data: {
        requestId: approvalRequestId,
        approverId: userId,
        action: 'cancelled',
        comments: reason || 'Cancelled by requester',
        step: approvalRequest.currentStep,
      },
    });

    return { status: 'cancelled' };
  }

  /**
   * Validate workflow configuration
   */
  private validateWorkflowConfig(config: ApprovalWorkflowConfig): void {
    if (!config.name || config.name.trim() === '') {
      throw new Error('Workflow name is required');
    }

    if (!config.module || config.module.trim() === '') {
      throw new Error('Workflow module is required');
    }

    if (!config.entityType || config.entityType.trim() === '') {
      throw new Error('Entity type is required');
    }

    if (!config.steps || config.steps.length === 0) {
      throw new Error('Workflow must have at least one approval step');
    }

    // Validate each step
    config.steps.forEach((step, index) => {
      if (step.step !== index + 1) {
        throw new Error(`Step numbers must be sequential. Expected ${index + 1}, got ${step.step}`);
      }

      if (!step.name || step.name.trim() === '') {
        throw new Error(`Step ${step.step} must have a name`);
      }

      if ((!step.approverRoles || step.approverRoles.length === 0) && 
          (!step.approverUserIds || step.approverUserIds.length === 0)) {
        throw new Error(`Step ${step.step} must have at least one approver role or user`);
      }
    });
  }

  /**
   * Send notifications to approvers at current step
   */
  private async notifyApprovers(approvalRequest: any): Promise<void> {
    const steps = approvalRequest.workflow.steps as any[];
    const currentStepConfig = steps[approvalRequest.currentStep - 1];

    if (!currentStepConfig) return;

    // Get approver user IDs
    const approverUserIds = currentStepConfig.approverUserIds || [];
    
    // Get users with approver roles
    const approverRoles = currentStepConfig.approverRoles || [];
    const roleUsers = await prisma.userRole.findMany({
      where: {
        role: {
          name: { in: approverRoles },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const roleUserIds = roleUsers.map(ru => ru.user.id);
    const allApproverIds = [...new Set([...approverUserIds, ...roleUserIds])];

    // Create notifications for each approver
    for (const approverId of allApproverIds) {
      await prisma.notification.create({
        data: {
          storeId: 'system',
          type: 'approval_request',
          priority: 'high',
          title: `Approval Required: ${approvalRequest.entityType}`,
          message: `${approvalRequest.requester.name} has submitted ${approvalRequest.entityType} ${approvalRequest.entityId} for your approval (Step ${approvalRequest.currentStep} of ${steps.length})`,
          icon: '✅',
          targetRoles: ['all'],
          actionLabel: 'Review',
          actionUrl: `/approvals/${approvalRequest.id}`,
          actionData: {
            approvalRequestId: approvalRequest.id,
            entityType: approvalRequest.entityType,
            entityId: approvalRequest.entityId,
          },
        },
      });
    }
  }

  /**
   * Notify requester of approval
   */
  private async notifyApproval(approvalRequest: any, approverId: string): Promise<void> {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        storeId: 'system',
        type: 'approval_approved',
        priority: 'medium',
        title: `Approval Completed`,
        message: `Your ${approvalRequest.entityType} ${approvalRequest.entityId} has been approved by ${approver?.name || 'approver'}`,
        icon: '✅',
        targetRoles: ['all'],
        actionLabel: 'View',
        actionUrl: `/${approvalRequest.entityType}/${approvalRequest.entityId}`,
      },
    });
  }

  /**
   * Notify requester of rejection
   */
  private async notifyRejection(approvalRequest: any, approverId: string, comments?: string): Promise<void> {
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        storeId: 'system',
        type: 'approval_rejected',
        priority: 'high',
        title: `Approval Rejected`,
        message: `Your ${approvalRequest.entityType} ${approvalRequest.entityId} has been rejected by ${approver?.name || 'approver'}. ${comments ? `Reason: ${comments}` : ''}`,
        icon: '❌',
        targetRoles: ['all'],
        actionLabel: 'View',
        actionUrl: `/${approvalRequest.entityType}/${approvalRequest.entityId}`,
      },
    });
  }

  /**
   * Notify delegated user
   */
  private async notifyDelegation(
    approvalRequest: any,
    fromUserId: string,
    toUserId: string,
    reason?: string
  ): Promise<void> {
    const fromUser = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        storeId: 'system',
        type: 'approval_delegated',
        priority: 'high',
        title: `Approval Delegated to You`,
        message: `${fromUser?.name || 'A user'} has delegated approval of ${approvalRequest.entityType} ${approvalRequest.entityId} to you. ${reason ? `Reason: ${reason}` : ''}`,
        icon: '👤',
        targetRoles: ['all'],
        actionLabel: 'Review',
        actionUrl: `/approvals/${approvalRequest.id}`,
        actionData: {
          approvalRequestId: approvalRequest.id,
          entityType: approvalRequest.entityType,
          entityId: approvalRequest.entityId,
        },
      },
    });
  }
}

export default new ApprovalService();
