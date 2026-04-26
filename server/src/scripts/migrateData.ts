import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import {
  batchInsert,
  getTableRowCount,
  validateDataIntegrity,
  runInTransaction,
} from '../utils/migration.utils';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

// Mongoose Models (We will import the existing ones if available, but for script standalone we can define generic fetch)
const UserSchema = new mongoose.Schema({}, { strict: false });
const MongoUser = mongoose.models.User || mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({}, { strict: false });
const MongoProduct = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({}, { strict: false });
const MongoOrder = mongoose.models.Order || mongoose.model('Order', OrderSchema);

/**
 * Migrate Users from MongoDB to PostgreSQL
 */
async function migrateUsers() {
  console.log('\n🔄 Starting User migration...');
  
  const users = await MongoUser.find({}).lean();
  console.log(`Found ${users.length} users in MongoDB.`);

  if (users.length === 0) {
    console.log('No users to migrate.');
    return;
  }

  // Transform MongoDB users to PostgreSQL format
  const transformedUsers = users.map((mongoUser: any) => ({
    id: mongoUser._id?.toString(),
    name: mongoUser.name || 'Unknown',
    email: mongoUser.email,
    password: mongoUser.password || 'imported_no_password',
    role: mongoUser.role || 'cashier',
    businessName: mongoUser.businessName || null,
    businessType: mongoUser.businessType || null,
    phone: mongoUser.phone || null,
    avatar: mongoUser.avatar || null,
    storeId: mongoUser.storeId || 'store-001',
    plan: mongoUser.plan || 'free',
    isActive: typeof mongoUser.isActive === 'boolean' ? mongoUser.isActive : true,
    lastLogin: mongoUser.lastLogin ? new Date(mongoUser.lastLogin) : null,
    preferences: mongoUser.preferences ? JSON.parse(JSON.stringify(mongoUser.preferences)) : null,
    createdAt: mongoUser.createdAt ? new Date(mongoUser.createdAt) : new Date(),
    updatedAt: mongoUser.updatedAt ? new Date(mongoUser.updatedAt) : new Date(),
  }));

  // Batch insert users
  const migratedCount = await batchInsert('user', transformedUsers, 500);
  console.log(`✅ User migration completed. Migrated: ${migratedCount} users`);

  // Validate migration
  const pgUserCount = await getTableRowCount('User');
  console.log(`📊 PostgreSQL User count: ${pgUserCount}`);
}

/**
 * Migrate Products from MongoDB to PostgreSQL
 */
async function migrateProducts() {
  console.log('\n🔄 Starting Product migration...');
  
  const products = await MongoProduct.find({}).lean();
  console.log(`Found ${products.length} products in MongoDB.`);

  if (products.length === 0) {
    console.log('No products to migrate.');
    return;
  }

  // Transform MongoDB products to PostgreSQL format
  const transformedProducts = products.map((mongoProduct: any) => ({
    id: mongoProduct._id?.toString(),
    name: mongoProduct.name || 'Unknown Product',
    sku: mongoProduct.sku || null,
    barcode: mongoProduct.barcode || null,
    category: mongoProduct.category || 'General',
    unit: mongoProduct.unit || 'pcs',
    price: parseFloat(mongoProduct.price) || 0,
    cost: parseFloat(mongoProduct.cost) || 0,
    stock: parseInt(mongoProduct.stock) || 0,
    minStock: parseInt(mongoProduct.minStock) || 10,
    maxStock: parseInt(mongoProduct.maxStock) || 500,
    gst: parseFloat(mongoProduct.gst) || 12,
    supplierId: mongoProduct.supplierId || null,
    supplierName: mongoProduct.supplierName || null,
    expiry: mongoProduct.expiry ? new Date(mongoProduct.expiry) : null,
    image: mongoProduct.image || '📦',
    isActive: typeof mongoProduct.isActive === 'boolean' ? mongoProduct.isActive : true,
    storeId: mongoProduct.storeId || 'store-001',
    hsn: mongoProduct.hsn || null,
    brand: mongoProduct.brand || null,
    location: mongoProduct.location || null,
    tags: Array.isArray(mongoProduct.tags) ? mongoProduct.tags : [],
    createdAt: mongoProduct.createdAt ? new Date(mongoProduct.createdAt) : new Date(),
    updatedAt: mongoProduct.updatedAt ? new Date(mongoProduct.updatedAt) : new Date(),
  }));

  // Batch insert products
  const migratedCount = await batchInsert('product', transformedProducts, 500);
  console.log(`✅ Product migration completed. Migrated: ${migratedCount} products`);

  // Validate migration
  const pgProductCount = await getTableRowCount('Product');
  console.log(`📊 PostgreSQL Product count: ${pgProductCount}`);
}

/**
 * Migrate Orders from MongoDB to PostgreSQL
 */
async function migrateOrders() {
  console.log('\n🔄 Starting Order migration...');
  
  const orders = await MongoOrder.find({}).lean();
  console.log(`Found ${orders.length} orders in MongoDB.`);

  if (orders.length === 0) {
    console.log('No orders to migrate.');
    return;
  }

  // Use transaction for orders and order items
  await runInTransaction(async (tx) => {
    for (const mongoOrder of orders) {
      try {
        // Create order
        const order = await tx.order.create({
          data: {
            id: mongoOrder._id?.toString(),
            orderNo: mongoOrder.orderNo || `ORD-${Date.now()}`,
            type: mongoOrder.type || 'sale',
            customerId: mongoOrder.customerId || null,
            customerName: mongoOrder.customerName || 'Walk-in Customer',
            customerPhone: mongoOrder.customerPhone || null,
            subtotal: parseFloat(mongoOrder.subtotal) || 0,
            discount: parseFloat(mongoOrder.discount) || 0,
            discountType: mongoOrder.discountType || 'flat',
            taxAmount: parseFloat(mongoOrder.taxAmount) || 0,
            total: parseFloat(mongoOrder.total) || 0,
            paymentMode: mongoOrder.paymentMode || 'cash',
            paymentStatus: mongoOrder.paymentStatus || 'paid',
            amountPaid: parseFloat(mongoOrder.amountPaid) || 0,
            changeDue: parseFloat(mongoOrder.changeDue) || 0,
            status: mongoOrder.status || 'completed',
            invoiceNo: mongoOrder.invoiceNo || null,
            gstDetails: mongoOrder.gstDetails ? JSON.parse(JSON.stringify(mongoOrder.gstDetails)) : null,
            storeId: mongoOrder.storeId || 'store-001',
            cashierId: mongoOrder.cashierId || null,
            cashierName: mongoOrder.cashierName || null,
            notes: mongoOrder.notes || null,
            tags: Array.isArray(mongoOrder.tags) ? mongoOrder.tags : [],
            createdAt: mongoOrder.createdAt ? new Date(mongoOrder.createdAt) : new Date(),
            updatedAt: mongoOrder.updatedAt ? new Date(mongoOrder.updatedAt) : new Date(),
          },
        });

        // Create order items
        if (Array.isArray(mongoOrder.items) && mongoOrder.items.length > 0) {
          const orderItems = mongoOrder.items.map((item: any) => ({
            orderId: order.id,
            productId: item.productId || null,
            productName: item.productName || 'Unknown',
            sku: item.sku || null,
            unit: item.unit || null,
            image: item.image || null,
            qty: parseFloat(item.qty) || 0,
            price: parseFloat(item.price) || 0,
            cost: parseFloat(item.cost) || 0,
            gst: parseFloat(item.gst) || 0,
            discount: parseFloat(item.discount) || 0,
            subtotal: parseFloat(item.subtotal) || 0,
            gstAmount: parseFloat(item.gstAmount) || 0,
          }));

          await tx.orderItem.createMany({
            data: orderItems,
          });
        }
      } catch (error) {
        console.error(`❌ Failed to migrate order ${mongoOrder.orderNo}:`, error);
        throw error;
      }
    }
  });

  console.log(`✅ Order migration completed.`);

  // Validate migration
  const pgOrderCount = await getTableRowCount('Order');
  const pgOrderItemCount = await getTableRowCount('OrderItem');
  console.log(`📊 PostgreSQL Order count: ${pgOrderCount}`);
  console.log(`📊 PostgreSQL OrderItem count: ${pgOrderItemCount}`);
}

/**
 * Validate migration integrity
 */
async function validateMigration() {
  console.log('\n🔍 Validating migration integrity...');

  // Validate users
  const userValidation = await validateDataIntegrity('user', (user: any) => {
    return user.email && user.name && user.password;
  });
  console.log(`Users - Valid: ${userValidation.valid}, Invalid: ${userValidation.invalid}`);

  // Validate products
  const productValidation = await validateDataIntegrity('product', (product: any) => {
    return product.name && product.price >= 0 && product.stock >= 0;
  });
  console.log(`Products - Valid: ${productValidation.valid}, Invalid: ${productValidation.invalid}`);

  // Validate orders
  const orderValidation = await validateDataIntegrity('order', (order: any) => {
    return order.orderNo && order.total >= 0;
  });
  console.log(`Orders - Valid: ${orderValidation.valid}, Invalid: ${orderValidation.invalid}`);

  if (
    userValidation.invalid === 0 &&
    productValidation.invalid === 0 &&
    orderValidation.invalid === 0
  ) {
    console.log('✅ All data validation passed!');
  } else {
    console.warn('⚠️ Some data validation issues found. Review the errors.');
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  const startTime = Date.now();
  
  try {
    console.log('========================================');
    console.log('🚀 Starting MongoDB to PostgreSQL Migration');
    console.log('========================================');

    // 1. Connect to MongoDB
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Connect to PostgreSQL
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL');

    // 3. Run migrations in order
    await migrateUsers();
    await migrateProducts();
    await migrateOrders();

    // 4. Validate migration
    await validateMigration();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n========================================');
    console.log(`🎉 All migrations completed successfully in ${duration}s!`);
    console.log('========================================');
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ Migration failed:', error);
    console.error('========================================');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  runMigration();
}

export default runMigration;
