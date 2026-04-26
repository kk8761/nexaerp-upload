# Chart of Accounts - Quick Reference Guide

## Account Structure

### Account Code Ranges

| Range | Type | Description |
|-------|------|-------------|
| 1000-1999 | Asset | Resources owned by the company |
| 2000-2999 | Liability | Obligations owed by the company |
| 3000-3999 | Equity | Owner's stake in the company |
| 4000-4999 | Revenue | Income from operations |
| 5000-5999 | COGS | Cost of Goods Sold |
| 6000-9999 | Expense | Operating expenses |

## Default Accounts

### Assets (1000-1999)
```
1000 - Assets (Control)
  1100 - Current Assets
    1110 - Cash
    1120 - Accounts Receivable
    1130 - Inventory
  1200 - Fixed Assets
    1210 - Property, Plant & Equipment
    1220 - Accumulated Depreciation
```

### Liabilities (2000-2999)
```
2000 - Liabilities (Control)
  2100 - Current Liabilities
    2110 - Accounts Payable
    2120 - Accrued Expenses
  2200 - Long-term Liabilities
    2210 - Long-term Debt
```

### Equity (3000-3999)
```
3000 - Equity (Control)
  3100 - Owner's Equity
  3200 - Retained Earnings
```

### Revenue (4000-4999)
```
4000 - Revenue (Control)
  4100 - Sales Revenue
  4200 - Service Revenue
```

### Cost of Goods Sold (5000-5999)
```
5000 - Cost of Goods Sold (Control)
  5100 - Direct Materials
  5200 - Direct Labor
```

### Expenses (6000-9999)
```
6000 - Operating Expenses (Control)
  6100 - Salaries & Wages
  6200 - Rent
  6300 - Utilities
  6400 - Depreciation Expense
  6500 - Marketing & Advertising
```

## API Endpoints

### Create Account
```http
POST /api/accounting/accounts
Content-Type: application/json

{
  "accountCode": "6600",
  "name": "Office Supplies",
  "type": "Expense",
  "parentId": "uuid-of-parent"
}
```

### Get All Accounts
```http
GET /api/accounting/accounts
```

### Create Default Chart
```http
POST /api/accounting/accounts/default
```

### Get Account Balance
```http
GET /api/accounting/accounts/:accountId/balance
```

## Code Examples

### TypeScript/Node.js

```typescript
import * as accountingService from './services/accounting.service';

// Create a new account
const account = await accountingService.createAccount({
  accountCode: '6600',
  name: 'Office Supplies',
  type: 'Expense',
  parentId: parentAccountId,
});

// Get chart of accounts
const accounts = await accountingService.getChartOfAccounts();

// Get account balance
const balance = await accountingService.getAccountBalance(accountId);

// Create default chart
const defaultAccounts = await accountingService.createDefaultChartOfAccounts();
```

### Prisma Queries

```typescript
import prisma from './config/prisma';

// Find account by code
const account = await prisma.account.findUnique({
  where: { accountCode: '1110' },
  include: { parent: true, children: true },
});

// Get all active accounts
const activeAccounts = await prisma.account.findMany({
  where: { isActive: true },
  orderBy: { accountCode: 'asc' },
});

// Get accounts by type
const assetAccounts = await prisma.account.findMany({
  where: { type: 'Asset' },
  include: { children: true },
});
```

## Account Types

| Type | Description | Normal Balance |
|------|-------------|----------------|
| Asset | Resources owned | Debit |
| Liability | Obligations owed | Credit |
| Equity | Owner's stake | Credit |
| Revenue | Income earned | Credit |
| Expense | Costs incurred | Debit |
| COGS | Direct production costs | Debit |

## Validation Rules

1. **Account Code**: Must be unique
2. **Account Type**: Must be one of: Asset, Liability, Equity, Revenue, Expense, COGS
3. **Parent Account**: Must exist if specified
4. **Currency**: Defaults to USD
5. **Balance**: Cannot be directly modified (updated via journal entries)

## Common Operations

### Adding a New Account

1. Determine the appropriate account code range
2. Choose a parent account (if applicable)
3. Set the account type
4. Create the account via API or service

### Modifying an Account

1. Retrieve the account by ID
2. Update allowed fields (name, isActive, etc.)
3. Cannot change: accountCode, balance (directly)

### Deactivating an Account

```typescript
await prisma.account.update({
  where: { id: accountId },
  data: { isActive: false },
});
```

### Getting Account Hierarchy

```typescript
const account = await prisma.account.findUnique({
  where: { id: accountId },
  include: {
    parent: true,
    children: {
      include: {
        children: true, // Grandchildren
      },
    },
  },
});
```

## Testing

### Run Verification Script
```bash
cd server
npx ts-node src/scripts/verifyChartOfAccounts.ts
```

### Check Existing Accounts
```bash
cd server
npx ts-node src/scripts/checkAccounts.ts
```

## Troubleshooting

### Issue: Duplicate Account Code
**Error**: `Unique constraint failed on accountCode`
**Solution**: Use a different account code or update the existing account

### Issue: Invalid Parent Account
**Error**: `Foreign key constraint failed`
**Solution**: Ensure the parent account exists before creating child account

### Issue: Cannot Delete Account
**Error**: `Foreign key constraint failed`
**Solution**: Account has related records (journal lines, etc.). Deactivate instead of deleting.

## Best Practices

1. **Use Control Accounts**: Create parent accounts for logical grouping
2. **Consistent Numbering**: Follow the standard account code ranges
3. **Descriptive Names**: Use clear, unambiguous account names
4. **Hierarchical Structure**: Organize accounts in a logical hierarchy
5. **Deactivate, Don't Delete**: Preserve historical data by deactivating accounts
6. **Document Custom Accounts**: Maintain documentation for custom accounts added

## Related Documentation

- [Full Implementation Guide](../CHART_OF_ACCOUNTS_IMPLEMENTATION.md)
- [Accounting Module API](../ACCOUNTING_MODULE.md)
- [Double-Entry Bookkeeping](../docs/DOUBLE_ENTRY_BOOKKEEPING.md)
- [Financial Statements](../docs/FINANCIAL_STATEMENTS.md)

## Support

For questions or issues:
1. Check the verification script output
2. Review the implementation documentation
3. Examine the Prisma schema
4. Check the service layer code
