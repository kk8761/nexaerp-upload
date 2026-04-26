/**
 * Expense Report Approval Service
 * Integrates approval workflows with expense reports
 * 
 * Requirements: 5.5 - Multi-level approval hierarchies
 * Task 17.2: Integrate approvals with business processes
 */

import { PrismaClient } from '@prisma/client';
import approvalService from './approval.service';

const prisma = new PrismaClient();

export class ExpenseApprovalService {
  /**
   * Submit expense report for approval
   * Automatically selects workflow based on expense amount
   */
  async submitExpenseForApproval(
    expenseReportId: string,
    requesterId: string
  ): Promise<any> {
    // Get expense report details
    const expenseReport = await prisma.expenseReport.findUnique({
      where: { id: expenseReportId },
      include: { items: true },
    });

    if (!expenseReport) {
      throw new Error('Expense report not found');
    }

    if (expenseReport.status !== 'draft') {
      throw new Error('Only draft expense reports can be submitted for approval');
    }

    // Determine workflow based on amount
    let workflowName = 'expense_approval_manager';
    
    if (expenseReport.totalAmount > 10000) {
      workflowName = 'expense_approval_finance_director';
    } else if (expenseReport.totalAmount > 5000) {
      workflowName = 'expense_approval_finance_manager';
    } else if (expenseReport.totalAmount > 1000) {
      workflowName = 'expense_approval_manager';
    } else {
      // Auto-approve small expenses
      await prisma.expenseReport.update({
        where: { id: expenseReportId },
        data: {
          status: 'approved',
          approvedBy: requesterId,
          approvedDate: new Date(),
        },
      });
      return { autoApproved: true, expenseReport };
    }

    // Submit for approval
    const approvalRequest = await approvalService.submitForApproval(
      'expense_report',
      expenseReportId,
      requesterId,
      workflowName
    );

    // Update expense report status
    await prisma.expenseReport.update({
      where: { id: expenseReportId },
      data: {
        status: 'submitted',
        submittedDate: new Date(),
      },
    });

    return { approvalRequest, expenseReport };
  }

  /**
   * Process expense report approval
   */
  async processExpenseApproval(
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

    // Get approval request to find expense report
    const approvalRequest = await approvalService.getApprovalRequest(approvalRequestId);
    const expenseReportId = approvalRequest.entityId;

    const expenseReport = await prisma.expenseReport.findUnique({
      where: { id: expenseReportId },
      include: { items: true },
    });

    if (!expenseReport) {
      throw new Error('Expense report not found');
    }

    // Update expense report based on approval result
    if (result.status === 'approved') {
      await prisma.expenseReport.update({
        where: { id: expenseReportId },
        data: {
          status: 'approved',
          approvedBy: approverId,
          approvedDate: new Date(),
        },
      });
    } else if (result.status === 'rejected') {
      await prisma.expenseReport.update({
        where: { id: expenseReportId },
        data: {
          status: 'rejected',
        },
      });
    }

    return { ...result, expenseReport };
  }

  /**
   * Get pending expense approvals for a user
   */
  async getPendingExpenseApprovals(userId: string): Promise<any[]> {
    const pendingApprovals = await approvalService.getPendingApprovals(userId);
    
    // Filter for expense reports only
    const expenseApprovals = pendingApprovals.filter(
      approval => approval.entityType === 'expense_report'
    );

    // Enrich with expense report details
    const enrichedApprovals = await Promise.all(
      expenseApprovals.map(async (approval) => {
        const expenseReport = await prisma.expenseReport.findUnique({
          where: { id: approval.entityId },
          include: { items: true },
        });
        return {
          ...approval,
          expenseReport,
        };
      })
    );

    return enrichedApprovals;
  }

  /**
   * Initialize default expense approval workflows
   */
  async initializeDefaultWorkflows(): Promise<void> {
    const workflows = [
      {
        name: 'expense_approval_manager',
        description: 'Manager approval for expenses $1,000 - $5,000',
        module: 'expense_report',
        entityType: 'expense_report',
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
        name: 'expense_approval_finance_manager',
        description: 'Finance Manager approval for expenses $5,000 - $10,000',
        module: 'expense_report',
        entityType: 'expense_report',
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
            name: 'Finance Manager Approval',
            approverRoles: ['finance_manager', 'accountant'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
        ],
      },
      {
        name: 'expense_approval_finance_director',
        description: 'Finance Director approval for expenses > $10,000',
        module: 'expense_report',
        entityType: 'expense_report',
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
            name: 'Finance Manager Approval',
            approverRoles: ['finance_manager', 'accountant'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
          {
            step: 3,
            name: 'Finance Director Approval',
            approverRoles: ['finance_director', 'cfo'],
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

export default new ExpenseApprovalService();
