import * as accountingService from '../services/accounting.service';
import prisma from '../config/prisma';

async function testAccountingModule() {
  console.log('🧪 Testing Full Accounting Suite...\n');
  
  try {
    // Test 1: Create default chart of accounts
    console.log('1️⃣  Creating default chart of accounts...');
    const accounts = await accountingService.createDefaultChartOfAccounts();
    console.log(`✅ Created ${accounts.length} accounts\n`);
    
    // Test 2: Get chart of accounts
    console.log('2️⃣  Fetching chart of accounts...');
    const coa = await accountingService.getChartOfAccounts();
    console.log(`✅ Retrieved ${coa.length} accounts\n`);
    
    // Test 3: Create a test user for journal entries
    console.log('3️⃣  Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Accountant',
        email: 'accountant@test.com',
        password: 'test123',
        role: 'accountant',
      },
    });
    console.log(`✅ Created user: ${testUser.name}\n`);
    
    // Test 4: Create journal entry
    console.log('4️⃣  Creating journal entry...');
    const cashAccount = await accountingService.getAccountByCode('1110');
    const revenueAccount = await accountingService.getAccountByCode('4100');
    
    if (!cashAccount || !revenueAccount) {
      throw new Error('Required accounts not found');
    }
    
    const journalEntry = await accountingService.createJournalEntry({
      date: new Date(),
      description: 'Test sale transaction',
      sourceModule: 'sales',
      lines: [
        {
          accountId: cashAccount.id,
          debit: 1000,
          credit: 0,
          description: 'Cash received from sale',
        },
        {
          accountId: revenueAccount.id,
          debit: 0,
          credit: 1000,
          description: 'Sales revenue',
        },
      ],
      createdBy: testUser.id,
    });
    console.log(`✅ Created journal entry: ${journalEntry.entryNumber}\n`);
    
    // Test 5: Post journal entry
    console.log('5️⃣  Posting journal entry...');
    const postedEntry = await accountingService.postJournalEntry(journalEntry.id);
    console.log(`✅ Posted journal entry: ${postedEntry.entryNumber}\n`);
    
    // Test 6: Get trial balance
    console.log('6️⃣  Generating trial balance...');
    const trialBalance = await accountingService.getTrialBalance(new Date());
    console.log(`✅ Trial Balance generated with ${trialBalance.accounts.length} accounts`);
    console.log(`   Total Debits: ${trialBalance.totals.totalDebits}`);
    console.log(`   Total Credits: ${trialBalance.totals.totalCredits}\n`);
    
    // Test 7: Create invoice
    console.log('7️⃣  Creating AR invoice...');
    const invoice = await accountingService.createInvoice({
      type: 'AR',
      customerId: 'CUST-001',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lineItems: [
        {
          lineNumber: 1,
          description: 'Consulting Services',
          quantity: 10,
          unitPrice: 500,
          taxAmount: 50,
        }
      ],
    });
    console.log(`✅ Created invoice: ${invoice.invoiceNo}\n`);
    
    // Test 8: Create bank account
    console.log('8️⃣  Creating bank account...');
    const bankAccount = await accountingService.createBankAccount({
      accountName: 'Main Operating Account',
      accountNumber: '1234567890',
      bankName: 'Test Bank',
      currency: 'USD',
      glAccountId: cashAccount.id,
    });
    console.log(`✅ Created bank account: ${bankAccount.accountName}\n`);
    
    // Test 9: Create budget
    console.log('9️⃣  Creating budget...');
    const budget = await accountingService.createBudget({
      name: '2024 Annual Budget',
      fiscalYear: '2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      lineItems: [
        {
          accountId: revenueAccount.id,
          period: '2024-01',
          budgetedAmount: 10000,
        },
      ],
    });
    console.log(`✅ Created budget: ${budget.name}\n`);
    
    // Test 10: Create fixed asset
    console.log('🔟 Creating fixed asset...');
    const fixedAsset = await accountingService.createFixedAsset({
      name: 'Office Computer',
      category: 'Equipment',
      acquisitionDate: new Date(),
      acquisitionCost: 2000,
      salvageValue: 200,
      usefulLife: 60, // 5 years in months
      depreciationMethod: 'straight_line',
    });
    console.log(`✅ Created fixed asset: ${fixedAsset.assetNumber}\n`);
    
    // Test 11: Calculate depreciation
    console.log('1️⃣1️⃣  Calculating depreciation...');
    const period = accountingService.getFiscalPeriod(new Date());
    const depEntry = await accountingService.calculateDepreciation(fixedAsset.id, period);
    console.log(`✅ Depreciation calculated: $${depEntry.depreciationAmount.toFixed(2)}\n`);
    
    // Test 12: Generate financial statements
    console.log('1️⃣2️⃣  Generating financial statements...');
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    const statements = await accountingService.generateFinancialStatements(startDate, endDate);
    console.log(`✅ Financial statements generated:`);
    console.log(`   P&L Net Income: $${statements.profitAndLoss.netIncome.toFixed(2)}`);
    console.log(`   Balance Sheet Total Assets: $${statements.balanceSheet.totalAssets.toFixed(2)}`);
    console.log(`   Cash Flow Net: $${statements.cashFlow.netCashFlow.toFixed(2)}\n`);
    
    console.log('✅ All tests passed! Full Accounting Suite is working correctly.\n');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testAccountingModule();
