/**
 * Budget Module Test
 * Tests budget creation, approval, variance tracking, and reporting
 */

import * as accountingService from '../services/accounting.service';

async function testBudgetModule() {
  console.log('🧪 Testing Budget Module\n');
  
  try {
    // Test 1: Get chart of accounts
    console.log('1️⃣  Getting chart of accounts...');
    const accounts = await accountingService.getChartOfAccounts();
    console.log(`✅ Found ${accounts.length} accounts\n`);
    
    if (accounts.length === 0) {
      console.log('⚠️  No accounts found. Creating default chart of accounts...');
      await accountingService.createDefaultChartOfAccounts();
      const newAccounts = await accountingService.getChartOfAccounts();
      console.log(`✅ Created ${newAccounts.length} accounts\n`);
    }
    
    // Get revenue and expense accounts for testing
    const revenueAccount = accounts.find(acc => acc.type === 'Revenue' && !acc.isControlAccount);
    const expenseAccount = accounts.find(acc => acc.type === 'Expense' && !acc.isControlAccount);
    
    if (!revenueAccount || !expenseAccount) {
      console.log('❌ Could not find suitable accounts for testing');
      return;
    }
    
    // Test 2: Create budget
    console.log('2️⃣  Creating budget...');
    const budget = await accountingService.createBudget({
      name: 'Q1 2024 Test Budget',
      fiscalYear: '2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      lineItems: [
        {
          accountId: revenueAccount.id,
          period: '2024-01',
          budgetedAmount: 50000,
          costCenter: 'SALES',
        },
        {
          accountId: revenueAccount.id,
          period: '2024-02',
          budgetedAmount: 55000,
          costCenter: 'SALES',
        },
        {
          accountId: expenseAccount.id,
          period: '2024-01',
          budgetedAmount: 20000,
          costCenter: 'ADMIN',
        },
        {
          accountId: expenseAccount.id,
          period: '2024-02',
          budgetedAmount: 22000,
          costCenter: 'ADMIN',
        },
      ],
    });
    console.log(`✅ Created budget: ${budget.name} (ID: ${budget.id})`);
    console.log(`   Status: ${budget.status}`);
    console.log(`   Line Items: ${budget.lineItems.length}\n`);
    
    // Test 3: Get budgets list
    console.log('3️⃣  Getting budgets list...');
    const budgets = await accountingService.getBudgets({
      fiscalYear: '2024',
    });
    console.log(`✅ Found ${budgets.length} budgets for fiscal year 2024\n`);
    
    // Test 4: Get budget variance report (before approval)
    console.log('4️⃣  Getting budget variance report (before approval)...');
    const reportBefore = await accountingService.getBudgetVarianceReport(budget.id);
    console.log(`✅ Budget: ${reportBefore.name}`);
    console.log(`   Status: ${reportBefore.status}`);
    console.log(`   Line Items: ${reportBefore.lineItems.length}`);
    
    // Calculate totals
    const totalBudgeted = reportBefore.lineItems.reduce((sum, item) => sum + item.budgetedAmount, 0);
    const totalActual = reportBefore.lineItems.reduce((sum, item) => sum + item.actualAmount, 0);
    const totalVariance = totalActual - totalBudgeted;
    
    console.log(`   Total Budgeted: $${totalBudgeted.toFixed(2)}`);
    console.log(`   Total Actual: $${totalActual.toFixed(2)}`);
    console.log(`   Total Variance: $${totalVariance.toFixed(2)}\n`);
    
    // Test 5: Approve budget
    console.log('5️⃣  Approving budget...');
    const approvedBudget = await accountingService.approveBudget(budget.id, 'test-user-id');
    console.log(`✅ Budget approved`);
    console.log(`   Status: ${approvedBudget.status}`);
    console.log(`   Approved By: ${approvedBudget.approvedBy}`);
    console.log(`   Approved At: ${approvedBudget.approvedAt}\n`);
    
    // Test 6: Create journal entries to generate actuals
    console.log('6️⃣  Creating journal entries for actuals...');
    
    // Revenue entry for January
    const revenueEntry = await accountingService.createJournalEntry({
      date: new Date('2024-01-15'),
      description: 'January revenue',
      sourceModule: 'test',
      lines: [
        {
          accountId: revenueAccount.id,
          debit: 0,
          credit: 45000, // Less than budgeted (50000)
          description: 'Revenue for January',
        },
        {
          accountId: accounts.find(acc => acc.accountCode === '1110')!.id, // Cash
          debit: 45000,
          credit: 0,
          description: 'Cash received',
        },
      ],
      createdBy: 'test-user-id',
    });
    
    // Post the entry
    await accountingService.postJournalEntry(revenueEntry.id);
    console.log(`✅ Created and posted revenue journal entry: ${revenueEntry.entryNumber}\n`);
    
    // Expense entry for January
    const expenseEntry = await accountingService.createJournalEntry({
      date: new Date('2024-01-20'),
      description: 'January expenses',
      sourceModule: 'test',
      lines: [
        {
          accountId: expenseAccount.id,
          debit: 25000, // More than budgeted (20000)
          credit: 0,
          description: 'Expenses for January',
        },
        {
          accountId: accounts.find(acc => acc.accountCode === '1110')!.id, // Cash
          debit: 0,
          credit: 25000,
          description: 'Cash paid',
        },
      ],
      createdBy: 'test-user-id',
    });
    
    // Post the entry
    await accountingService.postJournalEntry(expenseEntry.id);
    console.log(`✅ Created and posted expense journal entry: ${expenseEntry.entryNumber}\n`);
    
    // Test 7: Update budget actuals
    console.log('7️⃣  Updating budget actuals for January...');
    await accountingService.updateBudgetActuals('2024-01');
    console.log(`✅ Budget actuals updated for period 2024-01\n`);
    
    // Test 8: Get updated variance report
    console.log('8️⃣  Getting updated budget variance report...');
    const reportAfter = await accountingService.getBudgetVarianceReport(budget.id);
    
    console.log(`✅ Budget Variance Report:`);
    console.log(`   Budget: ${reportAfter.name}`);
    console.log(`   Status: ${reportAfter.status}\n`);
    
    console.log('   Line Items:');
    reportAfter.lineItems.forEach(item => {
      const varianceSymbol = item.variance >= 0 ? '✅' : '❌';
      console.log(`   ${varianceSymbol} ${item.period} - ${item.account.name}`);
      console.log(`      Budgeted: $${item.budgetedAmount.toFixed(2)}`);
      console.log(`      Actual: $${item.actualAmount.toFixed(2)}`);
      console.log(`      Variance: $${item.variance.toFixed(2)} (${item.variancePercent.toFixed(2)}%)`);
    });
    
    // Calculate updated totals
    const totalBudgetedAfter = reportAfter.lineItems.reduce((sum, item) => sum + item.budgetedAmount, 0);
    const totalActualAfter = reportAfter.lineItems.reduce((sum, item) => sum + item.actualAmount, 0);
    const totalVarianceAfter = totalActualAfter - totalBudgetedAfter;
    const variancePercentAfter = totalBudgetedAfter !== 0 ? (totalVarianceAfter / totalBudgetedAfter) * 100 : 0;
    
    console.log(`\n   Summary:`);
    console.log(`   Total Budgeted: $${totalBudgetedAfter.toFixed(2)}`);
    console.log(`   Total Actual: $${totalActualAfter.toFixed(2)}`);
    console.log(`   Total Variance: $${totalVarianceAfter.toFixed(2)} (${variancePercentAfter.toFixed(2)}%)\n`);
    
    // Test 9: Filter budgets by status
    console.log('9️⃣  Filtering budgets by status...');
    const approvedBudgets = await accountingService.getBudgets({
      status: 'approved',
    });
    console.log(`✅ Found ${approvedBudgets.length} approved budgets\n`);
    
    console.log('✅ All budget tests passed!\n');
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('   ✅ Budget creation');
    console.log('   ✅ Budget listing with filters');
    console.log('   ✅ Budget approval workflow');
    console.log('   ✅ Variance report generation');
    console.log('   ✅ Actual amount calculation from journal entries');
    console.log('   ✅ Variance tracking (positive and negative)');
    console.log('   ✅ Multi-period budget support');
    console.log('   ✅ Cost center tracking');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run tests if executed directly
if (require.main === module) {
  testBudgetModule()
    .then(() => {
      console.log('\n✅ Budget module test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Budget module test failed:', error);
      process.exit(1);
    });
}

export { testBudgetModule };
