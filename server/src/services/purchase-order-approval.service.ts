/**
 * Purchase Order Approval Service
 * Integrates approval workflows with purchase orders
 * 
 * Requirements: 5.5 - Multi-level approval hierarchies
 * Task 17.2: Integrate approvals with business processes
 */

import { PrismaClient } from '@prisma/client';
import approvalService from './approval.service';

const prisma = new PrismaClient();

export class PurchaseOrderApprovalService {
  /**
   * Submit purchase order for approval
   * Automatically selects workflow based on PO amount
   */
  async submitPurchaseOrderForApproval(
    purchaseOrderId: string,
    requesterId: string
  ): Promise<any> {
    // Get purchase order details (from MongoDB)
    const PurchaseOrder = require('../../models/PurchaseOrder');
    const po = await PurchaseOrder.findById(purchaseOrderId);

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status !== 'draft') {
      throw new Error('Only draft purchase orders can be submitted for approval');
    }

    // Determine workflow based on amount
    let workflowName = 'po_approval_manager';
    
    if (po.grandTotal > 100000) {
      workflowName = 'po_approval_cfo';
    } else if (po.grandTotal > 50000) {
      workflowName = 'po_approval_director';
    } else if (po.grandTotal > 10000) {
      workflowName = 'po_approval_manager';
    } else {
      // Auto-approve small POs
      po.status = 'sent_to_vendor';
      po.approvedBy = requesterId;
      po.approvedAt = new Date();
      await po.save();
      return { autoApproved: true, purchaseOrder: po };
    }

    // Submit for approval
    const approvalRequest = await approvalService.submitForApproval(
      'purchase_order',
      purchaseOrderId,
      requesterId,
      workflowName
    );

    // Update PO status
    po.status = 'pending_approval';
    await po.save();

    return { approvalRequest, purchaseOrder: po };
  }

  /**
   * Process purchase order approval
   */
  async processPurchaseOrderApproval(
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

    // Get approval request to find PO
    const approvalRequest = await approvalService.getApprovalRequest(approvalRequestId);
    const poId = approvalRequest.entityId;

    const PurchaseOrder = require('../../models/PurchaseOrder');
    const po = await PurchaseOrder.findById(poId);

    if (!po) {
      throw new Error('Purchase order not found');
    }

    // Update PO based on approval result
    if (result.status === 'approved') {
      po.status = 'sent_to_vendor';
      po.approvedBy = approverId;
      po.approvedAt = new Date();
      await po.save();
    } else if (result.status === 'rejected') {
      po.status = 'rejected';
      await po.save();
    }

    return { ...result, purchaseOrder: po };
  }

  /**
   * Get pending purchase order approvals for a user
   */
  async getPendingPurchaseOrderApprovals(userId: string): Promise<any[]> {
    const pendingApprovals = await approvalService.getPendingApprovals(userId);
    
    // Filter for purchase orders only
    const poApprovals = pendingApprovals.filter(
      approval => approval.entityType === 'purchase_order'
    );

    // Enrich with PO details
    const PurchaseOrder = require('../../models/PurchaseOrder');
    const enrichedApprovals = await Promise.all(
      poApprovals.map(async (approval) => {
        const po = await PurchaseOrder.findById(approval.entityId);
        return {
          ...approval,
          purchaseOrder: po,
        };
      })
    );

    return enrichedApprovals;
  }

  /**
   * Initialize default purchase order approval workflows
   */
  async initializeDefaultWorkflows(): Promise<void> {
    const workflows = [
      {
        name: 'po_approval_manager',
        description: 'Manager approval for POs $10,000 - $50,000',
        module: 'purchase_order',
        entityType: 'purchase_order',
        steps: [
          {
            step: 1,
            name: 'Manager Approval',
            approverRoles: ['manager', 'procurement_manager'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
        ],
      },
      {
        name: 'po_approval_director',
        description: 'Director approval for POs $50,000 - $100,000',
        module: 'purchase_order',
        entityType: 'purchase_order',
        steps: [
          {
            step: 1,
            name: 'Manager Approval',
            approverRoles: ['manager', 'procurement_manager'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
          {
            step: 2,
            name: 'Director Approval',
            approverRoles: ['director', 'procurement_director'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
        ],
      },
      {
        name: 'po_approval_cfo',
        description: 'CFO approval for POs > $100,000',
        module: 'purchase_order',
        entityType: 'purchase_order',
        steps: [
          {
            step: 1,
            name: 'Manager Approval',
            approverRoles: ['manager', 'procurement_manager'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
          {
            step: 2,
            name: 'Director Approval',
            approverRoles: ['director', 'procurement_director'],
            requiredApprovals: 1,
            allowDelegation: true,
          },
          {
            step: 3,
            name: 'CFO Approval',
            approverRoles: ['cfo', 'finance_director'],
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

export default new PurchaseOrderApprovalService();
