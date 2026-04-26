/**
 * Quality Management Controller
 * Task 21: Implement Quality Management System
 * Handles HTTP requests for inspection plans, results, and non-conformances
 */

import { Request, Response } from 'express';
import {
  InspectionPlanService,
  InspectionResultService,
  NonConformanceService,
  CorrectiveActionService,
} from '../services/qualityManagement.service';

// ─── Inspection Plan Controllers ───────────────────────────

export class InspectionPlanController {
  /**
   * Create a new inspection plan
   * POST /api/quality/inspection-plans
   */
  static async createInspectionPlan(req: Request, res: Response) {
    try {
      const plan = await InspectionPlanService.createInspectionPlan(req.body);
      res.status(201).json({
        success: true,
        data: plan,
        message: 'Inspection plan created successfully',
      });
    } catch (error: any) {
      console.error('Error creating inspection plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create inspection plan',
      });
    }
  }

  /**
   * Get all active inspection plans
   * GET /api/quality/inspection-plans
   */
  static async getInspectionPlans(req: Request, res: Response) {
    try {
      const plans = await InspectionPlanService.getActiveInspectionPlans();
      res.json({
        success: true,
        data: plans,
      });
    } catch (error: any) {
      console.error('Error fetching inspection plans:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch inspection plans',
      });
    }
  }

  /**
   * Get inspection plan by ID
   * GET /api/quality/inspection-plans/:id
   */
  static async getInspectionPlanById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const plan = await InspectionPlanService.getInspectionPlanById(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Inspection plan not found',
        });
      }

      res.json({
        success: true,
        data: plan,
      });
    } catch (error: any) {
      console.error('Error fetching inspection plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch inspection plan',
      });
    }
  }

  /**
   * Get inspection plans by product
   * GET /api/quality/inspection-plans/product/:productId
   */
  static async getInspectionPlansByProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const plans = await InspectionPlanService.getInspectionPlansByProduct(productId);
      res.json({
        success: true,
        data: plans,
      });
    } catch (error: any) {
      console.error('Error fetching inspection plans:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch inspection plans',
      });
    }
  }

  /**
   * Update inspection plan
   * PUT /api/quality/inspection-plans/:id
   */
  static async updateInspectionPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const plan = await InspectionPlanService.updateInspectionPlan(id, req.body);
      res.json({
        success: true,
        data: plan,
        message: 'Inspection plan updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating inspection plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update inspection plan',
      });
    }
  }

  /**
   * Deactivate inspection plan
   * DELETE /api/quality/inspection-plans/:id
   */
  static async deactivateInspectionPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await InspectionPlanService.deactivateInspectionPlan(id);
      res.json({
        success: true,
        message: 'Inspection plan deactivated successfully',
      });
    } catch (error: any) {
      console.error('Error deactivating inspection plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to deactivate inspection plan',
      });
    }
  }
}

// ─── Inspection Result Controllers ─────────────────────────

export class InspectionResultController {
  /**
   * Create a new inspection result
   * POST /api/quality/inspection-results
   */
  static async createInspectionResult(req: Request, res: Response) {
    try {
      const result = await InspectionResultService.createInspectionResult(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Inspection result created successfully',
      });
    } catch (error: any) {
      console.error('Error creating inspection result:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create inspection result',
      });
    }
  }

  /**
   * Record checkpoint result
   * POST /api/quality/inspection-results/:id/checkpoints
   */
  static async recordCheckpointResult(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await InspectionResultService.recordCheckpointResult({
        inspectionResultId: id,
        ...req.body,
      });
      res.status(201).json({
        success: true,
        data: result,
        message: 'Checkpoint result recorded successfully',
      });
    } catch (error: any) {
      console.error('Error recording checkpoint result:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to record checkpoint result',
      });
    }
  }

  /**
   * Complete inspection
   * POST /api/quality/inspection-results/:id/complete
   */
  static async completeInspection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await InspectionResultService.completeInspection(id);
      res.json({
        success: true,
        data: result,
        message: 'Inspection completed successfully',
      });
    } catch (error: any) {
      console.error('Error completing inspection:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to complete inspection',
      });
    }
  }

  /**
   * Get inspection result by ID
   * GET /api/quality/inspection-results/:id
   */
  static async getInspectionResultById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await InspectionResultService.getInspectionResultById(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Inspection result not found',
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching inspection result:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch inspection result',
      });
    }
  }

  /**
   * Get inspection results by product
   * GET /api/quality/inspection-results/product/:productId
   */
  static async getInspectionResultsByProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const results = await InspectionResultService.getInspectionResultsByProduct(productId);
      res.json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      console.error('Error fetching inspection results:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch inspection results',
      });
    }
  }

  /**
   * Get inspection results by batch
   * GET /api/quality/inspection-results/batch/:batchNumber
   */
  static async getInspectionResultsByBatch(req: Request, res: Response) {
    try {
      const { batchNumber } = req.params;
      const results = await InspectionResultService.getInspectionResultsByBatch(batchNumber);
      res.json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      console.error('Error fetching inspection results:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch inspection results',
      });
    }
  }

  /**
   * Get inspection statistics
   * GET /api/quality/inspection-results/statistics
   */
  static async getInspectionStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate, productId } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (productId) filters.productId = productId as string;

      const stats = await InspectionResultService.getInspectionStatistics(filters);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching inspection statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch inspection statistics',
      });
    }
  }
}

// ─── Non-Conformance Controllers ───────────────────────────

export class NonConformanceController {
  /**
   * Create a new non-conformance report
   * POST /api/quality/non-conformances
   */
  static async createNonConformance(req: Request, res: Response) {
    try {
      const nc = await NonConformanceService.createNonConformance(req.body);
      res.status(201).json({
        success: true,
        data: nc,
        message: 'Non-conformance report created successfully',
      });
    } catch (error: any) {
      console.error('Error creating non-conformance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create non-conformance report',
      });
    }
  }

  /**
   * Update non-conformance
   * PUT /api/quality/non-conformances/:id
   */
  static async updateNonConformance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const nc = await NonConformanceService.updateNonConformance(id, req.body);
      res.json({
        success: true,
        data: nc,
        message: 'Non-conformance updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating non-conformance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update non-conformance',
      });
    }
  }

  /**
   * Close non-conformance
   * POST /api/quality/non-conformances/:id/close
   */
  static async closeNonConformance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { closedBy } = req.body;
      const nc = await NonConformanceService.closeNonConformance(id, closedBy);
      res.json({
        success: true,
        data: nc,
        message: 'Non-conformance closed successfully',
      });
    } catch (error: any) {
      console.error('Error closing non-conformance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to close non-conformance',
      });
    }
  }

  /**
   * Get non-conformance by ID
   * GET /api/quality/non-conformances/:id
   */
  static async getNonConformanceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const nc = await NonConformanceService.getNonConformanceById(id);

      if (!nc) {
        return res.status(404).json({
          success: false,
          message: 'Non-conformance not found',
        });
      }

      res.json({
        success: true,
        data: nc,
      });
    } catch (error: any) {
      console.error('Error fetching non-conformance:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch non-conformance',
      });
    }
  }

  /**
   * Get all non-conformances with filters
   * GET /api/quality/non-conformances
   */
  static async getNonConformances(req: Request, res: Response) {
    try {
      const { status, severity, productId, assignedTo } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (severity) filters.severity = severity;
      if (productId) filters.productId = productId;
      if (assignedTo) filters.assignedTo = assignedTo;

      const ncs = await NonConformanceService.getNonConformances(filters);
      res.json({
        success: true,
        data: ncs,
      });
    } catch (error: any) {
      console.error('Error fetching non-conformances:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch non-conformances',
      });
    }
  }

  /**
   * Get non-conformance statistics
   * GET /api/quality/non-conformances/statistics
   */
  static async getNonConformanceStatistics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const stats = await NonConformanceService.getNonConformanceStatistics(filters);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching non-conformance statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch non-conformance statistics',
      });
    }
  }
}

// ─── Corrective Action Controllers ─────────────────────────

export class CorrectiveActionController {
  /**
   * Create a new corrective action
   * POST /api/quality/corrective-actions
   */
  static async createCorrectiveAction(req: Request, res: Response) {
    try {
      const ca = await CorrectiveActionService.createCorrectiveAction(req.body);
      res.status(201).json({
        success: true,
        data: ca,
        message: 'Corrective action created successfully',
      });
    } catch (error: any) {
      console.error('Error creating corrective action:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create corrective action',
      });
    }
  }

  /**
   * Update corrective action
   * PUT /api/quality/corrective-actions/:id
   */
  static async updateCorrectiveAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ca = await CorrectiveActionService.updateCorrectiveAction(id, req.body);
      res.json({
        success: true,
        data: ca,
        message: 'Corrective action updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating corrective action:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update corrective action',
      });
    }
  }

  /**
   * Complete corrective action
   * POST /api/quality/corrective-actions/:id/complete
   */
  static async completeCorrectiveAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ca = await CorrectiveActionService.completeCorrectiveAction(id);
      res.json({
        success: true,
        data: ca,
        message: 'Corrective action completed successfully',
      });
    } catch (error: any) {
      console.error('Error completing corrective action:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to complete corrective action',
      });
    }
  }

  /**
   * Verify corrective action effectiveness
   * POST /api/quality/corrective-actions/:id/verify
   */
  static async verifyCorrectiveAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { verifiedBy, effectiveness } = req.body;
      const ca = await CorrectiveActionService.verifyCorrectiveAction(id, verifiedBy, effectiveness);
      res.json({
        success: true,
        data: ca,
        message: 'Corrective action verified successfully',
      });
    } catch (error: any) {
      console.error('Error verifying corrective action:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify corrective action',
      });
    }
  }

  /**
   * Get corrective action by ID
   * GET /api/quality/corrective-actions/:id
   */
  static async getCorrectiveActionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ca = await CorrectiveActionService.getCorrectiveActionById(id);

      if (!ca) {
        return res.status(404).json({
          success: false,
          message: 'Corrective action not found',
        });
      }

      res.json({
        success: true,
        data: ca,
      });
    } catch (error: any) {
      console.error('Error fetching corrective action:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch corrective action',
      });
    }
  }

  /**
   * Get corrective actions by non-conformance
   * GET /api/quality/corrective-actions/nc/:ncId
   */
  static async getCorrectiveActionsByNC(req: Request, res: Response) {
    try {
      const { ncId } = req.params;
      const cas = await CorrectiveActionService.getCorrectiveActionsByNC(ncId);
      res.json({
        success: true,
        data: cas,
      });
    } catch (error: any) {
      console.error('Error fetching corrective actions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch corrective actions',
      });
    }
  }

  /**
   * Get corrective actions assigned to user
   * GET /api/quality/corrective-actions/assigned/:userId
   */
  static async getCorrectiveActionsByAssignee(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const cas = await CorrectiveActionService.getCorrectiveActionsByAssignee(userId);
      res.json({
        success: true,
        data: cas,
      });
    } catch (error: any) {
      console.error('Error fetching corrective actions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch corrective actions',
      });
    }
  }

  /**
   * Get overdue corrective actions
   * GET /api/quality/corrective-actions/overdue
   */
  static async getOverdueCorrectiveActions(req: Request, res: Response) {
    try {
      const cas = await CorrectiveActionService.getOverdueCorrectiveActions();
      res.json({
        success: true,
        data: cas,
      });
    } catch (error: any) {
      console.error('Error fetching overdue corrective actions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch overdue corrective actions',
      });
    }
  }
}
