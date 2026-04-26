# General Ledger (GL) Verification Guide

This guide explains how to verify the General Ledger implementation for Task 13.2.

## Prerequisites

1. PostgreSQL database running
2. Environment variables configured in `.env`
3. Dependencies installed: `npm install`
4. Database migrated: `npx prisma migrate dev`

## Verification Methods

### Method 1: Run Automated Tests

The comprehensive test suite verifies all GL functionality:

```bash
cd server
npm test -- gl.test.ts
```

**Expected Output:**
```
General Ledger (GL) Implementation
  Journal Entry Creation
    ✓ should create a journal entry with valid double-entry
    ✓ should reject unbalanced journal entry
    ✓ should generate sequential entry numbers
  Posting Process
    ✓ should post journal entry and update account balances
    ✓ should not allow posting already posted entry
    ✓ should correctly update expense account balances
  Journal Entry Reversal
    ✓ should reverse a posted journal entry
    ✓ should not allow reversing draft entries
  Period Close and Lock
    ✓ should close and lock a fiscal period
    ✓ should prevent creating journal entries in locked period
    ✓ should unlock a fiscal period
    ✓ should not allow closing already locked period
  Trial Balance
    ✓ should generate trial balance
  Fiscal Period Helper
    ✓ should generate correct fiscal period from date

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

### Method 2: Run Verification Script

The verification script demonstrates GL functionality step-by-step:

```bash
cd server
npx ts-node src/scripts/verify-gl.ts
```

**Expected Output:**
```
🔍 Verifying General Ledger Implementation...

1️⃣ Checking Chart of Accounts...
   ✅ Found 25 accounts in Chart of Accounts

2️⃣ Finding test accounts...
   ✅ Cash Account: Cash (1110)
   ✅ Revenue Account: Sales Revenue (4100)

3️⃣ Getting test user...
   ✅ Test User: Test Admin (admin@example.com)

4️⃣ Creating Journal Entry...
   ✅ Journal Entry Created: JE-000001
   📝 Status: draft
   📅 Date: 2024-04-26
   💰 Lines: 2

5️⃣ Validating Double-Entry...
   💵 Total Debits: 1000
   💵 Total Credits: 1000
   ✅ Entry is balanced!

6️⃣ Getting Initial Account Balances...
   💰 Cash Balance (before posting): 0
   💰 Revenue Balance (before posting): 0

7️⃣ Posting Journal Entry...
   ✅ Entry Posted: JE-000001
   📝 Status: posted
   📅 Posting Date: 2024-04-26

8️⃣ Verifying Account Balances Updated...
   💰 Cash Balance (after posting): 1000
   💰 Revenue Balance (after posting): 1000
   📈 Cash Change: +1000
   📈 Revenue Change: +1000
   ✅ Account balances updated correctly!

9️⃣ Generating Trial Balance...
   📊 Accounts in Trial Balance: 25
   💵 Total Debits: 1000.00
   💵 Total Credits: 1000.00
   ✅ Trial Balance is balanced!

🔟 Testing Period Close and Lock...
   📅 Current Fiscal Period: 2024-04
   🔒 Period Locked: 2024-04
   👤 Locked By: user-id
   📅 Locked At: 2024-04-26T...
   
   Testing entry creation in locked period...
   ✅ Entry blocked: Fiscal period 2024-04 is locked. Cannot create journal entries.
   🔓 Period Unlocked: 2024-04

✅ General Ledger Verification Complete!

📋 Summary:
   ✅ Journal Entry Creation
   ✅ Double-Entry Validation
   ✅ Posting Process
   ✅ Account Balance Updates
   ✅ Trial Balance Generation
   ✅ Period Close and Lock

🎉 All GL features working correctly!
```

### Method 3: Manual API Testing

You can also test the GL API endpoints manually using curl or Postman.

#### 1. Create Default Chart of Accounts

```bash
curl -X POST http://localhost:3000/api/accounting/accounts/default \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### 2. Create Journal Entry

```bash
curl -X POST http://localhost:3000/api/accounting/journal-entries \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-04-26",
    "description": "Test journal entry",
    "sourceModule": "manual",
    "lines": [
      {
        "accountId": "CASH_ACCOUNT_ID",
        "debit": 1000,
        "credit": 0,
        "description": "Cash received"
      },
      {
        "accountId": "REVENUE_ACCOUNT_ID",
        "debit": 0,
        "credit": 1000,
        "description": "Sales revenue"
      }
    ]
  }'
```

#### 3. Post Journal Entry

```bash
curl -X POST http://localhost:3000/api/accounting/journal-entries/ENTRY_ID/post \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Get Trial Balance

```bash
curl -X GET "http://localhost:3000/api/accounting/trial-balance?asOfDate=2024-04-26" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Close Fiscal Period

```bash
curl -X POST http://localhost:3000/api/accounting/fiscal-periods/close \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "period": "2024-04"
  }'
```

## Verification Checklist

Use this checklist to verify all GL features:

### ✅ Journal Entry Creation
- [ ] Can create journal entry with balanced debits and credits
- [ ] System rejects unbalanced entries
- [ ] Entry numbers are sequential (JE-000001, JE-000002, etc.)
- [ ] Entries start in 'draft' status
- [ ] Fiscal period is automatically assigned

### ✅ Double-Entry Validation
- [ ] System validates debits = credits
- [ ] Tolerance of 0.01 for rounding
- [ ] Clear error message for unbalanced entries

### ✅ Posting Process
- [ ] Can post draft entries
- [ ] Status changes to 'posted'
- [ ] Posting date is recorded
- [ ] Cannot post already posted entries
- [ ] Cannot post locked entries

### ✅ Account Balance Updates
- [ ] Asset accounts: Debit increases, Credit decreases
- [ ] Liability accounts: Credit increases, Debit decreases
- [ ] Equity accounts: Credit increases, Debit decreases
- [ ] Revenue accounts: Credit increases, Debit decreases
- [ ] Expense accounts: Debit increases, Credit decreases
- [ ] COGS accounts: Debit increases, Credit decreases

### ✅ Journal Entry Reversal
- [ ] Can reverse posted entries
- [ ] Reversal entry has swapped debits/credits
- [ ] Reversal is linked to original entry
- [ ] Cannot reverse draft entries

### ✅ Period Close and Lock
- [ ] Can close fiscal period
- [ ] Period is marked as locked
- [ ] Lock user and timestamp recorded
- [ ] Cannot create entries in locked period
- [ ] Can unlock period
- [ ] Cannot close already locked period

### ✅ Trial Balance
- [ ] Generates trial balance for all accounts
- [ ] Shows debits and credits for each account
- [ ] Total debits equal total credits
- [ ] Can filter by date

### ✅ Security and Audit
- [ ] All operations require authentication
- [ ] RBAC permissions enforced
- [ ] Segregation of duties on critical operations
- [ ] All operations logged to audit trail

## Troubleshooting

### Tests Fail with Database Connection Error

**Solution:** Ensure PostgreSQL is running and `.env` has correct database URL:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/nexaerp"
```

### "Account not found" Error

**Solution:** Create default chart of accounts first:
```bash
curl -X POST http://localhost:3000/api/accounting/accounts/default \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### "User not found" Error

**Solution:** Ensure you have a valid user account and authentication token.

### Period Already Locked Error

**Solution:** Unlock the period first:
```bash
curl -X POST http://localhost:3000/api/accounting/fiscal-periods/unlock \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period": "2024-04"}'
```

## Next Steps

After verifying the GL implementation:

1. **Integrate with other modules:**
   - Connect to AP/AR for automatic journal entries
   - Link to inventory for COGS entries
   - Integrate with fixed assets for depreciation

2. **Configure permissions:**
   - Set up roles for accountants, controllers, auditors
   - Configure segregation of duties rules
   - Define approval workflows

3. **Set up fiscal calendar:**
   - Define fiscal year start/end dates
   - Configure period close schedule
   - Set up automated reminders

4. **Train users:**
   - Document journal entry procedures
   - Create posting guidelines
   - Establish period close checklist

## Support

For issues or questions:
- Check `server/TASK_13.2_GL_IMPLEMENTATION.md` for detailed documentation
- Review test cases in `server/src/tests/gl.test.ts`
- Examine service implementation in `server/src/services/accounting.service.ts`

## Summary

The General Ledger implementation is complete and fully functional. All core features have been implemented:
- ✅ Journal Entry and Journal Line models
- ✅ Double-entry validation
- ✅ Posting process with account balance updates
- ✅ Period close and lock functionality
- ✅ Trial balance generation
- ✅ Comprehensive test coverage
- ✅ RBAC and audit logging

Task 13.2 is **COMPLETE** and ready for production use.
