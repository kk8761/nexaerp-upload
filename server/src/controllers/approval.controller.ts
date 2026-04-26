/**
 * Approval Controller
 * HTTP endpoints for approval workflow management
 * 
 * Requirements: 5.5 - Multi-level approval hierarchies
 * Task 17.1: Create approval workflow framework
 */

import { Request, Response } from 'express';
import approvalService from '../services/approval.service';

export class ApprovalController {
  /**
   * Create a new approval workflow template
   * POST /api/approvals/workflows
   */
  async createWorkflow(req: Request, res: Response) {
    try {
      const workflow = await approvalService.createApprovalWorkflow(req.body);
      res.status(201).json({ 
        success: true, 
        workflow,
        message: 'Approval workflow created successfully',
      });
    } catch (error: any) {
      console.error('Error creating approval workflow:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create approval workflow',
      });
    }
  }

  /**
   * Submit an entity for approval
   * POST /api/approvals/submit
   */
  async submitForApproval(req: Request, res: Response) {
    try {
      const { entityType, entityId, workflowName } = req.body;
      const userId = (req as any).user?.id;

      if (!entityType || !entityId) {
        res.status(400).json({
          success: false,
          message: 'Entity type and ID are required',
        });
        return;
      }

      const approvalRequest = await approvalService.submitForApproval(
        entityType,
        entityId,
        userId,
        workflowName
      );

      res.status(201).json({
        success: true,
        approvalRequest,
        message: 'Submitted for approval successfully',
      });
    } catch (error: any) {
      console.error('Error submitting for approval:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to submit for approval',
      });
    }
  }

  /**
   * Process an approval decision
   * POST /api/approvals/:id/process
   */
  async processApproval(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action, comments, delegateToUserId } = req.body;
      const userId = (req as any).user?.id;

      if (!action || !['approved', 'rejected', 'delegated'].includes(action)) {
        res.status(400).json({
          success: false,
          message: 'Valid action (approved, rejected, delegated) is required',
        });
        return;
      }

      const result = await approvalService.processApproval(
        id,
        userId,
        action,
        comments,
        delegateToUserId
      );

      res.json({
        success: true,
        ...result,
        message: `Approval ${action} successfully`,
      });
    } catch (error: any) {
      console.error('Error processing approval:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process approval',
      });
    }
  }

  /**
   * Get approval request details
   * GET /api/approvals/:id
   */
  async getApprovalRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const approvalRequest = await approvalService.getApprovalRequest(id);

      if (!approvalRequest) {
        res.status(404).json({
          success: false,
          message: 'Approval request not found',
        });
        return;
      }

      res.json({
        success: true,
        approvalRequest,
      });
    } catch (error: any) {
      console.error('Error getting approval request:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get approval request',
      });
    }
  }

  /**
   * Get pending approvals for current user
   * GET /api/approvals/pending
   */
  async getPendingApprovals(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const pendingApprovals = await approvalService.getPendingApprovals(userId);

      res.json({
        success: true,
        approvals: pendingApprovals,
        count: pendingApprovals.length,
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
   * Get approval history for an entity
   * GET /api/approvals/history/:entityType/:entityId
   */
  async getApprovalHistory(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;
      const history = await approvalService.getApprovalHistory(entityType, entityId);

      res.json({
        success: true,
        history,
        count: history.length,
      });
    } catch (error: any) {
      console.error('Error getting approval history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get approval history',
      });
    }
  }

  /**
   * Cancel an approval request
   * POST /api/approvals/:id/cancel
   */
  async cancelApprovalRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user?.id;

      const result = await approvalService.cancelApprovalRequest(id, userId, reason);

      res.json({
        success: true,
        ...result,
        message: 'Approval request cancelled successfully',
      });
    } catch (error: any) {
      console.error('Error cancelling approval request:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel approval request',
      });
    }
  }

  /**
   * Delegate approval to another user
   * POST /api/approvals/:id/delegate
   */
  async delegateApproval(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { toUserId, reason } = req.body;
      const userId = (req as any).user?.id;

      if (!toUserId) {
        res.status(400).json({
          success: false,
          message: 'Delegate user ID is required',
        });
        return;
      }

      const result = await approvalService.delegateApproval(id, userId, toUserId, reason);

      res.json({
        success: true,
        ...result,
        message: 'Approval delegated successfully',
      });
    } catch (error: any) {
      console.error('Error delegating approval:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delegate approval',
      });
    }
  }
}

export default new ApprovalController();
