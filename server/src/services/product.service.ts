/**
 * Product Service
 * Business logic for product management with categorization and attributes
 */

import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { AuditService } from './audit.service';

export interface CreateProductDTO {
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  unit?: string;
  price: number;
  cost: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  gst?: number;
  supplierId?: string;
  supplierName?: string;
  expiry?: Date;
  image?: string;
  hsn?: string;
  brand?: string;
  location?: string;
  tags?: string[];
  description?: string;
  storeId?: string;
  attributes?: { attributeId: string; value: string }[];
}

export interface UpdateProductDTO {
  name?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  unit?: string;
  price?: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  gst?: number;
  supplierId?: string;
  supplierName?: string;
  expiry?: Date;
  image?: string;
  hsn?: string;
  brand?: string;
  location?: string;
  tags?: string[];
  description?: string;
  isActive?: boolean;
  attributes?: { attributeId: string; value: string }[];
}

export interface ProductSearchFilters {
  search?: string;
  categoryId?: string;
  storeId?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  lowStock?: boolean;
}

class ProductService {
  /**
   * Create a new product
   */
  async createProduct(data: CreateProductDTO, userId: string): Promise<any> {
    const { attributes, ...productData } = data;

    const product = await prisma.product.create({
      data: {
        ...productData,
        attributes: attributes
          ? {
              create: attributes.map((attr) => ({
                attributeId: attr.attributeId,
                value: attr.value,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        attributes: {
          include: {
            attribute: true,
          },
        },
      },
    });

    // Audit log
    await AuditService.log({
      userId,
      action: 'CREATE_PRODUCT',
      entity: 'Product',
      entityId: product.id,
      details: { product },
    });

    return product;
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<any> {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        attributes: {
          include: {
            attribute: true,
          },
        },
        batches: {
          where: { quantity: { gt: 0 } },
          include: { warehouse: true },
        },
      },
    });
  }

  /**
   * Get product by SKU
   */
  async getProductBySKU(sku: string): Promise<any> {
    return await prisma.product.findUnique({
      where: { sku },
      include: {
        category: true,
        attributes: {
          include: {
            attribute: true,
          },
        },
      },
    });
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<any> {
    return await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        attributes: {
          include: {
            attribute: true,
          },
        },
      },
    });
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: UpdateProductDTO, userId: string): Promise<any> {
    const { attributes, ...productData } = data;

    // Get old product for audit
    const oldProduct = await prisma.product.findUnique({ where: { id } });

    const product = await prisma.$transaction(async (tx) => {
      // Update product
      const updated = await tx.product.update({
        where: { id },
        data: productData,
        include: {
          category: true,
          attributes: {
            include: {
              attribute: true,
            },
          },
        },
      });

      // Update attributes if provided
      if (attributes) {
        // Delete existing attributes
        await tx.productAttributeValue.deleteMany({
          where: { productId: id },
        });

        // Create new attributes
        await tx.productAttributeValue.createMany({
          data: attributes.map((attr) => ({
            productId: id,
            attributeId: attr.attributeId,
            value: attr.value,
          })),
        });
      }

      return updated;
    });

    // Audit log
    await AuditService.log({
      userId,
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: id,
      details: { oldProduct, newProduct: product },
    });

    return product;
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id: string, userId: string): Promise<boolean> {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await AuditService.log({
      userId,
      action: 'DELETE_PRODUCT',
      entity: 'Product',
      entityId: id,
      details: { product },
    });

    return true;
  }

  /**
   * Search products with filters
   */
  async searchProducts(
    filters: ProductSearchFilters,
    page = 1,
    limit = 20
  ): Promise<{ products: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: filters.isActive !== undefined ? filters.isActive : true,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    if (filters.inStock) {
      where.stock = { gt: 0 };
    }

    if (filters.lowStock) {
      where.stock = { lte: prisma.product.fields.minStock };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          attributes: {
            include: {
              attribute: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(storeId?: string): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT * FROM "Product"
      WHERE stock <= "minStock"
      AND "isActive" = true
      ${storeId ? Prisma.sql`AND "storeId" = ${storeId}` : Prisma.empty}
      ORDER BY stock ASC
    `;
  }

  /**
   * Bulk update stock
   */
  async bulkUpdateStock(
    updates: { productId: string; quantity: number }[],
    userId: string
  ): Promise<void> {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.product.update({
          where: { id: update.productId },
          data: { stock: { increment: update.quantity } },
        })
      )
    );

    // Audit log
    await AuditService.log({
      userId,
      action: 'BULK_UPDATE_STOCK',
      entity: 'Product',
      entityId: undefined,
      details: { updates },
    });
  }
}

export default new ProductService();
