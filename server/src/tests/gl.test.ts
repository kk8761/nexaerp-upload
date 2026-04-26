/**
 * General Ledger (GL) Test Suite
 * Tests for Task 13.2: Implement General Ledger (GL)
 * 
 * This test suite verifies:
 * - Journal Entry creation with double-entry validation
 * - Posting process to update account balances
 * - Period close and lock functionality
 */

import * as accountingService from '../services/accounting.service';
import prisma from '../config/prisma';

describe('General Ledger (GL) Implementation', () => {
  let testUserId: string;
  let cashAccountId: string;
  let revenueAccountId: string;
  let expenseAccountId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        role: 'accountant',
      },
    });
    testUserId = user.id;

    // Create test accounts
    const cashAccount = await accountingService.createAccount({
      accountCode: 'TEST-1110',
      name: 'Test Cash Account',
      type: 'Asset',
    });
    cashAccountId = cashAccount.id;

    const revenueAccount = await accountingService.createAccount({
      accountCode: 'TEST-4100',
      name: 'Test Revenue Account',
      type: 'Revenue',
    });
    revenueAccountId = revenueAccount.id;

    const expenseAccount = await accountingService.createAccount({
      accountCode: 'TEST-6100',
      name: 'Test Expense Account',
      type: 'Expense',
    });
    expenseAccountId = expenseAccount.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.journalLine.deleteMany({
      where: {
        journalEntry: {
          createdBy: testUserId,
        },
      },
    });
    await prisma.journalEntry.deleteMany({
      where: { createdBy: testUserId },
    });
    await prisma.account.deleteMany({
      where: {
        accountCode: {
          startsWith: 'TEST-',
        },
      },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('Journal Entry Creation', () => {
    it('should create a journal entry with valid double-entry', async () => {
      const journalEntry = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Test journal entry - Revenue recognition',
        sourceModule: 'manual',
        lines: [
          {
            accountId: cashAccountId,
            debit: 1000,
            credit: 0,
            description: 'Cash received',
          },
          {
            accountId: revenueAccountId,
            debit: 0,
            credit: 1000,
            description: 'Revenue earned',
          },
        ],
        createdBy: testUserId,
      });

      expect(journalEntry).toBeDefined();
      expect(journalEntry.status).toBe('draft');
      expect(journalEntry.lines).toHaveLength(2);
      expect(journalEntry.entryNumber).toMatch(/^JE-\d{6}$/);
    });

    it('should reject unbalanced journal entry', async () => {
      await expect(
        accountingService.createJournalEntry({
          date: new Date(),
          description: 'Unbalanced entry',
          sourceModule: 'manual',
          lines: [
            {
              accountId: cashAccountId,
              debit: 1000,
              credit: 0,
            },
            {
              accountId: revenueAccountId,
              debit: 0,
              credit: 500, // Unbalanced!
            },
          ],
          createdBy: testUserId,
        })
      ).rejects.toThrow(/not balanced/i);
    });

    it('should generate sequential entry numbers', async () => {
      const entry1 = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Entry 1',
        sourceModule: 'manual',
        lines: [
          { accountId: cashAccountId, debit: 100, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 100 },
        ],
        createdBy: testUserId,
      });

      const entry2 = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Entry 2',
        sourceModule: 'manual',
        lines: [
          { accountId: cashAccountId, debit: 200, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 200 },
        ],
        createdBy: testUserId,
      });

      const num1 = parseInt(entry1.entryNumber.split('-')[1]);
      const num2 = parseInt(entry2.entryNumber.split('-')[1]);
      expect(num2).toBeGreaterThan(num1);
    });
  });

  describe('Posting Process', () => {
    it('should post journal entry and update account balances', async () => {
      // Get initial balances
      const initialCashBalance = await accountingService.getAccountBalance(cashAccountId);
      const initialRevenueBalance = await accountingService.getAccountBalance(revenueAccountId);

      // Create and post journal entry
      const journalEntry = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Test posting',
        sourceModule: 'manual',
        lines: [
          { accountId: cashAccountId, debit: 500, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 500 },
        ],
        createdBy: testUserId,
      });

      const postedEntry = await accountingService.postJournalEntry(journalEntry.id);

      expect(postedEntry.status).toBe('posted');
      expect(postedEntry.postingDate).toBeDefined();

      // Verify account balances updated
      const newCashBalance = await accountingService.getAccountBalance(cashAccountId);
      const newRevenueBalance = await accountingService.getAccountBalance(revenueAccountId);

      // Cash (Asset) increases with debit
      expect(newCashBalance).toBe(initialCashBalance + 500);
      // Revenue increases with credit
      expect(newRevenueBalance).toBe(initialRevenueBalance + 500);
    });

    it('should not allow posting already posted entry', async () => {
      const journalEntry = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Test double posting',
        sourceModule: 'manual',
        lines: [
          { accountId: cashAccountId, debit: 100, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 100 },
        ],
        createdBy: testUserId,
      });

      await accountingService.postJournalEntry(journalEntry.id);

      await expect(
        accountingService.postJournalEntry(journalEntry.id)
      ).rejects.toThrow(/already posted/i);
    });

    it('should correctly update expense account balances', async () => {
      const initialExpenseBalance = await accountingService.getAccountBalance(expenseAccountId);
      const initialCashBalance = await accountingService.getAccountBalance(cashAccountId);

      const journalEntry = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Test expense posting',
        sourceModule: 'manual',
        lines: [
          { accountId: expenseAccountId, debit: 300, credit: 0 },
          { accountId: cashAccountId, debit: 0, credit: 300 },
        ],
        createdBy: testUserId,
      });

      await accountingService.postJournalEntry(journalEntry.id);

      const newExpenseBalance = await accountingService.getAccountBalance(expenseAccountId);
      const newCashBalance = await accountingService.getAccountBalance(cashAccountId);

      // Expense increases with debit
      expect(newExpenseBalance).toBe(initialExpenseBalance + 300);
      // Cash (Asset) decreases with credit
      expect(newCashBalance).toBe(initialCashBalance - 300);
    });
  });

  describe('Journal Entry Reversal', () => {
    it('should reverse a posted journal entry', async () => {
      // Create and post original entry
      const originalEntry = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Entry to be reversed',
        sourceModule: 'manual',
        lines: [
          { accountId: cashAccountId, debit: 250, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 250 },
        ],
        createdBy: testUserId,
      });

      await accountingService.postJournalEntry(originalEntry.id);

      // Reverse the entry
      const reversalEntry = await accountingService.reverseJournalEntry(
        originalEntry.id,
        new Date(),
        testUserId
      );

      expect(reversalEntry).toBeDefined();
      expect(reversalEntry.description).toContain('Reversal');
      expect(reversalEntry.lines).toHaveLength(2);

      // Verify debits and credits are swapped
      const originalLines = originalEntry.lines;
      const reversalLines = reversalEntry.lines;

      expect(reversalLines[0].debit).toBe(originalLines[0].credit);
      expect(reversalLines[0].credit).toBe(originalLines[0].debit);
    });

    it('should not allow reversing draft entries', async () => {
      const draftEntry = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Draft entry',
        sourceModule: 'manual',
        lines: [
          { accountId: cashAccountId, debit: 100, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 100 },
        ],
        createdBy: testUserId,
      });

      await expect(
        accountingService.reverseJournalEntry(draftEntry.id, new Date(), testUserId)
      ).rejects.toThrow(/only reverse posted/i);
    });
  });

  describe('Period Close and Lock', () => {
    const testPeriod = '2024-12';

    afterEach(async () => {
      // Cleanup: unlock period if it was locked
      try {
        await accountingService.unlockFiscalPeriod(testPeriod);
      } catch (error) {
        // Ignore if period doesn't exist
      }
    });

    it('should close and lock a fiscal period', async () => {
      const fiscalPeriod = await accountingService.closeFiscalPeriod(testPeriod, testUserId);

      expect(fiscalPeriod).toBeDefined();
      expect(fiscalPeriod.period).toBe(testPeriod);
      expect(fiscalPeriod.isLocked).toBe(true);
      expect(fiscalPeriod.lockedBy).toBe(testUserId);
      expect(fiscalPeriod.lockedAt).toBeDefined();
    });

    it('should prevent creating journal entries in locked period', async () => {
      await accountingService.closeFiscalPeriod(testPeriod, testUserId);

      const [year, month] = testPeriod.split('-');
      const dateInLockedPeriod = new Date(parseInt(year), parseInt(month) - 1, 15);

      await expect(
        accountingService.createJournalEntry({
          date: dateInLockedPeriod,
          description: 'Entry in locked period',
          sourceModule: 'manual',
          lines: [
            { accountId: cashAccountId, debit: 100, credit: 0 },
            { accountId: revenueAccountId, debit: 0, credit: 100 },
          ],
          createdBy: testUserId,
        })
      ).rejects.toThrow(/locked/i);
    });

    it('should unlock a fiscal period', async () => {
      await accountingService.closeFiscalPeriod(testPeriod, testUserId);
      const unlockedPeriod = await accountingService.unlockFiscalPeriod(testPeriod);

      expect(unlockedPeriod.isLocked).toBe(false);
      expect(unlockedPeriod.lockedBy).toBeNull();
      expect(unlockedPeriod.lockedAt).toBeNull();
    });

    it('should not allow closing already locked period', async () => {
      await accountingService.closeFiscalPeriod(testPeriod, testUserId);

      await expect(
        accountingService.closeFiscalPeriod(testPeriod, testUserId)
      ).rejects.toThrow(/already locked/i);
    });
  });

  describe('Trial Balance', () => {
    it('should generate trial balance', async () => {
      // Create and post some entries
      const entry1 = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Trial balance test 1',
        sourceModule: 'manual',
        lines: [
          { accountId: cashAccountId, debit: 1000, credit: 0 },
          { accountId: revenueAccountId, debit: 0, credit: 1000 },
        ],
        createdBy: testUserId,
      });
      await accountingService.postJournalEntry(entry1.id);

      const entry2 = await accountingService.createJournalEntry({
        date: new Date(),
        description: 'Trial balance test 2',
        sourceModule: 'manual',
        lines: [
          { accountId: expenseAccountId, debit: 400, credit: 0 },
          { accountId: cashAccountId, debit: 0, credit: 400 },
        ],
        createdBy: testUserId,
      });
      await accountingService.postJournalEntry(entry2.id);

      const trialBalance = await accountingService.getTrialBalance(new Date());

      expect(trialBalance).toBeDefined();
      expect(trialBalance.accounts).toBeInstanceOf(Array);
      expect(trialBalance.totals).toBeDefined();
      
      // Trial balance should be balanced
      expect(Math.abs(trialBalance.totals.totalDebits - trialBalance.totals.totalCredits)).toBeLessThan(0.01);
    });
  });

  describe('Fiscal Period Helper', () => {
    it('should generate correct fiscal period from date', () => {
      const date1 = new Date('2024-01-15');
      expect(accountingService.getFiscalPeriod(date1)).toBe('2024-01');

      const date2 = new Date('2024-12-31');
      expect(accountingService.getFiscalPeriod(date2)).toBe('2024-12');

      const date3 = new Date('2023-06-01');
      expect(accountingService.getFiscalPeriod(date3)).toBe('2023-06');
    });
  });
});
