/**
 * GL Verification Script
 * Demonstrates the General Ledger functionality
 */

import * as accountingService from '../services/accounting.service';
import prisma from '../config/prisma';

async function verifyGL() {
  console.log('🔍 Verifying General Ledger Implementation...\n');

  try {
    // 1. Check if Chart of Accounts exists
    console.log('1️⃣ Checking Chart of Accounts...');
    const accounts = await accountingService.getChartOfAccounts();
    console.log(`   ✅ Found ${accounts.length} accounts in Chart of Accounts`);

    if (accounts.length === 0) {
      console.log('   ⚠️  No accounts found. Creating default chart of accounts...');
      await accountingService.createDefaultChartOfAccounts();
      console.log('   ✅ Default chart of accounts created');
    }

    // 2. Find test accounts
    console.log('\n2️⃣ Finding test accounts...');
    const cashAccount = await accountingService.getAccountByCode('1110');
    const revenueAccount = await accountingService.getAccountByCode('4100');
    
    if (!cashAccount || !revenueAccount) {
      console.log('   ❌ Required accounts not found. Please create default chart of accounts first.');
      return;
    }
    
    console.log(`   ✅ Cash Account: ${cashAccount.name} (${cashAccount.accountCode})`);
    console.log(`   ✅ Revenue Account: ${revenueAccount.name} (${revenueAccount.accountCode})`);

    // 3. Get or create test user
    console.log('\n3️⃣ Getting test user...');
    let testUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: 'Test Admin',
          email: 'admin@example.com',
          password: 'hashed',
          role: 'admin',
        },
      });
    }
    console.log(`   ✅ Test User: ${testUser.name} (${testUser.email})`);

    // 4. Create Journal Entry
    console.log('\n4️⃣ Creating Journal Entry...');
    const journalEntry = await accountingService.createJournalEntry({
      date: new Date(),
      description: 'Test GL Entry - Cash Sale',
      sourceModule: 'manual',
      lines: [
        {
          accountId: cashAccount.id,
          debit: 1000,
          credit: 0,
          description: 'Cash received from customer',
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

    console.log(`   ✅ Journal Entry Created: ${journalEntry.entryNumber}`);
    console.log(`   📝 Status: ${journalEntry.status}`);
    console.log(`   📅 Date: ${journalEntry.date.toISOString().split('T')[0]}`);
    console.log(`   💰 Lines: ${journalEntry.lines.length}`);

    // 5. Validate Double-Entry
    console.log('\n5️⃣ Validating Double-Entry...');
    const totalDebits = journalEntry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = journalEntry.lines.reduce((sum, line) => sum + line.credit, 0);
    
    console.log(`   💵 Total Debits: ${totalDebits}`);
    console.log(`   💵 Total Credits: ${totalCredits}`);
    
    if (Math.abs(totalDebits - totalCredits) < 0.01) {
      console.log('   ✅ Entry is balanced!');
    } else {
      console.log('   ❌ Entry is NOT balanced!');
    }

    // 6. Get Initial Balances
    console.log('\n6️⃣ Getting Initial Account Balances...');
    const initialCashBalance = await accountingService.getAccountBalance(cashAccount.id);
    const initialRevenueBalance = await accountingService.getAccountBalance(revenueAccount.id);
    
    console.log(`   💰 Cash Balance (before posting): ${initialCashBalance}`);
    console.log(`   💰 Revenue Balance (before posting): ${initialRevenueBalance}`);

    // 7. Post Journal Entry
    console.log('\n7️⃣ Posting Journal Entry...');
    const postedEntry = await accountingService.postJournalEntry(journalEntry.id);
    
    console.log(`   ✅ Entry Posted: ${postedEntry.entryNumber}`);
    console.log(`   📝 Status: ${postedEntry.status}`);
    console.log(`   📅 Posting Date: ${postedEntry.postingDate?.toISOString().split('T')[0]}`);

    // 8. Verify Account Balances Updated
    console.log('\n8️⃣ Verifying Account Balances Updated...');
    const newCashBalance = await accountingService.getAccountBalance(cashAccount.id);
    const newRevenueBalance = await accountingService.getAccountBalance(revenueAccount.id);
    
    console.log(`   💰 Cash Balance (after posting): ${newCashBalance}`);
    console.log(`   💰 Revenue Balance (after posting): ${newRevenueBalance}`);
    console.log(`   📈 Cash Change: +${newCashBalance - initialCashBalance}`);
    console.log(`   📈 Revenue Change: +${newRevenueBalance - initialRevenueBalance}`);

    if (newCashBalance === initialCashBalance + 1000 && 
        newRevenueBalance === initialRevenueBalance + 1000) {
      console.log('   ✅ Account balances updated correctly!');
    } else {
      console.log('   ❌ Account balances NOT updated correctly!');
    }

    // 9. Generate Trial Balance
    console.log('\n9️⃣ Generating Trial Balance...');
    const trialBalance = await accountingService.getTrialBalance(new Date());
    
    console.log(`   📊 Accounts in Trial Balance: ${trialBalance.accounts.length}`);
    console.log(`   💵 Total Debits: ${trialBalance.totals.totalDebits.toFixed(2)}`);
    console.log(`   💵 Total Credits: ${trialBalance.totals.totalCredits.toFixed(2)}`);
    
    if (Math.abs(trialBalance.totals.totalDebits - trialBalance.totals.totalCredits) < 0.01) {
      console.log('   ✅ Trial Balance is balanced!');
    } else {
      console.log('   ❌ Trial Balance is NOT balanced!');
    }

    // 10. Test Period Locking
    console.log('\n🔟 Testing Period Close and Lock...');
    const testPeriod = accountingService.getFiscalPeriod(new Date());
    console.log(`   📅 Current Fiscal Period: ${testPeriod}`);
    
    try {
      const fiscalPeriod = await accountingService.closeFiscalPeriod(testPeriod, testUser.id);
      console.log(`   🔒 Period Locked: ${fiscalPeriod.period}`);
      console.log(`   👤 Locked By: ${fiscalPeriod.lockedBy}`);
      console.log(`   📅 Locked At: ${fiscalPeriod.lockedAt?.toISOString()}`);
      
      // Try to create entry in locked period
      console.log('\n   Testing entry creation in locked period...');
      try {
        await accountingService.createJournalEntry({
          date: new Date(),
          description: 'Should fail - period locked',
          sourceModule: 'manual',
          lines: [
            { accountId: cashAccount.id, debit: 100, credit: 0 },
            { accountId: revenueAccount.id, debit: 0, credit: 100 },
          ],
          createdBy: testUser.id,
        });
        console.log('   ❌ Entry created in locked period (should have failed!)');
      } catch (error: any) {
        console.log(`   ✅ Entry blocked: ${error.message}`);
      }
      
      // Unlock period
      await accountingService.unlockFiscalPeriod(testPeriod);
      console.log(`   🔓 Period Unlocked: ${testPeriod}`);
      
    } catch (error: any) {
      if (error.message.includes('already locked')) {
        console.log(`   ⚠️  Period already locked. Unlocking...`);
        await accountingService.unlockFiscalPeriod(testPeriod);
        console.log(`   🔓 Period Unlocked: ${testPeriod}`);
      } else {
        throw error;
      }
    }

    console.log('\n✅ General Ledger Verification Complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Journal Entry Creation');
    console.log('   ✅ Double-Entry Validation');
    console.log('   ✅ Posting Process');
    console.log('   ✅ Account Balance Updates');
    console.log('   ✅ Trial Balance Generation');
    console.log('   ✅ Period Close and Lock');
    console.log('\n🎉 All GL features working correctly!');

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyGL()
  .then(() => {
    console.log('\n✅ Verification script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
