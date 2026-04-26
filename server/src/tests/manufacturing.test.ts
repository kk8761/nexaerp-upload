/**
 * Manufacturing Module Tests
 * Tests for BOM, MRP, Production Orders, Material Consumption, and Quality Inspection
 */

import manufacturingService from '../services/manufacturing.service';
import prisma from '../config/prisma';

async function testManufacturingModule() {
  console.log('🧪 Testing Manufacturing Module...\n');
  
  try {
    // Cleanup any existing test data first
    console.log('🧹 Cleaning up any existing test data...');
    // Delete in correct order due to foreign key constraints
    // First, find all related records
    const testProducts = await prisma.product.findMany({
      where: {
        sku: {
          in: ['FG-001', 'RM-001', 'RM-002']
        }
      },
      include: {
        bom: true
      }
    });
    
    const bomIds = testProducts.filter(p => p.bom).map(p => p.bom!.id);
    
    // Delete production orders and related records
    if (bomIds.length > 0) {
      const productionOrders = await prisma.productionOrder.findMany({
        where: {
          bomId: {
            in: bomIds
          }
        }
      });
      
      for (const po of productionOrders) {
        await prisma.qualityInspection.deleteMany({ where: { productionOrderId: po.id } });
        await prisma.materialConsumption.deleteMany({ where: { productionOrderId: po.id } });
        await prisma.productionOrderOperation.deleteMany({ where: { productionOrderId: po.id } });
      }
      
      await prisma.productionOrder.deleteMany({
        where: {
          bomId: {
            in: bomIds
          }
        }
      });
      
      // Delete BOM components and operations
      await prisma.bOMOperation.deleteMany({ where: { bomId: { in: bomIds } } });
      await prisma.bOMComponent.deleteMany({ where: { bomId: { in: bomIds } } });
      await prisma.billOfMaterial.deleteMany({ where: { id: { in: bomIds } } });
    }
    
    // Delete products
    await prisma.product.deleteMany({
      where: {
        sku: {
          in: ['FG-001', 'RM-001', 'RM-002']
        }
      }
    });
    
    // Delete work centers
    await prisma.workCenter.deleteMany({
      where: {
        code: 'WC-001'
      }
    });
    
    console.log('✅ Cleanup complete\n');
    
    // Setup: Create test products
    console.log('📦 Setting up test products...');
    
    // Create finished product
    const finishedProduct = await prisma.product.create({
      data: {
        sku: 'FG-001',
        name: 'Finished Product - Widget A',
        description: 'A complete widget assembly',
        price: 100,
        cost: 60,
        stock: 0,
        minStock: 10,
        reorderPoint: 15,
        reorderQty: 50,
        isActive: true
      }
    });
    
    // Create component products
    const component1 = await prisma.product.create({
      data: {
        sku: 'RM-001',
        name: 'Raw Material - Steel Plate',
        description: 'Steel plate for widget base',
        price: 20,
        cost: 15,
        stock: 100,
        minStock: 20,
        reorderPoint: 30,
        reorderQty: 100,
        isActive: true
      }
    });
    
    const component2 = await prisma.product.create({
      data: {
        sku: 'RM-002',
        name: 'Raw Material - Plastic Housing',
        description: 'Plastic housing for widget',
        price: 10,
        cost: 7,
        stock: 200,
        minStock: 50,
        reorderPoint: 75,
        reorderQty: 200,
        isActive: true
      }
    });
    
    console.log('✅ Created test products\n');
    
    // Test 1: Create Work Center
    console.log('1️⃣  Creating work center...');
    const workCenter = await manufacturingService.createWorkCenter({
      code: 'WC-001',
      name: 'Assembly Line 1',
      description: 'Main assembly line for widgets',
      capacity: 10,
      costPerHour: 50
    });
    console.log(`✅ Created work center: ${workCenter.name}\n`);
    
    // Test 2: Create BOM
    console.log('2️⃣  Creating Bill of Materials...');
    const bom = await manufacturingService.createBOM({
      name: 'BOM for Widget A',
      productId: finishedProduct.id,
      version: '1.0',
      bomType: 'production',
      baseQuantity: 1,
      baseUnit: 'pcs',
      components: [
        {
          componentProductId: component1.id,
          quantity: 2,
          unit: 'pcs',
          scrapFactor: 5,
          componentType: 'raw_material',
          mandatory: true,
          sequence: 1,
          notes: 'Steel plates for base'
        },
        {
          componentProductId: component2.id,
          quantity: 1,
          unit: 'pcs',
          scrapFactor: 2,
          componentType: 'raw_material',
          mandatory: true,
          sequence: 2,
          notes: 'Plastic housing'
        }
      ],
      operations: [
        {
          operationNumber: 10,
          operationName: 'Cut Steel',
          workCenterId: workCenter.id,
          setupTime: 15,
          runTime: 5,
          laborCost: 10,
          overheadCost: 5,
          description: 'Cut steel plates to size'
        },
        {
          operationNumber: 20,
          operationName: 'Assembly',
          workCenterId: workCenter.id,
          setupTime: 10,
          runTime: 10,
          laborCost: 15,
          overheadCost: 7,
          description: 'Assemble components'
        }
      ]
    });
    console.log(`✅ Created BOM: ${bom.name}`);
    console.log(`   Components: ${bom.components.length}`);
    console.log(`   Operations: ${bom.operations.length}`);
    console.log(`   Total Material Cost: $${bom.totalMaterialCost}`);
    console.log(`   Total Labor Cost: $${bom.totalLaborCost}\n`);
    
    // Test 3: Explode BOM
    console.log('3️⃣  Exploding BOM for 10 units...');
    const requirements = await manufacturingService.explodeBOM(bom.id, 10);
    console.log(`✅ BOM explosion complete:`);
    requirements.forEach(req => {
      console.log(`   - ${req.productName}: ${req.quantity} ${req.unit} (Level ${req.level})`);
    });
    console.log();
    
    // Test 4: Run MRP
    console.log('4️⃣  Running Material Requirements Planning...');
    const mrpRun = await manufacturingService.runMRP({
      planningHorizon: 30,
      createdBy: 'test-user',
      notes: 'Test MRP run'
    });
    console.log(`✅ MRP Run completed: ${mrpRun.runNumber}`);
    console.log(`   Status: ${mrpRun.status}`);
    console.log(`   Planning Horizon: ${mrpRun.planningHorizon} days`);
    if (mrpRun.plannedOrders) {
      const orders = Array.isArray(mrpRun.plannedOrders) ? mrpRun.plannedOrders : [];
      console.log(`   Planned Orders: ${orders.length}`);
    }
    if (mrpRun.purchaseRequisitions) {
      const prs = Array.isArray(mrpRun.purchaseRequisitions) ? mrpRun.purchaseRequisitions : [];
      console.log(`   Purchase Requisitions: ${prs.length}`);
    }
    console.log();
    
    // Test 5: Create Production Order
    console.log('5️⃣  Creating production order...');
    const productionOrder = await manufacturingService.createProductionOrder({
      bomId: bom.id,
      productId: finishedProduct.id,
      quantity: 10,
      startDate: new Date(),
      scheduledEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: 'high',
      workCenterId: workCenter.id,
      notes: 'Test production order'
    });
    console.log(`✅ Created production order: ${productionOrder.orderNumber}`);
    console.log(`   Product: ${finishedProduct.name}`);
    console.log(`   Quantity: ${productionOrder.quantity}`);
    console.log(`   Status: ${productionOrder.status}`);
    console.log(`   Operations: ${productionOrder.operations.length}\n`);
    
    // Test 6: Release Production Order
    console.log('6️⃣  Releasing production order...');
    const releasedOrder = await manufacturingService.releaseProductionOrder(productionOrder.id);
    console.log(`✅ Production order released: ${releasedOrder.status}\n`);
    
    // Test 7: Start Production Order
    console.log('7️⃣  Starting production order...');
    const startedOrder = await manufacturingService.startProductionOrder(productionOrder.id);
    console.log(`✅ Production order started: ${startedOrder.status}\n`);
    
    // Test 8: Update Operation Status
    console.log('8️⃣  Updating operation status...');
    const firstOperation = productionOrder.operations[0];
    const updatedOperation = await manufacturingService.updateOperationStatus(
      firstOperation.id,
      'in_progress',
      'operator-001'
    );
    console.log(`✅ Operation updated: ${updatedOperation.operationName} - ${updatedOperation.status}\n`);
    
    // Test 9: Record Material Consumption
    console.log('9️⃣  Recording material consumption...');
    const consumption1 = await manufacturingService.recordMaterialConsumption({
      productionOrderId: productionOrder.id,
      productId: component1.id,
      quantity: 21, // 10 units * 2 qty * 1.05 scrap factor
      unit: 'pcs',
      consumptionType: 'manual',
      consumedBy: 'operator-001',
      notes: 'Manual consumption for steel plates'
    });
    console.log(`✅ Material consumed: ${component1.name} - ${consumption1.quantity} ${consumption1.unit}\n`);
    
    // Test 10: Backflush Materials
    console.log('🔟 Backflushing materials for 5 units output...');
    const backflushedConsumptions = await manufacturingService.backflushMaterials(
      productionOrder.id,
      5,
      'operator-001'
    );
    console.log(`✅ Backflushed ${backflushedConsumptions.length} materials:`);
    backflushedConsumptions.forEach(c => {
      console.log(`   - Product ID: ${c.productId}, Quantity: ${c.quantity} ${c.unit}`);
    });
    console.log();
    
    // Test 11: Record Finished Goods Receipt
    console.log('1️⃣1️⃣  Recording finished goods receipt...');
    const receipt = await manufacturingService.recordFinishedGoodsReceipt(
      productionOrder.id,
      10,
      'operator-001'
    );
    console.log(`✅ Finished goods received: ${receipt.quantity} units\n`);
    
    // Test 12: Create Quality Inspection
    console.log('1️⃣2️⃣  Creating quality inspection...');
    const inspection = await manufacturingService.createQualityInspection({
      productionOrderId: productionOrder.id,
      productId: finishedProduct.id,
      quantity: 10,
      inspectionType: 'final',
      inspectorId: 'inspector-001',
      checkpoints: [
        { name: 'Dimensional Check', status: 'pending' },
        { name: 'Visual Inspection', status: 'pending' },
        { name: 'Functional Test', status: 'pending' }
      ],
      notes: 'Final inspection for production order'
    });
    console.log(`✅ Quality inspection created: ${inspection.inspectionNumber}`);
    console.log(`   Type: ${inspection.inspectionType}`);
    console.log(`   Status: ${inspection.status}\n`);
    
    // Test 13: Record Inspection Results
    console.log('1️⃣3️⃣  Recording inspection results...');
    const inspectionResults = await manufacturingService.recordInspectionResults(
      inspection.id,
      {
        status: 'completed',
        result: 'accept',
        checkpoints: [
          { name: 'Dimensional Check', status: 'passed', notes: 'All dimensions within tolerance' },
          { name: 'Visual Inspection', status: 'passed', notes: 'No visual defects' },
          { name: 'Functional Test', status: 'passed', notes: 'All functions working correctly' }
        ],
        defectsFound: 0,
        quarantined: false,
        notes: 'All items passed inspection'
      }
    );
    console.log(`✅ Inspection results recorded: ${inspectionResults.result}`);
    console.log(`   Defects Found: ${inspectionResults.defectsFound}`);
    console.log(`   Quarantined: ${inspectionResults.quarantined}\n`);
    
    // Test 14: Complete Production Order
    console.log('1️⃣4️⃣  Completing production order...');
    const completedOrder = await manufacturingService.completeProductionOrder(
      productionOrder.id,
      10,
      0 // no scrap
    );
    console.log(`✅ Production order completed: ${completedOrder.status}`);
    console.log(`   Actual Output: ${completedOrder.actualOutput}`);
    console.log(`   Scrap Quantity: ${completedOrder.scrapQuantity}\n`);
    
    // Test 15: List Production Orders
    console.log('1️⃣5️⃣  Listing production orders...');
    const orders = await manufacturingService.listProductionOrders({
      status: 'completed'
    });
    console.log(`✅ Found ${orders.length} completed production orders\n`);
    
    // Test 16: List Quality Inspections
    console.log('1️⃣6️⃣  Listing quality inspections...');
    const inspections = await manufacturingService.listQualityInspections({
      productId: finishedProduct.id,
      status: 'completed'
    });
    console.log(`✅ Found ${inspections.length} completed inspections\n`);
    
    // Test 17: Get Work Center Details
    console.log('1️⃣7️⃣  Getting work center details...');
    const wcDetails = await manufacturingService.getWorkCenter(workCenter.id);
    console.log(`✅ Work Center: ${wcDetails?.name}`);
    console.log(`   Capacity: ${wcDetails?.capacity} units/hour`);
    console.log(`   Cost per Hour: $${wcDetails?.costPerHour}`);
    console.log(`   Active Production Orders: ${wcDetails?.productionOrders.length}\n`);
    
    // Test 18: Update BOM Version
    console.log('1️⃣8️⃣  Updating BOM version...');
    const updatedBOM = await manufacturingService.updateBOMVersion(bom.id, '1.1');
    console.log(`✅ BOM version updated to: ${updatedBOM.version}\n`);
    
    console.log('✅ All manufacturing tests passed!\n');
    
    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.qualityInspection.deleteMany({ where: { productionOrderId: productionOrder.id } });
    await prisma.materialConsumption.deleteMany({ where: { productionOrderId: productionOrder.id } });
    await prisma.productionOrderOperation.deleteMany({ where: { productionOrderId: productionOrder.id } });
    await prisma.productionOrder.deleteMany({ where: { id: productionOrder.id } });
    await prisma.bOMOperation.deleteMany({ where: { bomId: bom.id } });
    await prisma.bOMComponent.deleteMany({ where: { bomId: bom.id } });
    await prisma.billOfMaterial.deleteMany({ where: { id: bom.id } });
    await prisma.workCenter.deleteMany({ where: { id: workCenter.id } });
    await prisma.product.deleteMany({ where: { id: { in: [finishedProduct.id, component1.id, component2.id] } } });
    await prisma.mRPRun.deleteMany({ where: { id: mrpRun.id } });
    console.log('✅ Cleanup complete\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testManufacturingModule()
    .then(() => {
      console.log('✅ Manufacturing module tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Manufacturing module tests failed:', error);
      process.exit(1);
    });
}

export { testManufacturingModule };
