import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * RBAC Seed Data
 * Creates default roles and permissions for the ERP system
 */

export async function seedRBAC() {
  console.log('🔐 Seeding RBAC data...');

  // Define default permissions
  const permissions = [
    // User management
    { action: 'create', resource: 'user', description: 'Create new users' },
    { action: 'read', resource: 'user', description: 'View user information' },
    { action: 'update', resource: 'user', description: 'Update user information' },
    { action: 'delete', resource: 'user', description: 'Delete users' },

    // Role management
    { action: 'create', resource: 'role', description: 'Create new roles' },
    { action: 'read', resource: 'role', description: 'View roles' },
    { action: 'update', resource: 'role', description: 'Update roles' },
    { action: 'delete', resource: 'role', description: 'Delete roles' },

    // Permission management
    { action: 'read', resource: 'permission', description: 'View permissions' },

    // Product management
    { action: 'create', resource: 'product', description: 'Create products' },
    { action: 'read', resource: 'product', description: 'View products' },
    { action: 'update', resource: 'product', description: 'Update products' },
    { action: 'delete', resource: 'product', description: 'Delete products' },

    // Inventory management
    { action: 'create', resource: 'inventory', description: 'Create inventory records' },
    { action: 'read', resource: 'inventory', description: 'View inventory' },
    { action: 'update', resource: 'inventory', description: 'Update inventory' },
    { action: 'delete', resource: 'inventory', description: 'Delete inventory records' },

    // Order management
    { action: 'create', resource: 'order', description: 'Create orders' },
    { action: 'read', resource: 'order', description: 'View orders' },
    { action: 'update', resource: 'order', description: 'Update orders' },
    { action: 'delete', resource: 'order', description: 'Delete orders' },
    { action: 'approve', resource: 'order', description: 'Approve orders' },

    // Invoice management
    { action: 'create', resource: 'invoice', description: 'Create invoices' },
    { action: 'read', resource: 'invoice', description: 'View invoices' },
    { action: 'update', resource: 'invoice', description: 'Update invoices' },
    { action: 'delete', resource: 'invoice', description: 'Delete invoices' },
    { action: 'approve', resource: 'invoice', description: 'Approve invoices' },

    // Customer management
    { action: 'create', resource: 'customer', description: 'Create customers' },
    { action: 'read', resource: 'customer', description: 'View customers' },
    { action: 'update', resource: 'customer', description: 'Update customers' },
    { action: 'delete', resource: 'customer', description: 'Delete customers' },

    // Supplier management
    { action: 'create', resource: 'supplier', description: 'Create suppliers' },
    { action: 'read', resource: 'supplier', description: 'View suppliers' },
    { action: 'update', resource: 'supplier', description: 'Update suppliers' },
    { action: 'delete', resource: 'supplier', description: 'Delete suppliers' },

    // Financial management
    { action: 'create', resource: 'transaction', description: 'Create financial transactions' },
    { action: 'read', resource: 'transaction', description: 'View transactions' },
    { action: 'update', resource: 'transaction', description: 'Update transactions' },
    { action: 'approve', resource: 'transaction', description: 'Approve transactions' },

    // Report access
    { action: 'read', resource: 'report', description: 'View reports' },
    { action: 'create', resource: 'report', description: 'Create custom reports' },

    // Audit log access
    { action: 'read', resource: 'audit', description: 'View audit logs' },
  ];

  // Create permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        action_resource: {
          action: perm.action,
          resource: perm.resource,
        },
      },
      update: {},
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // Define default roles
  const roles = [
    {
      name: 'admin',
      description: 'System administrator with full access',
      isSystem: true,
      permissions: permissions.map((p) => ({ action: p.action, resource: p.resource })),
    },
    {
      name: 'manager',
      description: 'Manager with approval rights',
      isSystem: true,
      permissions: [
        { action: 'read', resource: 'user' },
        { action: 'read', resource: 'product' },
        { action: 'create', resource: 'product' },
        { action: 'update', resource: 'product' },
        { action: 'read', resource: 'inventory' },
        { action: 'update', resource: 'inventory' },
        { action: 'read', resource: 'order' },
        { action: 'approve', resource: 'order' },
        { action: 'read', resource: 'invoice' },
        { action: 'approve', resource: 'invoice' },
        { action: 'read', resource: 'customer' },
        { action: 'create', resource: 'customer' },
        { action: 'update', resource: 'customer' },
        { action: 'read', resource: 'supplier' },
        { action: 'read', resource: 'transaction' },
        { action: 'approve', resource: 'transaction' },
        { action: 'read', resource: 'report' },
      ],
    },
    {
      name: 'cashier',
      description: 'Cashier with sales and order management',
      isSystem: true,
      permissions: [
        { action: 'read', resource: 'product' },
        { action: 'read', resource: 'inventory' },
        { action: 'create', resource: 'order' },
        { action: 'read', resource: 'order' },
        { action: 'update', resource: 'order' },
        { action: 'create', resource: 'invoice' },
        { action: 'read', resource: 'invoice' },
        { action: 'read', resource: 'customer' },
        { action: 'create', resource: 'customer' },
        { action: 'create', resource: 'transaction' },
        { action: 'read', resource: 'transaction' },
      ],
    },
    {
      name: 'warehouse',
      description: 'Warehouse staff with inventory management',
      isSystem: true,
      permissions: [
        { action: 'read', resource: 'product' },
        { action: 'read', resource: 'inventory' },
        { action: 'create', resource: 'inventory' },
        { action: 'update', resource: 'inventory' },
        { action: 'read', resource: 'order' },
        { action: 'update', resource: 'order' },
        { action: 'read', resource: 'supplier' },
      ],
    },
    {
      name: 'accountant',
      description: 'Accountant with financial management',
      isSystem: true,
      permissions: [
        { action: 'read', resource: 'invoice' },
        { action: 'create', resource: 'invoice' },
        { action: 'update', resource: 'invoice' },
        { action: 'read', resource: 'transaction' },
        { action: 'create', resource: 'transaction' },
        { action: 'update', resource: 'transaction' },
        { action: 'read', resource: 'customer' },
        { action: 'read', resource: 'supplier' },
        { action: 'read', resource: 'report' },
        { action: 'create', resource: 'report' },
      ],
    },
    {
      name: 'viewer',
      description: 'Read-only access to most resources',
      isSystem: true,
      permissions: [
        { action: 'read', resource: 'product' },
        { action: 'read', resource: 'inventory' },
        { action: 'read', resource: 'order' },
        { action: 'read', resource: 'invoice' },
        { action: 'read', resource: 'customer' },
        { action: 'read', resource: 'supplier' },
        { action: 'read', resource: 'report' },
      ],
    },
  ];

  // Create roles and assign permissions
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        name: roleData.name,
        description: roleData.description,
        isSystem: roleData.isSystem,
      },
    });

    // Assign permissions to role
    for (const perm of roleData.permissions) {
      const permission = await prisma.permission.findUnique({
        where: {
          action_resource: {
            action: perm.action,
            resource: perm.resource,
          },
        },
      });

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }

    console.log(`✅ Created role: ${roleData.name} with ${roleData.permissions.length} permissions`);
  }

  console.log('✅ RBAC seed completed');
}

// Run seed if called directly
if (require.main === module) {
  seedRBAC()
    .catch((e) => {
      console.error('❌ RBAC seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
