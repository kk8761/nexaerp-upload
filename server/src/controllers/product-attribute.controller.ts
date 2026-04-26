/**
 * Product Attribute Controller
 * Handles HTTP requests for product attribute management
 */

import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';
import { AuditService } from '../services/audit.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class ProductAttributeController {
  /**
   * Create a new attribute
   * POST /api/products/attributes
   */
  static async createAttribute(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { name, dataType, options, isRequired } = req.body;

      if (!name || !dataType) {
        ResponseHandler.validationError(res, ['Name and dataType are required']);
        return;
      }

      const validDataTypes = ['text', 'number', 'boolean', 'date', 'select'];
      if (!validDataTypes.includes(dataType)) {
        ResponseHandler.validationError(res, ['Invalid dataType']);
        return;
      }

      const attribute = await prisma.productAttribute.create({
        data: { name, dataType, options: options || [], isRequired: isRequired || false },
      });

      await AuditService.log({
        userId,
        action: 'CREATE_PRODUCT_ATTRIBUTE',
        entity: 'ProductAttribute',
        entityId: attribute.id,
        details: { attribute },
      });

      logger.info('Product attribute created', { attributeId: attribute.id, userId });
      ResponseHandler.success(res, attribute, 'Attribute created successfully', 201);
    } catch (error) {
      logger.error('Error creating attribute', error);
      ResponseHandler.error(res, 'Failed to create attribute');
    }
  }

  /**
   * Get all attributes
   * GET /api/products/attributes
   */
  static async getAttributes(_req: Request, res: Response): Promise<void> {
    try {
      const attributes = await prisma.productAttribute.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      ResponseHandler.success(res, { attributes });
    } catch (error) {
      logger.error('Error fetching attributes', error);
      ResponseHandler.error(res, 'Failed to fetch attributes');
    }
  }

  /**
   * Get attribute by ID
   * GET /api/products/attributes/:id
   */
  static async getAttribute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const attribute = await prisma.productAttribute.findUnique({
        where: { id },
        include: {
          _count: {
            select: { productValues: true },
          },
        },
      });

      if (!attribute) {
        ResponseHandler.notFound(res, 'Attribute');
        return;
      }

      ResponseHandler.success(res, attribute);
    } catch (error) {
      logger.error('Error fetching attribute', error);
      ResponseHandler.error(res, 'Failed to fetch attribute');
    }
  }

  /**
   * Update attribute
   * PUT /api/products/attributes/:id
   */
  static async updateAttribute(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { id } = req.params;
      const { name, dataType, options, isRequired, isActive } = req.body;

      const existing = await prisma.productAttribute.findUnique({ where: { id } });
      if (!existing) {
        ResponseHandler.notFound(res, 'Attribute');
        return;
      }

      const attribute = await prisma.productAttribute.update({
        where: { id },
        data: { name, dataType, options, isRequired, isActive },
      });

      await AuditService.log({
        userId,
        action: 'UPDATE_PRODUCT_ATTRIBUTE',
        entity: 'ProductAttribute',
        entityId: id,
        details: { oldAttribute: existing, newAttribute: attribute },
      });

      logger.info('Product attribute updated', { attributeId: id, userId });
      ResponseHandler.success(res, attribute, 'Attribute updated successfully');
    } catch (error) {
      logger.error('Error updating attribute', error);
      ResponseHandler.error(res, 'Failed to update attribute');
    }
  }

  /**
   * Delete attribute
   * DELETE /api/products/attributes/:id
   */
  static async deleteAttribute(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { id } = req.params;

      const existing = await prisma.productAttribute.findUnique({
        where: { id },
        include: { _count: { select: { productValues: true } } },
      });

      if (!existing) {
        ResponseHandler.notFound(res, 'Attribute');
        return;
      }

      // Check if attribute is used by products
      if (existing._count.productValues > 0) {
        ResponseHandler.error(res, 'Cannot delete attribute used by products', 400);
        return;
      }

      await prisma.productAttribute.delete({ where: { id } });

      await AuditService.log({
        userId,
        action: 'DELETE_PRODUCT_ATTRIBUTE',
        entity: 'ProductAttribute',
        entityId: id,
        details: { attribute: existing },
      });

      logger.info('Product attribute deleted', { attributeId: id, userId });
      ResponseHandler.success(res, null, 'Attribute deleted successfully');
    } catch (error) {
      logger.error('Error deleting attribute', error);
      ResponseHandler.error(res, 'Failed to delete attribute');
    }
  }
}
