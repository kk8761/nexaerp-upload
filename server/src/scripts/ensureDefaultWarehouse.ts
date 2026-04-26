/**
 * Ensure Default Warehouse Exists
 * Creates a default warehouse if it doesn't exist
 */

import prisma from '../config/prisma';

export async function ensureDefaultWarehouse(): Promise<string> {
  try {
    // Check if default warehouse exists
    let warehouse = await prisma.warehouse.findFirst({
      where: {
        code: 'DEFAULT'
      }
    });

    // Create if it doesn't exist
    if (!warehouse) {
      console.log('Creating default warehouse...');
      warehouse = await prisma.warehouse.create({
        data: {
          code: 'DEFAULT',
          name: 'Default Warehouse',
          address: 'Main Location',
          storeId: 'store-001'
        }
      });
      console.log(`✅ Created default warehouse: ${warehouse.id}`);
    }

    return warehouse.id;
  } catch (error) {
    console.error('Error ensuring default warehouse:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  ensureDefaultWarehouse()
    .then((warehouseId) => {
      console.log(`Default warehouse ID: ${warehouseId}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to ensure default warehouse:', error);
      process.exit(1);
    });
}
