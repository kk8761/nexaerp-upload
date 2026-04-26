/**
 * Product Routes
 * API routes for product management
 */

import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { ProductCategoryController } from '../controllers/product-category.controller';
import { ProductAttributeController } from '../controllers/product-attribute.controller';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac.middleware';

const router = Router();

// ─── Product Routes ────────────────────────────────────────

// Get low stock products (before :id route to avoid conflict)
router.get(
  '/low-stock',
  authenticate,
  checkPermission('product', 'read'),
  ProductController.getLowStockProducts
);

// Bulk operations
router.post(
  '/bulk-stock',
  authenticate,
  checkPermission('product', 'update'),
  ProductController.bulkUpdateStock
);

// CRUD operations
router.post(
  '/',
  authenticate,
  checkPermission('product', 'create'),
  ProductController.createProduct
);

router.get(
  '/',
  authenticate,
  checkPermission('product', 'read'),
  ProductController.searchProducts
);

router.get(
  '/:id',
  authenticate,
  checkPermission('product', 'read'),
  ProductController.getProduct
);

router.put(
  '/:id',
  authenticate,
  checkPermission('product', 'update'),
  ProductController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  checkPermission('product', 'delete'),
  ProductController.deleteProduct
);

// ─── Category Routes ───────────────────────────────────────

router.post(
  '/categories',
  authenticate,
  checkPermission('product', 'create'),
  ProductCategoryController.createCategory
);

router.get(
  '/categories',
  authenticate,
  checkPermission('product', 'read'),
  ProductCategoryController.getCategories
);

router.get(
  '/categories/:id',
  authenticate,
  checkPermission('product', 'read'),
  ProductCategoryController.getCategory
);

router.put(
  '/categories/:id',
  authenticate,
  checkPermission('product', 'update'),
  ProductCategoryController.updateCategory
);

router.delete(
  '/categories/:id',
  authenticate,
  checkPermission('product', 'delete'),
  ProductCategoryController.deleteCategory
);

// ─── Attribute Routes ──────────────────────────────────────

router.post(
  '/attributes',
  authenticate,
  checkPermission('product', 'create'),
  ProductAttributeController.createAttribute
);

router.get(
  '/attributes',
  authenticate,
  checkPermission('product', 'read'),
  ProductAttributeController.getAttributes
);

router.get(
  '/attributes/:id',
  authenticate,
  checkPermission('product', 'read'),
  ProductAttributeController.getAttribute
);

router.put(
  '/attributes/:id',
  authenticate,
  checkPermission('product', 'update'),
  ProductAttributeController.updateAttribute
);

router.delete(
  '/attributes/:id',
  authenticate,
  checkPermission('product', 'delete'),
  ProductAttributeController.deleteAttribute
);

export default router;
