/**
 * Order Controller
 * Handles HTTP requests for order management
 * Requirements: 1.6
 */

import { Request, Response } from 'express';
import OrderService, { CreateOrderDTO, UpdateOrderDTO, OrderState } from '../services/order.service';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class OrderController {
  /**
   * Create a new order
   * POST /api/orders
   */
  static async createOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'system';

      const orderData: CreateOrderDTO = req.body;

      // Validation
      if (!orderData.items || orderData.items.length === 0) {
        ResponseHandler.validationError(res, ['Order must have at least one item']);
        return;
      }

      for (const item of orderData.items) {
        if (!item.productName || !item.qty || !item.price) {
          ResponseHandler.validationError(res, ['Each item must have productName, qty, and price']);
          return;
        }
      }

      const order = await OrderService.createOrder(orderData, userId);

      logger.info('Order created successfully', { orderId: order.id, userId });
      ResponseHandler.success(res, order, 'Order created successfully', 201);
    } catch (error) {
      logger.error('Error creating order', error);
      ResponseHandler.error(res, 'Failed to create order');
    }
  }

  /**
   * Get order by ID
   * GET /api/orders/:id
   */
  static async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const order = await OrderService.getOrderById(id);
      if (!order) {
        ResponseHandler.notFound(res, 'Order');
        return;
      }

      ResponseHandler.success(res, order);
    } catch (error) {
      logger.error('Error fetching order', error);
      ResponseHandler.error(res, 'Failed to fetch order');
    }
  }

  /**
   * Get order by order number
   * GET /api/orders/by-number/:orderNo
   */
  static async getOrderByNumber(req: Request, res: Response): Promise<void> {
    try {
      const { orderNo } = req.params;

      const order = await OrderService.getOrderByOrderNo(orderNo);
      if (!order) {
        ResponseHandler.notFound(res, 'Order');
        return;
      }

      ResponseHandler.success(res, order);
    } catch (error) {
      logger.error('Error fetching order by number', error);
      ResponseHandler.error(res, 'Failed to fetch order');
    }
  }

  /**
   * Update order
   * PUT /api/orders/:id
   */
  static async updateOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'system';

      const { id } = req.params;
      const updateData: UpdateOrderDTO = req.body;

      const order = await OrderService.updateOrder(id, updateData, userId);

      logger.info('Order updated successfully', { orderId: id, userId });
      ResponseHandler.success(res, order, 'Order updated successfully');
    } catch (error: any) {
      logger.error('Error updating order', error);
      ResponseHandler.error(res, error.message || 'Failed to update order');
    }
  }

  /**
   * Transition order state
   * POST /api/orders/:id/transition
   */
  static async transitionState(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'system';

      const { id } = req.params;
      const { state, updatedBy } = req.body;

      if (!state) {
        ResponseHandler.validationError(res, ['State is required']);
        return;
      }

      const order = await OrderService.transitionOrderState(id, state as OrderState, userId, updatedBy);

      logger.info('Order state transitioned', { orderId: id, newState: state, userId });
      ResponseHandler.success(res, order, 'Order state updated successfully');
    } catch (error: any) {
      logger.error('Error transitioning order state', error);
      ResponseHandler.error(res, error.message || 'Failed to transition order state');
    }
  }

  /**
   * Cancel order
   * POST /api/orders/:id/cancel
   */
  static async cancelOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'system';

      const { id } = req.params;
      const { reason } = req.body;

      const order = await OrderService.cancelOrder(id, userId, reason);

      logger.info('Order cancelled', { orderId: id, userId, reason });
      ResponseHandler.success(res, order, 'Order cancelled successfully');
    } catch (error: any) {
      logger.error('Error cancelling order', error);
      ResponseHandler.error(res, error.message || 'Failed to cancel order');
    }
  }

  /**
   * Search orders with filters
   * GET /api/orders
   */
  static async searchOrders(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = {
        search: req.query.search as string,
        customerId: req.query.customerId as string,
        status: req.query.status as string,
        paymentStatus: req.query.paymentStatus as string,
        storeId: req.query.storeId as string,
        type: req.query.type as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const { orders, total } = await OrderService.searchOrders(filters, page, limit);

      ResponseHandler.success(res, {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error searching orders', error);
      ResponseHandler.error(res, 'Failed to search orders');
    }
  }

  /**
   * Get order statistics
   * GET /api/orders/statistics
   */
  static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const storeId = req.query.storeId as string;
      const statistics = await OrderService.getOrderStatistics(storeId);

      ResponseHandler.success(res, statistics);
    } catch (error) {
      logger.error('Error fetching order statistics', error);
      ResponseHandler.error(res, 'Failed to fetch order statistics');
    }
  }

  /**
   * Get recent orders
   * GET /api/orders/recent
   */
  static async getRecentOrders(req: Request, res: Response): Promise<void> {
    try {
      const storeId = req.query.storeId as string;
      const limit = parseInt(req.query.limit as string) || 10;

      const orders = await OrderService.getRecentOrders(storeId, limit);

      ResponseHandler.success(res, { orders });
    } catch (error) {
      logger.error('Error fetching recent orders', error);
      ResponseHandler.error(res, 'Failed to fetch recent orders');
    }
  }
}
