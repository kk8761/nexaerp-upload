/**
 * Order Service
 * Business logic for order management with state machine
 * Requirements: 1.6
 */

import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { AuditService } from './audit.service';

// Order state machine transitions
export const ORDER_STATES = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderState = typeof ORDER_STATES[keyof typeof ORDER_STATES];

// Valid state transitions
const STATE_TRANSITIONS: Record<OrderState, OrderState[]> = {
  [ORDER_STATES.DRAFT]: [ORDER_STATES.CONFIRMED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.CONFIRMED]: [ORDER_STATES.PROCESSING, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PROCESSING]: [ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.SHIPPED]: [ORDER_STATES.DELIVERED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.DELIVERED]: [ORDER_STATES.COMPLETED],
  [ORDER_STATES.COMPLETED]: [],
  [ORDER_STATES.CANCELLED]: [],
};

export interface CreateOrderDTO {
  type?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: {
    productId?: string;
    productName: string;
    sku?: string;
    unit?: string;
    image?: string;
    qty: number;
    price: number;
    cost?: number;
    gst?: number;
    discount?: number;
  }[];
  discount?: number;
  discountType?: string;
  paymentMode?: string;
  paymentStatus?: string;
  amountPaid?: number;
  notes?: string;
  tags?: string[];
  storeId?: string;
  cashierId?: string;
  cashierName?: string;
}

export interface UpdateOrderDTO {
  customerName?: string;
  customerPhone?: string;
  paymentMode?: string;
  paymentStatus?: string;
  amountPaid?: number;
  notes?: string;
  tags?: string[];
}

export interface OrderSearchFilters {
  search?: string;
  customerId?: string;
  status?: string;
  paymentStatus?: string;
  storeId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: string;
}

class OrderService {
  /**
   * Create a new order
   */
  async createOrder(data: CreateOrderDTO, userId: string): Promise<any> {
    const { items, ...orderData } = data;

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const orderItems = items.map((item) => {
      const itemSubtotal = item.qty * item.price;
      const itemDiscount = item.discount || 0;
      const itemGstAmount = ((itemSubtotal - itemDiscount) * (item.gst || 0)) / 100;

      subtotal += itemSubtotal;
      taxAmount += itemGstAmount;

      return {
        productId: item.productId || null,
        productName: item.productName,
        sku: item.sku || null,
        unit: item.unit || null,
        image: item.image || null,
        qty: item.qty,
        price: item.price,
        cost: item.cost || null,
        gst: item.gst || 0,
        discount: itemDiscount,
        subtotal: itemSubtotal,
        gstAmount: itemGstAmount,
      };
    });

    const discount = orderData.discount || 0;
    const total = subtotal - discount + taxAmount;
    const changeDue = (orderData.amountPaid || 0) - total;

    // Generate order number
    const year = new Date().getFullYear();
    const count = await prisma.order.count({ where: { storeId: orderData.storeId || 'store-001' } });
    const orderNo = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
    const invoiceNo = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNo,
        invoiceNo,
        type: orderData.type || 'sale',
        customerId: orderData.customerId || null,
        customerName: orderData.customerName || 'Walk-in Customer',
        customerPhone: orderData.customerPhone || null,
        subtotal,
        discount,
        discountType: orderData.discountType || 'flat',
        taxAmount,
        total,
        paymentMode: orderData.paymentMode || 'cash',
        paymentStatus: orderData.paymentStatus || 'paid',
        amountPaid: orderData.amountPaid || 0,
        changeDue,
        status: ORDER_STATES.DRAFT,
        storeId: orderData.storeId || 'store-001',
        cashierId: orderData.cashierId || null,
        cashierName: orderData.cashierName || null,
        notes: orderData.notes || null,
        tags: orderData.tags || [],
        items: {
          create: orderItems,
        },
        trackingStages: {
          create: [
            { stage: 'Order Created', status: 'pending', timestamp: new Date() },
            { stage: 'Payment', status: 'pending' },
            { stage: 'Processing', status: 'pending' },
            { stage: 'Shipped', status: 'pending' },
            { stage: 'Delivered', status: 'pending' },
          ],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        trackingStages: true,
      },
    });

    // Update product inventory
    for (const item of items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }
    }

    // Audit log
    await AuditService.log({
      userId,
      action: 'CREATE_ORDER',
      entity: 'Order',
      entityId: order.id,
      details: { order },
    });

    return order;
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<any> {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        trackingStages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  /**
   * Get order by order number
   */
  async getOrderByOrderNo(orderNo: string): Promise<any> {
    return await prisma.order.findUnique({
      where: { orderNo },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        trackingStages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  /**
   * Update order
   */
  async updateOrder(id: string, data: UpdateOrderDTO, userId: string): Promise<any> {
    // Get old order for audit
    const oldOrder = await prisma.order.findUnique({ where: { id } });

    if (!oldOrder) {
      throw new Error('Order not found');
    }

    // Cannot update completed or cancelled orders
    if (oldOrder.status === ORDER_STATES.COMPLETED || oldOrder.status === ORDER_STATES.CANCELLED) {
      throw new Error('Cannot update completed or cancelled orders');
    }

    const order = await prisma.order.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        trackingStages: true,
      },
    });

    // Audit log
    await AuditService.log({
      userId,
      action: 'UPDATE_ORDER',
      entity: 'Order',
      entityId: id,
      details: { oldOrder, newOrder: order },
    });

    return order;
  }

  /**
   * Transition order state
   */
  async transitionOrderState(
    id: string,
    newState: OrderState,
    userId: string,
    updatedBy?: string
  ): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { trackingStages: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const currentState = order.status as OrderState;

    // Validate state transition
    const allowedTransitions = STATE_TRANSITIONS[currentState];
    if (!allowedTransitions.includes(newState)) {
      throw new Error(`Invalid state transition from ${currentState} to ${newState}`);
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: newState,
        trackingStages: {
          updateMany: {
            where: {
              stage: this.getStageNameForState(newState),
            },
            data: {
              status: 'done',
              timestamp: new Date(),
              updatedBy: updatedBy || userId,
            },
          },
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        trackingStages: true,
      },
    });

    // Audit log
    await AuditService.log({
      userId,
      action: 'TRANSITION_ORDER_STATE',
      entity: 'Order',
      entityId: id,
      details: { oldState: currentState, newState, updatedBy },
    });

    return updatedOrder;
  }

  /**
   * Get stage name for state
   */
  private getStageNameForState(state: OrderState): string {
    const stageMap: Record<OrderState, string> = {
      [ORDER_STATES.DRAFT]: 'Order Created',
      [ORDER_STATES.CONFIRMED]: 'Payment',
      [ORDER_STATES.PROCESSING]: 'Processing',
      [ORDER_STATES.SHIPPED]: 'Shipped',
      [ORDER_STATES.DELIVERED]: 'Delivered',
      [ORDER_STATES.COMPLETED]: 'Delivered',
      [ORDER_STATES.CANCELLED]: 'Order Created',
    };
    return stageMap[state];
  }

  /**
   * Cancel order
   */
  async cancelOrder(id: string, userId: string, reason?: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Cannot cancel completed orders
    if (order.status === ORDER_STATES.COMPLETED) {
      throw new Error('Cannot cancel completed orders');
    }

    // Restore inventory
    for (const item of order.items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: ORDER_STATES.CANCELLED,
        notes: reason ? `${order.notes || ''}\nCancellation reason: ${reason}` : order.notes,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        trackingStages: true,
      },
    });

    // Audit log
    await AuditService.log({
      userId,
      action: 'CANCEL_ORDER',
      entity: 'Order',
      entityId: id,
      details: { order: updatedOrder, reason },
    });

    return updatedOrder;
  }

  /**
   * Search orders with filters
   */
  async searchOrders(
    filters: OrderSearchFilters,
    page = 1,
    limit = 20
  ): Promise<{ orders: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (filters.search) {
      where.OR = [
        { orderNo: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customerPhone: { contains: filters.search, mode: 'insensitive' } },
        { invoiceNo: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          trackingStages: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(storeId?: string): Promise<any> {
    const where: Prisma.OrderWhereInput = storeId ? { storeId } : {};

    const [totalOrders, totalRevenue, pendingOrders, completedOrders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where: { ...where, status: { not: ORDER_STATES.CANCELLED } },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: { ...where, status: { in: [ORDER_STATES.DRAFT, ORDER_STATES.CONFIRMED] } },
      }),
      prisma.order.count({ where: { ...where, status: ORDER_STATES.COMPLETED } }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      pendingOrders,
      completedOrders,
    };
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(storeId?: string, limit = 10): Promise<any[]> {
    const where: Prisma.OrderWhereInput = storeId ? { storeId } : {};

    return await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new OrderService();
