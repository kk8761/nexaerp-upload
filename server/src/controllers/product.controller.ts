/**
 * Product Controller
 * Handles HTTP requests for product management
 */

import { Request, Response } from 'express';
import ProductService, { CreateProductDTO, UpdateProductDTO } from '../services/product.service';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class ProductController {
  /**
   * Create a new product
   * POST /api/products
   */
  static async createProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const productData: CreateProductDTO = req.body;

      // Validation
      if (!productData.name || !productData.price || !productData.cost) {
        ResponseHandler.validationError(res, ['Name, price, and cost are required']);
        return;
      }

      // Check for duplicate SKU
      if (productData.sku) {
        const existing = await ProductService.getProductBySKU(productData.sku);
        if (existing) {
          ResponseHandler.error(res, 'Product with this SKU already exists', 409);
          return;
        }
      }

      // Check for duplicate barcode
      if (productData.barcode) {
        const existing = await ProductService.getProductByBarcode(productData.barcode);
        if (existing) {
          ResponseHandler.error(res, 'Product with this barcode already exists', 409);
          return;
        }
      }

      const product = await ProductService.createProduct(productData, userId);

      logger.info('Product created successfully', { productId: product.id, userId });
      ResponseHandler.success(res, product, 'Product created successfully', 201);
    } catch (error) {
      logger.error('Error creating product', error);
      ResponseHandler.error(res, 'Failed to create product');
    }
  }

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  static async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const product = await ProductService.getProductById(id);
      if (!product) {
        ResponseHandler.notFound(res, 'Product');
        return;
      }

      ResponseHandler.success(res, product);
    } catch (error) {
      logger.error('Error fetching product', error);
      ResponseHandler.error(res, 'Failed to fetch product');
    }
  }

  /**
   * Update product
   * PUT /api/products/:id
   */
  static async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { id } = req.params;
      const updateData: UpdateProductDTO = req.body;

      // Check if product exists
      const existing = await ProductService.getProductById(id);
      if (!existing) {
        ResponseHandler.notFound(res, 'Product');
        return;
      }

      // Check for duplicate SKU (if changing)
      if (updateData.sku && updateData.sku !== existing.sku) {
        const duplicate = await ProductService.getProductBySKU(updateData.sku);
        if (duplicate) {
          ResponseHandler.error(res, 'Product with this SKU already exists', 409);
          return;
        }
      }

      // Check for duplicate barcode (if changing)
      if (updateData.barcode && updateData.barcode !== existing.barcode) {
        const duplicate = await ProductService.getProductByBarcode(updateData.barcode);
        if (duplicate) {
          ResponseHandler.error(res, 'Product with this barcode already exists', 409);
          return;
        }
      }

      const product = await ProductService.updateProduct(id, updateData, userId);

      logger.info('Product updated successfully', { productId: id, userId });
      ResponseHandler.success(res, product, 'Product updated successfully');
    } catch (error) {
      logger.error('Error updating product', error);
      ResponseHandler.error(res, 'Failed to update product');
    }
  }

  /**
   * Delete product (soft delete)
   * DELETE /api/products/:id
   */
  static async deleteProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { id } = req.params;

      const existing = await ProductService.getProductById(id);
      if (!existing) {
        ResponseHandler.notFound(res, 'Product');
        return;
      }

      await ProductService.deleteProduct(id, userId);

      logger.info('Product deleted successfully', { productId: id, userId });
      ResponseHandler.success(res, null, 'Product deleted successfully');
    } catch (error) {
      logger.error('Error deleting product', error);
      ResponseHandler.error(res, 'Failed to delete product');
    }
  }

  /**
   * Search products with filters
   * GET /api/products
   */
  static async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters = {
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        storeId: req.query.storeId as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        inStock: req.query.inStock === 'true',
        lowStock: req.query.lowStock === 'true',
      };

      const { products, total } = await ProductService.searchProducts(filters, page, limit);

      ResponseHandler.success(res, {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error searching products', error);
      ResponseHandler.error(res, 'Failed to search products');
    }
  }

  /**
   * Get low stock products
   * GET /api/products/low-stock
   */
  static async getLowStockProducts(req: Request, res: Response): Promise<void> {
    try {
      const storeId = req.query.storeId as string;
      const products = await ProductService.getLowStockProducts(storeId);

      ResponseHandler.success(res, { products });
    } catch (error) {
      logger.error('Error fetching low stock products', error);
      ResponseHandler.error(res, 'Failed to fetch low stock products');
    }
  }

  /**
   * Bulk update stock
   * POST /api/products/bulk-stock
   */
  static async bulkUpdateStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        ResponseHandler.error(res, 'Unauthorized', 401);
        return;
      }

      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        ResponseHandler.validationError(res, ['Updates array is required']);
        return;
      }

      await ProductService.bulkUpdateStock(updates, userId);

      logger.info('Bulk stock update completed', { count: updates.length, userId });
      ResponseHandler.success(res, null, 'Stock updated successfully');
    } catch (error) {
      logger.error('Error bulk updating stock', error);
      ResponseHandler.error(res, 'Failed to update stock');
    }
  }
}
