/**
 * Product Category Controller
 * Handles HTTP requests for product category management
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

export class ProductCategoryController {
  /**
   * Create a new category
   * POST /api/products/categories
   */
  static async createCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { name, description, parentId } = req.body;

      if (!name) {
        ResponseHandler.validationError(res, ['Name is required']);
        return;
      }

      const category = await prisma.productCategory.create({
        data: { name, description, parentId },
        include: { parent: true, children: true },
      });

      await AuditService.log({
        userId,
        action: 'CREATE_PRODUCT_CATEGORY',
        entity: 'ProductCategory',
        entityId: category.id,
        details: { category },
      });

      logger.info('Product category created', { categoryId: category.id, userId });
      ResponseHandler.success(res, category, 'Category created successfully', 201);
    } catch (error) {
      logger.error('Error creating category', error);
      ResponseHandler.error(res, 'Failed to create category');
    }
  }

  /**
   * Get all categories (hierarchical)
   * GET /api/products/categories
   */
  static async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await prisma.productCategory.findMany({
        where: { isActive: true },
        include: {
          parent: true,
          children: true,
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      ResponseHandler.success(res, { categories });
    } catch (error) {
      logger.error('Error fetching categories', error);
      ResponseHandler.error(res, 'Failed to fetch categories');
    }
  }

  /**
   * Get category by ID
   * GET /api/products/categories/:id
   */
  static async getCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const category = await prisma.productCategory.findUnique({
        where: { id },
        include: {
          parent: true,
          children: true,
          products: {
            where: { isActive: true },
            take: 10,
          },
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        ResponseHandler.notFound(res, 'Category');
        return;
      }

      ResponseHandler.success(res, category);
    } catch (error) {
      logger.error('Error fetching category', error);
      ResponseHandler.error(res, 'Failed to fetch category');
    }
  }

  /**
   * Update category
   * PUT /api/products/categories/:id
   */
  static async updateCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { id } = req.params;
      const { name, description, parentId, isActive } = req.body;

      const existing = await prisma.productCategory.findUnique({ where: { id } });
      if (!existing) {
        ResponseHandler.notFound(res, 'Category');
        return;
      }

      const category = await prisma.productCategory.update({
        where: { id },
        data: { name, description, parentId, isActive },
        include: { parent: true, children: true },
      });

      await AuditService.log({
        userId,
        action: 'UPDATE_PRODUCT_CATEGORY',
        entity: 'ProductCategory',
        entityId: id,
        details: { oldCategory: existing, newCategory: category },
      });

      logger.info('Product category updated', { categoryId: id, userId });
      ResponseHandler.success(res, category, 'Category updated successfully');
    } catch (error) {
      logger.error('Error updating category', error);
      ResponseHandler.error(res, 'Failed to update category');
    }
  }

  /**
   * Delete category
   * DELETE /api/products/categories/:id
   */
  static async deleteCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { id } = req.params;

      const existing = await prisma.productCategory.findUnique({
        where: { id },
        include: { _count: { select: { products: true, children: true } } },
      });

      if (!existing) {
        ResponseHandler.notFound(res, 'Category');
        return;
      }

      // Check if category has products or children
      if (existing._count.products > 0) {
        ResponseHandler.error(res, 'Cannot delete category with products', 400);
        return;
      }

      if (existing._count.children > 0) {
        ResponseHandler.error(res, 'Cannot delete category with subcategories', 400);
        return;
      }

      await prisma.productCategory.delete({ where: { id } });

      await AuditService.log({
        userId,
        action: 'DELETE_PRODUCT_CATEGORY',
        entity: 'ProductCategory',
        entityId: id,
        details: { category: existing },
      });

      logger.info('Product category deleted', { categoryId: id, userId });
      ResponseHandler.success(res, null, 'Category deleted successfully');
    } catch (error) {
      logger.error('Error deleting category', error);
      ResponseHandler.error(res, 'Failed to delete category');
    }
  }
}
