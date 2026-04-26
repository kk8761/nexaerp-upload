# Product Module Migration Guide

## Overview

This document describes the migration of the Product module from MongoDB to PostgreSQL with enhanced features including:
- Product categorization (hierarchical categories)
- Product attributes (custom fields)
- RBAC integration
- Audit logging
- Barcode/SKU support

## Database Changes

### New Tables

1. **ProductCategory**
   - Hierarchical category structure with parent-child relationships
   - Supports unlimited nesting levels
   - Tracks product count per category

2. **ProductAttribute**
   - Define custom attributes for products
   - Supports multiple data types: text, number, boolean, date, select
   - Can be marked as required

3. **ProductAttributeValue**
   - Stores attribute values for each product
   - Links products to their attribute values

### Updated Tables

1. **Product**
   - Changed `category` from String to relation with ProductCategory
   - Added `categoryId` foreign key
   - Added `description` field
   - Made `sku` and `barcode` unique
   - Added indexes for better query performance

## Migration Steps

### 1. Run Database Migration

```bash
cd server
npx prisma migrate dev --name add-product-categorization-and-attributes
```

This will:
- Create new tables: ProductCategory, ProductAttribute, ProductAttributeValue
- Update Product table schema
- Add necessary indexes and constraints

### 2. Migrate Existing Data (if needed)

If you have existing products with string categories, run this migration script:

```typescript
// scripts/migrate-product-categories.ts
import prisma from '../src/config/prisma';

async function migrateCategories() {
  // Get all unique categories from existing products
  const products = await prisma.product.findMany({
    select: { category: true }
  });

  const uniqueCategories = [...new Set(products.map(p => p.category))];

  // Create category records
  for (const categoryName of uniqueCategories) {
    if (categoryName) {
      const category = await prisma.productCategory.create({
        data: { name: categoryName }
      });

      // Update products with this category
      await prisma.product.updateMany({
        where: { category: categoryName },
        data: { categoryId: category.id }
      });
    }
  }

  console.log(`Migrated ${uniqueCategories.length} categories`);
}

migrateCategories();
```

### 3. Update Environment Variables

Ensure your `.env` file has:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nexaerp"
JWT_SECRET="your-secret-key"
```

### 4. Seed RBAC Permissions

Add product permissions to your RBAC seed:

```typescript
// Add to prisma/seeds/rbac.seed.ts

const productPermissions = [
  { action: 'create', resource: 'product' },
  { action: 'read', resource: 'product' },
  { action: 'update', resource: 'product' },
  { action: 'delete', resource: 'product' },
];

// Create permissions and assign to roles
```

## API Endpoints

### Products

- `POST /api/products` - Create product
- `GET /api/products` - List products with filters
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product (soft delete)
- `GET /api/products/low-stock` - Get low stock products
- `POST /api/products/bulk-stock` - Bulk update stock

### Categories

- `POST /api/products/categories` - Create category
- `GET /api/products/categories` - List categories
- `GET /api/products/categories/:id` - Get category details
- `PUT /api/products/categories/:id` - Update category
- `DELETE /api/products/categories/:id` - Delete category

### Attributes

- `POST /api/products/attributes` - Create attribute
- `GET /api/products/attributes` - List attributes
- `GET /api/products/attributes/:id` - Get attribute details
- `PUT /api/products/attributes/:id` - Update attribute
- `DELETE /api/products/attributes/:id` - Delete attribute

## View Routes

- `GET /products` - Product list page
- `GET /products/new` - Create product form
- `GET /products/:id` - Product detail page
- `GET /products/:id/edit` - Edit product form
- `GET /products/categories` - Category management page
- `GET /products/attributes` - Attribute management page

## Features

### 1. Product Categorization

Products can be organized in hierarchical categories:

```typescript
// Create parent category
const electronics = await prisma.productCategory.create({
  data: { name: 'Electronics' }
});

// Create child category
const laptops = await prisma.productCategory.create({
  data: { 
    name: 'Laptops',
    parentId: electronics.id
  }
});
```

### 2. Product Attributes

Define custom attributes for products:

```typescript
// Create attribute
const warranty = await prisma.productAttribute.create({
  data: {
    name: 'Warranty Period',
    dataType: 'select',
    options: ['1 Year', '2 Years', '3 Years'],
    isRequired: true
  }
});

// Assign to product
await prisma.productAttributeValue.create({
  data: {
    productId: product.id,
    attributeId: warranty.id,
    value: '2 Years'
  }
});
```

### 3. Search and Filtering

Advanced search capabilities:

```typescript
const { products, total } = await ProductService.searchProducts({
  search: 'laptop',
  categoryId: 'category-id',
  minPrice: 500,
  maxPrice: 2000,
  inStock: true,
  lowStock: false
}, page, limit);
```

### 4. RBAC Integration

All product operations are protected by RBAC:

```typescript
router.post(
  '/',
  authenticate,
  checkPermission('product', 'create'),
  ProductController.createProduct
);
```

### 5. Audit Logging

All product operations are logged:

```typescript
await AuditService.log({
  userId,
  action: 'CREATE_PRODUCT',
  entity: 'Product',
  entityId: product.id,
  details: { product }
});
```

### 6. Barcode/SKU Support

Products support unique SKU and barcode identifiers:

```typescript
// Find by SKU
const product = await ProductService.getProductBySKU('SKU-12345');

// Find by barcode
const product = await ProductService.getProductByBarcode('1234567890123');
```

## Testing

### 1. Create Test Data

```bash
# Create categories
curl -X POST http://localhost:5000/api/products/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Electronics"}'

# Create product
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "sku": "LAP-001",
    "barcode": "1234567890123",
    "categoryId": "category-id",
    "price": 999.99,
    "cost": 750.00,
    "stock": 50
  }'
```

### 2. Test Search

```bash
# Search products
curl "http://localhost:5000/api/products?search=laptop&categoryId=category-id" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test Low Stock

```bash
# Get low stock products
curl "http://localhost:5000/api/products/low-stock" \
  -H "Authorization: Bearer $TOKEN"
```

## Rollback Plan

If you need to rollback:

1. Revert Prisma schema changes
2. Run migration rollback:
   ```bash
   npx prisma migrate resolve --rolled-back add-product-categorization-and-attributes
   ```
3. Restore from database backup

## Performance Considerations

1. **Indexes**: Added indexes on frequently queried fields (sku, barcode, categoryId)
2. **Caching**: RBAC permissions are cached in Redis
3. **Pagination**: All list endpoints support pagination
4. **Query Optimization**: Uses Prisma's efficient query builder

## Security

1. **RBAC**: All endpoints protected by role-based permissions
2. **Audit Logging**: All operations logged for compliance
3. **Input Validation**: All inputs validated before processing
4. **SQL Injection**: Protected by Prisma's parameterized queries

## Next Steps

1. Create product import/export functionality
2. Add product image upload support
3. Implement product variants (size, color, etc.)
4. Add product reviews and ratings
5. Implement product bundles and kits
