/**
 * Supply Chain Management Controller
 * Handles HTTP requests for SCM operations
 */

import { Request, Response } from 'express';
import scmService from '../services/scm.service';
import { sendSuccess, sendError } from '../utils/response';

export class SCMController {
  
  // ==================== Demand Forecasting ====================
  
  /**
   * Generate demand forecast
   * POST /api/scm/demand-forecast
   */
  async createDemandForecast(req: Request, res: Response) {
    try {
      const { productId, method, periods, historicalPeriods, alpha, movingAveragePeriods } = req.body;
      
      if (!productId || !method) {
        return sendError(res, 'Product ID and forecast method are required', 400);
      }
      
      const forecast = await scmService.forecastDemand({
        productId,
        method,
        periods,
        historicalPeriods,
        alpha,
        movingAveragePeriods
      });
      
      sendSuccess(res, forecast, 'Demand forecast generated successfully');
    } catch (error) {
      console.error('Error creating demand forecast:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to create demand forecast');
    }
  }
  
  /**
   * Get demand forecast
   * GET /api/scm/demand-forecast/:id
   */
  async getDemandForecast(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const forecast = await scmService.getDemandForecast(id);
      
      if (!forecast) {
        return sendError(res, 'Demand forecast not found', 404);
      }
      
      sendSuccess(res, forecast);
    } catch (error) {
      console.error('Error getting demand forecast:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to get demand forecast');
    }
  }
  
  /**
   * List demand forecasts
   * GET /api/scm/demand-forecasts
   */
  async listDemandForecasts(req: Request, res: Response) {
    try {
      const { productId, method, startDate, endDate } = req.query;
      
      const forecasts = await scmService.listDemandForecasts({
        productId: productId as string,
        method: method as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      sendSuccess(res, forecasts);
    } catch (error) {
      console.error('Error listing demand forecasts:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to list demand forecasts');
    }
  }
  
  // ==================== Supply Planning ====================
  
  /**
   * Create supply plan
   * POST /api/scm/supply-plan
   */
  async createSupplyPlan(req: Request, res: Response) {
    try {
      const { planningHorizonStart, planningHorizonEnd, productIds, serviceLevelTarget, notes } = req.body;
      
      if (!planningHorizonStart || !planningHorizonEnd) {
        return sendError(res, 'Planning horizon start and end dates are required', 400);
      }
      
      const plan = await scmService.createSupplyPlan({
        planningHorizonStart: new Date(planningHorizonStart),
        planningHorizonEnd: new Date(planningHorizonEnd),
        productIds,
        serviceLevelTarget,
        notes
      });
      
      sendSuccess(res, plan, 'Supply plan created successfully');
    } catch (error) {
      console.error('Error creating supply plan:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to create supply plan');
    }
  }
  
  /**
   * Approve supply plan
   * POST /api/scm/supply-plan/:id/approve
   */
  async approveSupplyPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const approvedBy = req.user?.id || 'system';
      
      const result = await scmService.approveSupplyPlan(id, approvedBy);
      
      sendSuccess(res, result, 'Supply plan approved successfully');
    } catch (error) {
      console.error('Error approving supply plan:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to approve supply plan');
    }
  }
  
  /**
   * Get supply plan
   * GET /api/scm/supply-plan/:id
   */
  async getSupplyPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const plan = await scmService.getSupplyPlan(id);
      
      if (!plan) {
        return sendError(res, 'Supply plan not found', 404);
      }
      
      sendSuccess(res, plan);
    } catch (error) {
      console.error('Error getting supply plan:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to get supply plan');
    }
  }
  
  /**
   * List supply plans
   * GET /api/scm/supply-plans
   */
  async listSupplyPlans(req: Request, res: Response) {
    try {
      const { status, startDate, endDate } = req.query;
      
      const plans = await scmService.listSupplyPlans({
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      sendSuccess(res, plans);
    } catch (error) {
      console.error('Error listing supply plans:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to list supply plans');
    }
  }
  
  // ==================== Shipment Tracking ====================
  
  /**
   * Create shipment
   * POST /api/scm/shipment
   */
  async createShipment(req: Request, res: Response) {
    try {
      const shipmentData = req.body;
      
      if (!shipmentData.carrier || !shipmentData.trackingNumber) {
        return sendError(res, 'Carrier and tracking number are required', 400);
      }
      
      const shipment = await scmService.createShipment(shipmentData);
      
      sendSuccess(res, shipment, 'Shipment created successfully');
    } catch (error) {
      console.error('Error creating shipment:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to create shipment');
    }
  }
  
  /**
   * Update shipment status
   * PUT /api/scm/shipment/:id/status
   */
  async updateShipmentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, location, description, eventDate } = req.body;
      
      if (!status || !description) {
        return sendError(res, 'Status and description are required', 400);
      }
      
      const shipment = await scmService.updateShipmentStatus(id, {
        status,
        location,
        description,
        eventDate: eventDate ? new Date(eventDate) : undefined
      });
      
      sendSuccess(res, shipment, 'Shipment status updated successfully');
    } catch (error) {
      console.error('Error updating shipment status:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to update shipment status');
    }
  }
  
  /**
   * Get shipment details
   * GET /api/scm/shipment/:id
   */
  async getShipment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const shipment = await scmService.getShipment(id);
      
      if (!shipment) {
        return sendError(res, 'Shipment not found', 404);
      }
      
      sendSuccess(res, shipment);
    } catch (error) {
      console.error('Error getting shipment:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to get shipment');
    }
  }
  
  /**
   * Track shipment by tracking number
   * GET /api/scm/shipment/track/:trackingNumber
   */
  async trackShipment(req: Request, res: Response) {
    try {
      const { trackingNumber } = req.params;
      const shipment = await scmService.trackShipmentByNumber(trackingNumber);
      
      if (!shipment) {
        return sendError(res, 'Shipment not found', 404);
      }
      
      sendSuccess(res, shipment);
    } catch (error) {
      console.error('Error tracking shipment:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to track shipment');
    }
  }
  
  /**
   * List shipments
   * GET /api/scm/shipments
   */
  async listShipments(req: Request, res: Response) {
    try {
      const { status, carrier, orderId, startDate, endDate } = req.query;
      
      const shipments = await scmService.listShipments({
        status: status as string,
        carrier: carrier as string,
        orderId: orderId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      sendSuccess(res, shipments);
    } catch (error) {
      console.error('Error listing shipments:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to list shipments');
    }
  }
  
  // ==================== Supplier Performance ====================
  
  /**
   * Calculate supplier performance
   * POST /api/scm/supplier-performance/calculate
   */
  async calculateSupplierPerformance(req: Request, res: Response) {
    try {
      const { supplierId, evaluationPeriodStart, evaluationPeriodEnd } = req.body;
      
      if (!supplierId || !evaluationPeriodStart || !evaluationPeriodEnd) {
        return sendError(res, 'Supplier ID and evaluation period are required', 400);
      }
      
      const performance = await scmService.calculateSupplierPerformance({
        supplierId,
        evaluationPeriodStart: new Date(evaluationPeriodStart),
        evaluationPeriodEnd: new Date(evaluationPeriodEnd)
      });
      
      sendSuccess(res, performance, 'Supplier performance calculated successfully');
    } catch (error) {
      console.error('Error calculating supplier performance:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to calculate supplier performance');
    }
  }
  
  /**
   * Get supplier scorecard
   * GET /api/scm/supplier/:id/scorecard
   */
  async getSupplierScorecard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const scorecard = await scmService.getSupplierScorecard(id);
      
      sendSuccess(res, scorecard);
    } catch (error) {
      console.error('Error getting supplier scorecard:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to get supplier scorecard');
    }
  }
  
  /**
   * List supplier performance records
   * GET /api/scm/supplier-performance
   */
  async listSupplierPerformance(req: Request, res: Response) {
    try {
      const { supplierId, minRating, startDate, endDate } = req.query;
      
      const performance = await scmService.listSupplierPerformance({
        supplierId: supplierId as string,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      
      sendSuccess(res, performance);
    } catch (error) {
      console.error('Error listing supplier performance:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to list supplier performance');
    }
  }
  
  // ==================== Global Inventory Visibility ====================
  
  /**
   * Get global inventory visibility
   * GET /api/scm/inventory/global
   */
  async getGlobalInventoryVisibility(req: Request, res: Response) {
    try {
      const { productId } = req.query;
      
      const inventory = await scmService.getGlobalInventoryVisibility(productId as string);
      
      sendSuccess(res, inventory);
    } catch (error) {
      console.error('Error getting global inventory visibility:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to get global inventory visibility');
    }
  }
  
  /**
   * Calculate supplier lead times
   * POST /api/scm/supplier/:id/lead-times/calculate
   */
  async calculateSupplierLeadTimes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const leadTimes = await scmService.calculateSupplierLeadTimes(id);
      
      sendSuccess(res, leadTimes, 'Supplier lead times calculated successfully');
    } catch (error) {
      console.error('Error calculating supplier lead times:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to calculate supplier lead times');
    }
  }
  
  /**
   * Get supplier lead times
   * GET /api/scm/supplier/:id/lead-times
   */
  async getSupplierLeadTimes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const leadTimes = await scmService.getSupplierLeadTimes(id);
      
      sendSuccess(res, leadTimes);
    } catch (error) {
      console.error('Error getting supplier lead times:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to get supplier lead times');
    }
  }
  
  // ==================== Vendor Collaboration Portal ====================
  
  /**
   * Create vendor portal access
   * POST /api/scm/vendor-portal/access
   */
  async createVendorPortalAccess(req: Request, res: Response) {
    try {
      const { supplierId, username, password, permissions } = req.body;
      
      if (!supplierId || !username || !password) {
        return sendError(res, 'Supplier ID, username, and password are required', 400);
      }
      
      // TODO: Hash password before storing
      const access = await scmService.createVendorPortalAccess({
        supplierId,
        username,
        password, // Should be hashed
        permissions
      });
      
      sendSuccess(res, access, 'Vendor portal access created successfully');
    } catch (error) {
      console.error('Error creating vendor portal access:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to create vendor portal access');
    }
  }
  
  /**
   * Share purchase order with vendor
   * POST /api/scm/vendor-portal/purchase-order
   */
  async sharePurchaseOrderWithVendor(req: Request, res: Response) {
    try {
      const poData = req.body;
      
      if (!poData.poNumber || !poData.supplierId || !poData.items || poData.items.length === 0) {
        return sendError(res, 'PO number, supplier ID, and items are required', 400);
      }
      
      const vendorPO = await scmService.sharePurchaseOrderWithVendor(poData);
      
      sendSuccess(res, vendorPO, 'Purchase order shared with vendor successfully');
    } catch (error) {
      console.error('Error sharing purchase order:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to share purchase order');
    }
  }
  
  /**
   * Vendor confirms purchase order
   * POST /api/scm/vendor-portal/purchase-order/:id/confirm
   */
  async vendorConfirmPurchaseOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { confirmedBy, estimatedShipDate, vendorNotes } = req.body;
      
      if (!confirmedBy) {
        return sendError(res, 'Confirmed by is required', 400);
      }
      
      const po = await scmService.vendorConfirmPurchaseOrder({
        poId: id,
        confirmedBy,
        estimatedShipDate: estimatedShipDate ? new Date(estimatedShipDate) : undefined,
        vendorNotes
      });
      
      sendSuccess(res, po, 'Purchase order confirmed successfully');
    } catch (error) {
      console.error('Error confirming purchase order:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to confirm purchase order');
    }
  }
  
  /**
   * Vendor updates purchase order status
   * PUT /api/scm/vendor-portal/purchase-order/:id/status
   */
  async vendorUpdatePurchaseOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, trackingNumber, actualShipDate, vendorNotes } = req.body;
      
      if (!status) {
        return sendError(res, 'Status is required', 400);
      }
      
      const po = await scmService.vendorUpdatePurchaseOrderStatus({
        poId: id,
        status,
        trackingNumber,
        actualShipDate: actualShipDate ? new Date(actualShipDate) : undefined,
        vendorNotes
      });
      
      sendSuccess(res, po, 'Purchase order status updated successfully');
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to update purchase order status');
    }
  }
  
  /**
   * Get vendor purchase orders
   * GET /api/scm/vendor-portal/purchase-orders
   */
  async getVendorPurchaseOrders(req: Request, res: Response) {
    try {
      const { supplierId, status } = req.query;
      
      if (!supplierId) {
        return sendError(res, 'Supplier ID is required', 400);
      }
      
      const orders = await scmService.getVendorPurchaseOrders(
        supplierId as string,
        status as string
      );
      
      sendSuccess(res, orders);
    } catch (error) {
      console.error('Error getting vendor purchase orders:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to get vendor purchase orders');
    }
  }
  
  /**
   * Get vendor purchase order details
   * GET /api/scm/vendor-portal/purchase-order/:id
   */
  async getVendorPurchaseOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const order = await scmService.getVendorPurchaseOrder(id);
      
      if (!order) {
        return sendError(res, 'Purchase order not found', 404);
      }
      
      sendSuccess(res, order);
    } catch (error) {
      console.error('Error getting vendor purchase order:', error);
      sendError(res, error instanceof Error ? error.message : 'Failed to get vendor purchase order');
    }
  }
}

export default new SCMController();
