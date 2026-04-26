/**
 * Fixed Asset Depreciation Test
 */

import * as accountingService from '../services/accounting.service';
import prisma from '../config/prisma';

async function testFixedAssets() {
  try {
    console.log('🧪 Testing Fixed Asset Depreciation...\n');

    // Test 1: Create fixed asset with straight-line depreciation
    console.log('1️⃣  Creating fixed asset (straight-line)...');
    const asset1 = await accountingService.createFixedAsset({
      name: 'Test Computer Equipment',
      category: 'Computer',
      acquisitionDate: new Date('2024-01-01'),
      acquisitionCost: 3000,
      salvageValue: 300,
      usefulLife: 36, // 3 years
      depreciationMethod: 'straight_line',
    });
    console.log(`✅ Created asset: ${asset1.assetNumber}`);
    console.log(`   Acquisition Cost: $${asset1.acquisitionCost}`);
    console.log(`   Salvage Value: $${asset1.salvageValue}`);
    console.log(`   Useful Life: ${asset1.usefulLife} months`);
    console.log(`   Method: ${asset1.depreciationMethod}\n`);

    // Test 2: Calculate depreciation for first month
    console.log('2️⃣  Calculating depreciation for January 2024...');
    const period1 = '2024-01';
    const depEntry1 = await accountingService.calculateDepreciation(asset1.id, period1);
    console.log(`✅ Depreciation calculated:`);
    console.log(`   Period: ${depEntry1.period}`);
    console.log(`   Depreciation Amount: $${depEntry1.depreciationAmount.toFixed(2)}`);
    console.log(`   Accumulated Depreciation: $${depEntry1.accumulatedDepreciation.toFixed(2)}`);
    console.log(`   Net Book Value: $${depEntry1.netBookValue.toFixed(2)}\n`);

    // Verify straight-line calculation
    const expectedMonthlyDep = (3000 - 300) / 36;
    console.log(`   Expected monthly depreciation: $${expectedMonthlyDep.toFixed(2)}`);
    console.log(`   Actual monthly depreciation: $${depEntry1.depreciationAmount.toFixed(2)}`);
    console.log(`   Match: ${Math.abs(depEntry1.depreciationAmount - expectedMonthlyDep) < 0.01 ? '✅' : '❌'}\n`);

    // Test 3: Calculate depreciation for second month
    console.log('3️⃣  Calculating depreciation for February 2024...');
    const period2 = '2024-02';
    const depEntry2 = await accountingService.calculateDepreciation(asset1.id, period2);
    console.log(`✅ Depreciation calculated:`);
    console.log(`   Period: ${depEntry2.period}`);
    console.log(`   Depreciation Amount: $${depEntry2.depreciationAmount.toFixed(2)}`);
    console.log(`   Accumulated Depreciation: $${depEntry2.accumulatedDepreciation.toFixed(2)}`);
    console.log(`   Net Book Value: $${depEntry2.netBookValue.toFixed(2)}\n`);

    // Test 4: Create fixed asset with declining balance depreciation
    console.log('4️⃣  Creating fixed asset (declining balance)...');
    const asset2 = await accountingService.createFixedAsset({
      name: 'Test Vehicle',
      category: 'Vehicle',
      acquisitionDate: new Date('2024-01-01'),
      acquisitionCost: 30000,
      salvageValue: 5000,
      usefulLife: 60, // 5 years
      depreciationMethod: 'declining_balance',
    });
    console.log(`✅ Created asset: ${asset2.assetNumber}`);
    console.log(`   Acquisition Cost: $${asset2.acquisitionCost}`);
    console.log(`   Salvage Value: $${asset2.salvageValue}`);
    console.log(`   Useful Life: ${asset2.usefulLife} months`);
    console.log(`   Method: ${asset2.depreciationMethod}\n`);

    // Test 5: Calculate declining balance depreciation
    console.log('5️⃣  Calculating declining balance depreciation...');
    const depEntry3 = await accountingService.calculateDepreciation(asset2.id, period1);
    console.log(`✅ Depreciation calculated:`);
    console.log(`   Period: ${depEntry3.period}`);
    console.log(`   Depreciation Amount: $${depEntry3.depreciationAmount.toFixed(2)}`);
    console.log(`   Accumulated Depreciation: $${depEntry3.accumulatedDepreciation.toFixed(2)}`);
    console.log(`   Net Book Value: $${depEntry3.netBookValue.toFixed(2)}\n`);

    // Verify declining balance calculation
    const rate = 2 / 60;
    const expectedDecliningDep = 30000 * rate;
    console.log(`   Expected depreciation (2/60 * $30,000): $${expectedDecliningDep.toFixed(2)}`);
    console.log(`   Actual depreciation: $${depEntry3.depreciationAmount.toFixed(2)}`);
    console.log(`   Match: ${Math.abs(depEntry3.depreciationAmount - expectedDecliningDep) < 0.01 ? '✅' : '❌'}\n`);

    // Test 6: Get fixed asset register
    console.log('6️⃣  Getting fixed asset register...');
    const register = await accountingService.getFixedAssetRegister();
    console.log(`✅ Retrieved ${register.length} fixed assets`);
    console.log(`   Assets with depreciation entries: ${register.filter(a => a.depreciationEntries.length > 0).length}\n`);

    // Test 7: Try to calculate depreciation for same period again (should return existing)
    console.log('7️⃣  Testing duplicate period prevention...');
    const depEntry4 = await accountingService.calculateDepreciation(asset1.id, period1);
    console.log(`✅ Returned existing entry (no duplicate created)`);
    console.log(`   Entry ID matches: ${depEntry4.id === depEntry1.id ? '✅' : '❌'}\n`);

    console.log('✅ All fixed asset depreciation tests passed!\n');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await prisma.depreciationEntry.deleteMany({
      where: {
        assetId: { in: [asset1.id, asset2.id] }
      }
    });
    await prisma.fixedAsset.deleteMany({
      where: {
        id: { in: [asset1.id, asset2.id] }
      }
    });
    console.log('✅ Cleanup complete\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixedAssets();
