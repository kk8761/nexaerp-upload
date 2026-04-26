/**
 * Leave Request Approval Service
 * Integrates approval workflows with leave requests
 * 
 * Requirements: 5.5 - Multi-level approval hierarchies
 * Task 17.2: Integrate approvals with business processes
 */

import { PrismaClient } from '@prisma/client';
import approvalService from './approval.service';

const prisma = new PrismaClient();

export class LeaveApprovalService {
  /**
   * Submit leave request for approval
   * Automatically selects workflow based on leave type and duration
   */
  async submitLeaveForApproval(
    leaveId: string,
    requesterId: string
  ): Promise<any> {
    // Get leave request details (from MongoDB)
    const Leave = require('../../models/Leave');
    const leave = await Leave.findById(leaveId);

    if (!leave) {
      throw new Error('Leave request not found');
    }

    if (leave.status !== 'pending') {
      throw new Error('Only pending leave requests can be submitted for approval');
    }

    // Determine workflow based on leave type and duration
    let workflowName = 'leave_approval_manager';
    
    if (leave.days > 10) {
      workflowName = 'leave_approval_hr_director';
    } else if (leave.leaveType === 'unpaid' || leave.leaveType === 'maternity' || leave.leaveType === 'paternity') {
      workflowName = 'leave_approval_hr';
    }

    // Submit for approval
    const approvalRequest = await approvalService.submitForApproval(
      'leave_request',
      leaveId,
      requesterId,
      workflowName
    );

    return { approvalRequest, leave };
  }

  /**
   * Process leave request approval
   */
  async processLeaveApproval(
    approvalRequestId: string,
    approverId: string,
    action: 'approved' | 'rejected',
    comments?: string
  ): Promise<any> {
    // Process approval
    const result = await approvalService.processApproval(
      approvalRequestId,
      approverId,
      action,
      comments
    );

    // Get approval request to find leave
    const approvalRequest = await approvalService.getApprovalRequest(approvalRequestId);
    const leaveId = approvalRequest.entityId;

    const Leave = require('../../models/Leave');
    const leave = await Leave.findById(leaveId);

    if (!leave) {
      throw new Error('Leave request not found');
    }

    // Update leave based on approval result
    if (result.status === 'approved') {
      leave.status = 'approved';
      leave.approvedBy = approverId;
      leave.approvedAt = new Date();
      leave.approvalNote = comments || 'Approved';
      await leave.save();
    } else if (result.status === 'rejected') {
      leave.status = 'rejected';
      leave.approvalNote = comments || 'Rejected';
      await leave.save();
    }

    return { ...result, leave };
  }

  /**
   * Get pending leave approvals for a user
   */
  async getPendingLeaveApprovals(userId: string): Promise<any[]> {
    const pendingApprovals = await approvalService.getPendingApprovals(userId);
    
    // Filter for leave requests only
    const leaveApprovals = pendingApprovals.filter(
      approval => approval.entityType === 'leave_request'
    );

    // Enrich with leave details
    const Leave = require('../../models/Leave');
    const enrichedApprovals = await Promise.all(
      leaveApprovals.map(async (approval) => {
        const leave = await Leave.findById(approval.entityId);
        return {
          ...approval,
          leave,
        };
      })
    );

    return enrichedApprovals;
  }

  /**
   * Initialize default leave approval workflows
   */
  async initializeDefaultWorkflows(): Promise<void> {
    const workflows = [
      {
        name: 'leave_approval_manager',
        description: 'Manager approval for standard leave requests',
        module: 'leave_request',
        entityType: 'leave_request',
        steps: [
          {
            step: 1,
            name: 'Manager Approval',
            approverRoles: ['manager', 'team_lead'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
        ],
      },
      {
        name: 'leave_approval_hr',
        description: 'HR approval for special leave types',
        module: 'leave_request',
        entityType: 'leave_request',
        steps: [
          {
            step: 1,
            name: 'Manager Approval',
            approverRoles: ['manager', 'team_lead'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
          {
            step: 2,
            name: 'HR Approval',
            approverRoles: ['hr_manager', 'hr_admin'],
            requiredApprovals: 1,
            allowDelegation: false,
          },
        ],
      },
      {
        name: 'leave_approval_hr_director',
        description: 'HR Director approval for extended leave',
        module: 'leave_request',
        entityType: 'leave_request',
        steps: [
          {
            step: 1,
            name: 'Manager Approval',
            approverRoles: ['manager', 'team_lead'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
          {
            step: 2,
            name: 'HR Manager Approval',
            approverRoles: ['hr_manager'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
          {
            step: 3,
            name: 'HR Director Approval',
            approverRoles: ['hr_director'],
            requiredApprovals: 1,
            allowDelegation: false,
          },
        ],
      },
    ];

    for (const workflow of workflows) {
      try {
        // Check if workflow already exists
        const existing = await prisma.workflowTemplate.findFirst({
          where: { name: workflow.name },
        });

        if (!existing) {
          await approvalService.createApprovalWorkflow(workflow);
          console.log(`Created workflow: ${workflow.name}`);
        }
      } catch (error) {
        console.error(`Error creating workflow ${workflow.name}:`, error);
      }
    }
  }
}

export default new LeaveApprovalService();
