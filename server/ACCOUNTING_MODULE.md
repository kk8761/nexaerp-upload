# Full Accounting Suite Documentation

## Overview

The Full Accounting Suite implements a complete double-entry accounting system with General Ledger (GL), Accounts Payable (AP), Accounts Receivable (AR), bank reconciliation, budgeting, fixed asset depreciation, and financial reporting capabilities.

## Features Implemented

### 1. Chart of Accounts (COA)

**Models:**
- `Account` - Hierarchical account structure with parent-child relationships

**Features:**
- Hierarchical account structure (parent-child relationships)
- Account types: Asset, Liability, Equity, Revenue, Expense, COGS
- Sub-types for detailed categorization
- Control account flags
- Multi-currency support
- Default chart of accounts template

**API Endpoints:**
```
POST   /api/accounting/accounts                    - Create account
GET    /api/accounting/accounts                    - Get chart of accounts
POST   /api/accounting/accounts/default            - Create default COA
GET    /api/accounting/accounts/:accountId/balance - Get account balance
```

### 2. General Ledger (GL)

**Models:**
- `JournalEntry` - Journal entry header
- `JournalLine` - Journal entry lines (debits and credits)
- `FiscalPeriod` - Fiscal period management with locking

**Features:**
- Double-entry validation (debits must equal credits)
- Automatic journal entry numbering
- Posting process to update account balances
- Journal entry reversal
- Cost center and project tracking
- Fiscal period close and lock
- Trial balance generation

**API Endpoints:**
```
POST   /api/accounting/journal-entries                  - Create journal entry
GET    /api/accounting/journal-entries                  - List journal entries
GET    /api/accounting/journal-entries/:entryId         - Get journal entry
POST   /api/accounting/journal-entries/:entryId/post    - Post journal entry
POST   /api/accounting/journal-entries/:entryId/reverse - Reverse journal entry
GET    /api/accounting/trial-balance                    - Get trial balance
POST   /api/accounting/fiscal-periods/close             - Close fiscal period
POST   /api/accounting/fiscal-periods/unlock            - Unlock fiscal period
```

### 3. Accounts Payable (AP) & Accounts Receivable (AR)

**Models:**
- `Invoice` - AR/AP invoices
- `Payment` - Payment records

**Features:**
- Invoice creation with automatic numbering
- Invoice approval workflow
- Payment recording with multiple payment methods
- AP aging report (current, 30, 60, 90, 90+ days)
- AR aging report (current, 30, 60, 90, 90+ days)
- Invoice status tracking (unpaid, partial, paid, voided)

**API Endpoints:**
```
POST   /api/accounting/invoices                    - Create invoice
POST   /api/accounting/invoices/:invoiceId/approve - Approve invoice
POST   /api/accounting/payments                    - Record payment
GET    /api/accounting/reports/ap-aging            - AP aging report
GET    /api/accounting/reports/ar-aging            - AR aging report
```

### 4. Bank Reconciliation

**Models:**
- `BankAccount` - Bank account master data
- `BankStatement` - Bank statement header
- `BankTransaction` - Bank statement transactions
- `BankReconciliation` - Reconciliation records

**Features:**
- Bank account management with GL account linking
- Bank statement import (CSV, OFX support planned)
- Automated transaction matching algorithm
- Manual reconciliation interface
- Reconciliation status tracking
- Difference calculation and adjustment entries

**API Endpoints:**
```
POST   /api/accounting/bank-accounts                           - Create bank account
POST   /api/accounting/bank-statements/import                  - Import bank statement
POST   /api/accounting/bank-statements/:statementId/auto-match - Auto-match transactions
POST   /api/accounting/bank-reconciliations                    - Create reconciliation
```

### 5. Budgeting

**Models:**
- `Budget` - Budget header
- `BudgetLineItem` - Budget line items by account and period

**Features:**
- Budget creation with line items by account and period
- Budget approval workflow
- Actual vs budget variance tracking
- Variance percentage calculation
- Cost center and project budget tracking
- Budget variance reports

**API Endpoints:**
```
POST   /api/accounting/budgets                           - Create budget
POST   /api/accounting/budgets/:budgetId/approve         - Approve budget
POST   /api/accounting/budgets/update-actuals            - Update budget actuals
GET    /api/accounting/budgets/:budgetId/variance-report - Get variance report
```

### 6. Fixed Asset Depreciation

**Models:**
- `FixedAsset` - Fixed asset master data
- `DepreciationEntry` - Monthly depreciation entries

**Features:**
- Fixed asset registration with automatic numbering
- Depreciation methods:
  - Straight-line depreciation
  - Declining balance depreciation
- Monthly depreciation calculation
- Automatic depreciation journal entry generation
- Fixed asset register report
- Asset status tracking (active, disposed, fully_depreciated)

**API Endpoints:**
```
POST   /api/accounting/fixed-assets                              - Create fixed asset
POST   /api/accounting/fixed-assets/:assetId/depreciation        - Calculate depreciation
POST   /api/accounting/fixed-assets/depreciation/generate-entries - Generate journal entries
GET    /api/accounting/fixed-assets/register                     - Get asset register
```

### 7. Financial Statements

**Features:**
- Profit & Loss Statement (Income Statement)
  - Revenue breakdown
  - Cost of Goods Sold
  - Gross Profit calculation
  - Operating Expenses
  - Net Income calculation
  
- Balance Sheet
  - Assets (Current and Fixed)
  - Liabilities (Current and Long-term)
  - Equity
  - Balance verification (Assets = Liabilities + Equity)
  
- Cash Flow Statement
  - Operating activities
  - Investing activities
  - Financing activities
  - Net cash flow

**API Endpoints:**
```
GET    /api/accounting/reports/profit-and-loss      - Generate P&L statement
GET    /api/accounting/reports/balance-sheet        - Generate balance sheet
GET    /api/accounting/reports/cash-flow            - Generate cash flow statement
GET    /api/accounting/reports/financial-statements - Generate all statements
```

## Database Schema

### Account
```typescript
{
  id: string (UUID)
  accountCode: string (unique)
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'COGS'
  subType?: string
  currency: string (default: 'USD')
  isActive: boolean
  balance: number
  parentId?: string (for hierarchy)
  isControlAccount: boolean
}
```

### JournalEntry
```typescript
{
  id: string (UUID)
  entryNumber: string (unique)
  date: Date
  postingDate?: Date
  description: string
  referenceId?: string
  sourceModule: string
  status: 'draft' | 'posted' | 'voided'
  fiscalPeriod?: string
  isLocked: boolean
  createdBy: string (User ID)
  lines: JournalLine[]
}
```

### JournalLine
```typescript
{
  id: string (UUID)
  journalEntryId: string
  accountId: string
  debit: number
  credit: number
  description?: string
  costCenter?: string
  projectId?: string
}
```

### Invoice
```typescript
{
  id: string (UUID)
  invoiceNo: string (unique)
  type: 'AR' | 'AP'
  customerId?: string
  supplierId?: string
  issueDate: Date
  dueDate: Date
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  status: 'unpaid' | 'partial' | 'paid' | 'voided'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: Date
}
```

### Payment
```typescript
{
  id: string (UUID)
  paymentNo: string (unique)
  invoiceId: string
  amount: number
  paymentDate: Date
  paymentMethod: string
  referenceNo?: string
  bankAccountId?: string
  notes?: string
}
```

### BankAccount
```typescript
{
  id: string (UUID)
  accountName: string
  accountNumber: string
  bankName: string
  currency: string
  balance: number
  isActive: boolean
  glAccountId?: string
}
```

### Budget
```typescript
{
  id: string (UUID)
  name: string
  fiscalYear: string
  startDate: Date
  endDate: Date
  status: 'draft' | 'approved' | 'active' | 'closed'
  approvedBy?: string
  approvedAt?: Date
  lineItems: BudgetLineItem[]
}
```

### BudgetLineItem
```typescript
{
  id: string (UUID)
  budgetId: string
  accountId: string
  period: string (e.g., '2024-01')
  budgetedAmount: number
  actualAmount: number
  variance: number
  variancePercent: number
  costCenter?: string
  projectId?: string
}
```

### FixedAsset
```typescript
{
  id: string (UUID)
  assetNumber: string (unique)
  name: string
  description?: string
  category: string
  acquisitionDate: Date
  acquisitionCost: number
  salvageValue: number
  usefulLife: number (months)
  depreciationMethod: 'straight_line' | 'declining_balance'
  accumulatedDepreciation: number
  netBookValue: number
  status: 'active' | 'disposed' | 'fully_depreciated'
  disposalDate?: Date
  disposalValue?: number
}
```

## Usage Examples

### 1. Create Default Chart of Accounts

```typescript
import * as accountingService from './services/accounting.service';

const accounts = await accountingService.createDefaultChartOfAccounts();
console.log(`Created ${accounts.length} accounts`);
```

### 2. Create Journal Entry

```typescript
const entry = await accountingService.createJournalEntry({
  date: new Date(),
  description: 'Sale transaction',
  sourceModule: 'sales',
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
      description: 'Sales revenue',
    },
  ],
  createdBy: userId,
});

// Post the entry to update account balances
await accountingService.postJournalEntry(entry.id);
```

### 3. Create and Pay Invoice

```typescript
// Create invoice
const invoice = await accountingService.createInvoice({
  type: 'AR',
  customerId: 'CUST-001',
  issueDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  subtotal: 5000,
  taxAmount: 500,
  total: 5500,
});

// Approve invoice
await accountingService.approveInvoice(invoice.id, userId);

// Record payment
await accountingService.recordPayment({
  invoiceId: invoice.id,
  amount: 5500,
  paymentDate: new Date(),
  paymentMethod: 'bank_transfer',
  bankAccountId: bankAccountId,
});
```

### 4. Bank Reconciliation

```typescript
// Import bank statement
const statement = await accountingService.importBankStatement({
  bankAccountId: bankAccountId,
  statementDate: new Date(),
  openingBalance: 10000,
  closingBalance: 15000,
  transactions: [
    {
      transactionDate: new Date(),
      description: 'Customer payment',
      debit: 0,
      credit: 5000,
      balance: 15000,
    },
  ],
});

// Auto-match transactions
const matches = await accountingService.autoMatchBankTransactions(statement.id);

// Create reconciliation
const reconciliation = await accountingService.createBankReconciliation({
  bankAccountId: bankAccountId,
  statementId: statement.id,
  reconciliationDate: new Date(),
  reconciledBy: userId,
});
```

### 5. Budget Management

```typescript
// Create budget
const budget = await accountingService.createBudget({
  name: '2024 Annual Budget',
  fiscalYear: '2024',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  lineItems: [
    {
      accountId: revenueAccountId,
      period: '2024-01',
      budgetedAmount: 10000,
    },
  ],
});

// Approve budget
await accountingService.approveBudget(budget.id, userId);

// Update actuals
await accountingService.updateBudgetActuals('2024-01');

// Get variance report
const report = await accountingService.getBudgetVarianceReport(budget.id);
```

### 6. Fixed Asset Depreciation

```typescript
// Create fixed asset
const asset = await accountingService.createFixedAsset({
  name: 'Office Computer',
  category: 'Equipment',
  acquisitionDate: new Date(),
  acquisitionCost: 2000,
  salvageValue: 200,
  usefulLife: 60, // 5 years
  depreciationMethod: 'straight_line',
});

// Calculate depreciation for current period
const period = accountingService.getFiscalPeriod(new Date());
const depEntry = await accountingService.calculateDepreciation(asset.id, period);

// Generate depreciation journal entries for all assets
const entries = await accountingService.generateDepreciationJournalEntries(period, userId);
```

### 7. Financial Statements

```typescript
// Generate all financial statements
const statements = await accountingService.generateFinancialStatements(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

console.log('P&L Net Income:', statements.profitAndLoss.netIncome);
console.log('Balance Sheet Total Assets:', statements.balanceSheet.totalAssets);
console.log('Cash Flow Net:', statements.cashFlow.netCashFlow);
```

## Security & Permissions

All accounting endpoints are protected with RBAC middleware:

- `create:account` - Create accounts
- `read:account` - View chart of accounts
- `create:journal_entry` - Create journal entries
- `approve:journal_entry` - Post journal entries
- `create:invoice` - Create invoices
- `approve:invoice` - Approve invoices
- `create:payment` - Record payments
- `create:budget` - Create budgets
- `approve:budget` - Approve budgets
- `create:fixed_asset` - Create fixed assets
- `read:financial_statement` - View financial statements

Segregation of Duties (SoD) is enforced for:
- Journal entries (creator cannot approve)
- Invoices (creator cannot approve)
- Budgets (creator cannot approve)

## Audit Trail

All accounting operations are logged using the audit middleware:
- Account creation
- Journal entry creation and posting
- Invoice creation and approval
- Payment recording
- Budget creation and approval
- Fixed asset creation
- Period close/unlock

## Testing

Run the comprehensive test suite:

```bash
cd server
npx ts-node src/tests/accounting.test.ts
```

The test suite covers:
1. Chart of accounts creation
2. Journal entry creation and posting
3. Trial balance generation
4. Invoice creation
5. Bank account creation
6. Budget creation
7. Fixed asset creation and depreciation
8. Financial statements generation

## Requirements Mapping

This implementation satisfies the following requirements from the spec:

**Requirement 4.1** - Chart of Accounts
- ✅ Hierarchical account structure
- ✅ Account types (Asset, Liability, Equity, Revenue, Expense, COGS)
- ✅ Default chart of accounts templates

**Requirement 4.2** - General Ledger
- ✅ Journal entry creation with double-entry validation
- ✅ Posting process to update account balances
- ✅ Trial balance generation

**Requirement 4.3** - Period Close and Lock
- ✅ Fiscal period management
- ✅ Period locking to prevent changes
- ✅ Period unlock capability

**Requirement 4.4** - Accounts Payable and Receivable
- ✅ Invoice creation (AR and AP)
- ✅ Invoice approval workflow
- ✅ Payment processing
- ✅ AP/AR aging reports

**Requirement 4.5** - Bank Reconciliation
- ✅ Bank statement import
- ✅ Automated transaction matching
- ✅ Manual reconciliation interface

**Requirement 4.6** - Budgeting
- ✅ Budget creation with line items
- ✅ Budget vs actual variance tracking
- ✅ Budget approval workflow
- ✅ Variance reports

**Requirement 4.7** - Fixed Asset Depreciation
- ✅ Fixed asset registration
- ✅ Straight-line depreciation
- ✅ Declining balance depreciation
- ✅ Monthly depreciation journal entries
- ✅ Fixed asset register report

**Requirement 4.8** - Financial Statements
- ✅ Profit & Loss statement
- ✅ Balance Sheet
- ✅ Cash Flow statement

## Future Enhancements

Potential future enhancements:
1. Multi-currency revaluation
2. Intercompany eliminations
3. Consolidation for multi-entity
4. Tax engine integration (Avalara, Vertex)
5. Advanced cash flow forecasting
6. Budget templates and copying
7. Recurring journal entries
8. Bank feed integration (Plaid, Yodlee)
9. Electronic payment processing
10. Advanced financial analytics and dashboards
