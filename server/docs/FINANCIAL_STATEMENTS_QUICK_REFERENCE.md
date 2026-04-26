# Financial Statements Quick Reference Guide

## Overview

The Financial Statements module provides comprehensive financial reporting capabilities for NexaERP, including Profit & Loss (Income Statement), Balance Sheet, and Cash Flow Statement generation.

## Quick Access

### Web Interface
**URL**: `http://localhost:3000/finance/financial-statements`

### API Endpoints
- **P&L**: `GET /api/accounting/reports/profit-and-loss`
- **Balance Sheet**: `GET /api/accounting/reports/balance-sheet`
- **Cash Flow**: `GET /api/accounting/reports/cash-flow`
- **All Statements**: `GET /api/accounting/reports/financial-statements`

## Using the Web Interface

### Step 1: Navigate to Financial Statements
1. Log in to NexaERP
2. Go to **Finance** → **Financial Statements**
3. Or navigate directly to `/finance/financial-statements`

### Step 2: Select Date Range
1. Choose **Start Date** (beginning of reporting period)
2. Choose **End Date** (end of reporting period)
3. Click **Generate** button

### Step 3: View Statements
- Click tabs to switch between:
  - **Profit & Loss** - Income statement showing revenue and expenses
  - **Balance Sheet** - Assets, liabilities, and equity
  - **Cash Flow** - Operating, investing, and financing activities

### Step 4: Export (Coming Soon)
- Click **Export PDF** for PDF format
- Click **Export Excel** for Excel format

## Using the API

### Generate Profit & Loss Statement

**Request**:
```bash
GET /api/accounting/reports/profit-and-loss?startDate=2024-01-01&endDate=2024-12-31
```

**Response**:
```json
{
  "success": true,
  "statement": {
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T00:00:00.000Z"
    },
    "revenue": [
      {
        "accountCode": "4000",
        "accountName": "Sales Revenue",
        "amount": 150000.00
      }
    ],
    "totalRevenue": 150000.00,
    "cogs": [...],
    "totalCOGS": 60000.00,
    "grossProfit": 90000.00,
    "expenses": [...],
    "totalExpenses": 50000.00,
    "netIncome": 40000.00
  }
}
```

### Generate Balance Sheet

**Request**:
```bash
GET /api/accounting/reports/balance-sheet?asOfDate=2024-12-31
```

**Response**:
```json
{
  "success": true,
  "statement": {
    "asOfDate": "2024-12-31T00:00:00.000Z",
    "assets": [
      {
        "accountCode": "1000",
        "accountName": "Cash",
        "amount": 50000.00
      }
    ],
    "totalAssets": 200000.00,
    "liabilities": [...],
    "totalLiabilities": 80000.00,
    "equity": [...],
    "totalEquity": 120000.00,
    "totalLiabilitiesAndEquity": 200000.00
  }
}
```

### Generate Cash Flow Statement

**Request**:
```bash
GET /api/accounting/reports/cash-flow?startDate=2024-01-01&endDate=2024-12-31
```

**Response**:
```json
{
  "success": true,
  "statement": {
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T00:00:00.000Z"
    },
    "operating": [
      {
        "date": "2024-03-15T00:00:00.000Z",
        "description": "Customer payment",
        "amount": 5000.00
      }
    ],
    "operatingCashFlow": 25000.00,
    "investing": [...],
    "investingCashFlow": -10000.00,
    "financing": [...],
    "financingCashFlow": 5000.00,
    "netCashFlow": 20000.00
  }
}
```

### Generate All Statements

**Request**:
```bash
GET /api/accounting/reports/financial-statements?startDate=2024-01-01&endDate=2024-12-31
```

**Response**:
```json
{
  "success": true,
  "statements": {
    "profitAndLoss": { ... },
    "balanceSheet": { ... },
    "cashFlow": { ... }
  }
}
```

## Understanding the Statements

### Profit & Loss (Income Statement)

**Purpose**: Shows company profitability over a period

**Key Metrics**:
- **Total Revenue**: All income from sales and services
- **Total COGS**: Direct costs of producing goods/services
- **Gross Profit**: Revenue minus COGS
- **Total Expenses**: Operating expenses
- **Net Income**: Bottom line profit (or loss)

**Formula**: Net Income = Revenue - COGS - Expenses

### Balance Sheet

**Purpose**: Shows financial position at a point in time

**Key Metrics**:
- **Total Assets**: What the company owns
- **Total Liabilities**: What the company owes
- **Total Equity**: Owner's stake in the company

**Formula**: Assets = Liabilities + Equity

**Balance Check**: The statement should always balance (Assets = Liabilities + Equity)

### Cash Flow Statement

**Purpose**: Shows cash movement over a period

**Key Metrics**:
- **Operating Cash Flow**: Cash from core business operations
- **Investing Cash Flow**: Cash from asset purchases/sales
- **Financing Cash Flow**: Cash from loans, equity, dividends
- **Net Cash Flow**: Total change in cash position

**Formula**: Net Cash Flow = Operating + Investing + Financing

## Common Use Cases

### Monthly Financial Review
1. Set date range to current month
2. Generate all statements
3. Review Net Income (P&L)
4. Check cash position (Balance Sheet)
5. Analyze cash flow trends (Cash Flow)

### Year-End Reporting
1. Set date range to fiscal year (e.g., Jan 1 - Dec 31)
2. Generate all statements
3. Export to PDF for records
4. Compare to prior year
5. Use for tax preparation

### Quarterly Board Reports
1. Set date range to quarter (e.g., Q1: Jan 1 - Mar 31)
2. Generate all statements
3. Export to Excel for analysis
4. Present to board/stakeholders

### Budget vs Actual Analysis
1. Generate P&L for period
2. Compare to budget (future feature)
3. Analyze variances
4. Adjust forecasts

## Permissions Required

**Permission**: `read:financial_statement`

**Who has access**:
- Financial Controllers
- CFO/Finance Directors
- Accountants
- Auditors (read-only)

**To grant access**:
1. Go to User Management
2. Assign role with `read:financial_statement` permission
3. Or create custom role with this permission

## Troubleshooting

### No data showing in statements
**Cause**: No journal entries posted for the selected period
**Solution**: 
1. Verify journal entries exist and are posted
2. Check date range includes transaction dates
3. Ensure accounts are properly categorized by type

### Balance Sheet doesn't balance
**Cause**: Unbalanced journal entries or data corruption
**Solution**:
1. Run trial balance report
2. Verify all journal entries have equal debits and credits
3. Check for orphaned transactions
4. Contact system administrator

### Cash Flow shows zero
**Cause**: No cash account transactions or incorrect account naming
**Solution**:
1. Verify cash accounts exist with "Cash" in the name
2. Check transactions are posted to cash accounts
3. Review cash account journal entries

### Permission denied error
**Cause**: User lacks required permission
**Solution**:
1. Contact system administrator
2. Request `read:financial_statement` permission
3. Or request assignment to appropriate role

## Best Practices

### Date Ranges
- **Monthly**: Use first and last day of month
- **Quarterly**: Use quarter start/end dates
- **Yearly**: Use fiscal year start/end dates
- **Custom**: Any date range for special analysis

### Frequency
- Generate monthly for regular monitoring
- Generate quarterly for board reports
- Generate annually for year-end closing
- Generate on-demand for special analysis

### Data Quality
- Ensure all transactions are posted before generating
- Review and reconcile accounts regularly
- Close periods to prevent backdated entries
- Run trial balance to verify data integrity

### Security
- Limit access to authorized personnel only
- Use audit logs to track who views statements
- Export and store statements securely
- Follow data retention policies

## Related Features

- **Chart of Accounts**: Defines account structure for statements
- **Journal Entries**: Source data for all statements
- **General Ledger**: Aggregates account balances
- **Bank Reconciliation**: Ensures cash accuracy
- **Budget Management**: Compare actuals to budget
- **Fixed Assets**: Depreciation affects P&L and Balance Sheet

## Support

For questions or issues:
1. Check this guide first
2. Review ACCOUNTING_MODULE.md for technical details
3. Contact system administrator
4. Refer to FINANCIAL_STATEMENTS_IMPLEMENTATION.md for developers

## Version History

- **v1.0** (2024): Initial implementation
  - P&L statement generation
  - Balance Sheet generation
  - Cash Flow statement generation
  - Web interface with tabbed view
  - API endpoints for all statements
