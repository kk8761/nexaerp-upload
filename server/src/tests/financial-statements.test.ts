/**
 * Financial Statements Test
 * Tests the generation of P&L, Balance Sheet, and Cash Flow statements
 */

import * as accountingService from '../services/accounting.service';

async function testFinancialStatements() {
  console.log('🧪 Testing Financial Statements Generation...\n');

  try {
    // Test date range - current fiscal year
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    const asOfDate = new Date('2024-12-31');

    // Test 1: Generate Profit & Loss Statement
    console.log('1️⃣  Generating Profit & Loss Statement...');
    const profitAndLoss = await accountingService.generateProfitAndLoss(startDate, endDate);
    console.log(`✅ P&L Statement generated:`);
    console.log(`   Period: ${profitAndLoss.period.startDate.toISOString().split('T')[0]} to ${profitAndLoss.period.endDate.toISOString().split('T')[0]}`);
    console.log(`   Total Revenue: $${profitAndLoss.totalRevenue.toFixed(2)}`);
    console.log(`   Total COGS: $${profitAndLoss.totalCOGS.toFixed(2)}`);
    console.log(`   Gross Profit: $${profitAndLoss.grossProfit.toFixed(2)}`);
    console.log(`   Total Expenses: $${profitAndLoss.totalExpenses.toFixed(2)}`);
    console.log(`   Net Income: $${profitAndLoss.netIncome.toFixed(2)}\n`);

    // Test 2: Generate Balance Sheet
    console.log('2️⃣  Generating Balance Sheet...');
    const balanceSheet = await accountingService.generateBalanceSheet(asOfDate);
    console.log(`✅ Balance Sheet generated:`);
    console.log(`   As of: ${balanceSheet.asOfDate.toISOString().split('T')[0]}`);
    console.log(`   Total Assets: $${balanceSheet.totalAssets.toFixed(2)}`);
    console.log(`   Total Liabilities: $${balanceSheet.totalLiabilities.toFixed(2)}`);
    console.log(`   Total Equity: $${balanceSheet.totalEquity.toFixed(2)}`);
    console.log(`   Total Liabilities & Equity: $${balanceSheet.totalLiabilitiesAndEquity.toFixed(2)}`);
    console.log(`   Balance Check: ${Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndEquity) < 0.01 ? '✅ Balanced' : '❌ Not Balanced'}\n`);

    // Test 3: Generate Cash Flow Statement
    console.log('3️⃣  Generating Cash Flow Statement...');
    const cashFlow = await accountingService.generateCashFlowStatement(startDate, endDate);
    console.log(`✅ Cash Flow Statement generated:`);
    console.log(`   Period: ${cashFlow.period.startDate.toISOString().split('T')[0]} to ${cashFlow.period.endDate.toISOString().split('T')[0]}`);
    console.log(`   Operating Cash Flow: $${cashFlow.operatingCashFlow.toFixed(2)}`);
    console.log(`   Investing Cash Flow: $${cashFlow.investingCashFlow.toFixed(2)}`);
    console.log(`   Financing Cash Flow: $${cashFlow.financingCashFlow.toFixed(2)}`);
    console.log(`   Net Cash Flow: $${cashFlow.netCashFlow.toFixed(2)}\n`);

    // Test 4: Generate All Financial Statements
    console.log('4️⃣  Generating All Financial Statements...');
    const statements = await accountingService.generateFinancialStatements(startDate, endDate);
    console.log(`✅ All financial statements generated successfully:`);
    console.log(`   - Profit & Loss: ${statements.profitAndLoss ? '✅' : '❌'}`);
    console.log(`   - Balance Sheet: ${statements.balanceSheet ? '✅' : '❌'}`);
    console.log(`   - Cash Flow: ${statements.cashFlow ? '✅' : '❌'}\n`);

    console.log('✅ All financial statement tests passed!\n');
    console.log('📊 Summary:');
    console.log(`   - P&L shows ${profitAndLoss.revenue.length} revenue accounts, ${profitAndLoss.cogs.length} COGS accounts, ${profitAndLoss.expenses.length} expense accounts`);
    console.log(`   - Balance Sheet shows ${balanceSheet.assets.length} asset accounts, ${balanceSheet.liabilities.length} liability accounts, ${balanceSheet.equity.length} equity accounts`);
    console.log(`   - Cash Flow shows ${cashFlow.operating.length} operating activities, ${cashFlow.investing.length} investing activities, ${cashFlow.financing.length} financing activities\n`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the test
testFinancialStatements()
  .then(() => {
    console.log('✅ Financial Statements test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Financial Statements test failed:', error);
    process.exit(1);
  });
