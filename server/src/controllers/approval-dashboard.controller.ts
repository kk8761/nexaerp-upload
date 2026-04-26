/**
 * Approval Dashboard Controller
 * Provides dashboard views and statistics for approval workflows
 * 
 * Requirements: 5.5 - Multi-level approval hierarchies
 * Task 17.2: Create approval dashboard
 */

import { Request, Response } from 'express';
import approvalService from '../services/approval.service';
import purchaseOrderApprovalService from '../services/purchase-order-approval.service';
import leaveApprovalService from '../services/leave-approval.service';
import expenseApprovalService from '../services/expense-approval.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ApprovalDashboardController {
  /**
   * Get approval dashboard overview
   * GET /api/approvals/dashboard
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      // Get all pending approvals for user
      const pendingApprovals = await approvalService.getPendingApprovals(userId);

      // Get statistics by entity type
      const stats = {
        total: pendingApprovals.length,
        byType: {
          purchase_order: pendingApprovals.filter(a => a.entityType === 'purchase_order').length,
          expense_report: pendingApprovals.filter(a => a.entityType === 'expense_report').length,
          leave_request: pendingApprovals.filter(a => a.entityType === 'leave_request').length,
          invoice: pendingApprovals.filter(a => a.entityType === 'invoice').length,
        },
        byPriority: {
          high: 0,
          medium: 0,
          low: 0,
        },
      };

      // Calculate priority based on age and amount
      pendingApprovals.forEach(approval => {
        const ageInDays = Math.floor(
          (new Date().getTime() - new Date(approval.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (ageInDays > 3) {
          stats.byPriority.high++;
        } else if (ageInDays > 1) {
          stats.byPriority.medium++;
        } else {
          stats.byPriority.low++;
        }
      });

      // Get recent approval history (last 10 actions)
      const recentHistory = await prisma.approvalHistory.findMany({
        where: { approverId: userId },
        include: {
          request: {
            include: {
              requester: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Get user's approval statistics
      const totalApproved = await prisma.approvalHistory.count({
        where: {
          approverId: userId,
          action: 'approved',
        },
      });

      const totalRejected = await prisma.approvalHistory.count({
        where: {
          approverId: userId,
          action: 'rejected',
        },
      });

      const totalDelegated = await prisma.approvalHistory.count({
        where: {
          approverId: userId,
          action: 'delegated',
        },
      });

      res.json({
        success: true,
        dashboard: {
          pending: stats,
          recentHistory,
          userStats: {
            totalApproved,
            totalRejected,
            totalDelegated,
            totalProcessed: totalApproved + totalRejected,
          },
        },
      });
    } catch (error: any) {
      console.error('Error getting approval dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get approval dashboard',
      });
    }
  }

  /**
   * Get pending approvals with details
   * GET /api/approvals/dashboard/pending
   */
  async getPendingWithDetails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { type } = req.query;

      let approvals;

      if (type === 'purchase_order') {
        approvals = await purchaseOrderApprovalService.getPendingPurchaseOrderApprovals(userId);
      } else if (type === 'expense_report') {
        approvals = await expenseApprovalService.getPendingExpenseApprovals(userId);
      } else if (type === 'leave_request') {
        approvals = await leaveApprovalService.getPendingLeaveApprovals(userId);
      } else {
        // Get all pending approvals
        approvals = await approvalService.getPendingApprovals(userId);
      }

      res.json({
        success: true,
        approvals,
        count: approvals.length,
      });
    } catch (error: any) {
      console.error('Error getting pending approvals:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get pending approvals',
      });
    }
  }

  /**
   * Get approval statistics
   * GET /api/approvals/dashboard/stats
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate as string);
      }

      // Get approval statistics for the period
      const approvalsByType = await prisma.approvalRequest.groupBy({
        by: ['entityType', 'status'],
        where: {
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        _count: true,
      });

      // Get average approval time
      const completedApprovals = await prisma.approvalRequest.findMany({
        where: {
          status: { in: ['approved', 'rejected'] },
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        select: {
          createdAt: true,
          updatedAt: true,
          entityType: true,
        },
      });

      const avgApprovalTime: any = {};
      completedApprovals.forEach(approval => {
        const timeInHours = (approval.updatedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
        if (!avgApprovalTime[approval.entityType]) {
          avgApprovalTime[approval.entityType] = { total: 0, count: 0 };
        }
        avgApprovalTime[approval.entityType].total += timeInHours;
        avgApprovalTime[approval.entityType].count++;
      });

      Object.keys(avgApprovalTime).forEach(type => {
        avgApprovalTime[type] = avgApprovalTime[type].total / avgApprovalTime[type].count;
      });

      // Get user's approval rate
      const userApprovals = await prisma.approvalHistory.groupBy({
        by: ['action'],
        where: {
          approverId: userId,
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        _count: true,
      });

      res.json({
        success: true,
        statistics: {
          approvalsByType,
          avgApprovalTime,
          userApprovals,
        },
      });
    } catch (error: any) {
      console.error('Error getting approval statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get approval statistics',
      });
    }
  }

  /**
   * Get approval workflow templates
   * GET /api/approvals/dashboard/workflows
   */
  async getWorkflowTemplates(req: Request, res: Response) {
    try {
      const { module } = req.query;

      const workflows = await prisma.workflowTemplate.findMany({
        where: module ? { module: module as string } : undefined,
        orderBy: { name: 'asc' },
      });

      res.json({
        success: true,
        workflows,
        count: workflows.length,
      });
    } catch (error: any) {
      console.error('Error getting workflow templates:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get workflow templates',
      });
    }
  }
}

export default new ApprovalDashboardController();
