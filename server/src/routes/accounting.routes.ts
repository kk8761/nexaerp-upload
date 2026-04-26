import { Router } from 'express';
import { AccountingController } from '../controllers/accounting.controller';
import { requirePermission, enforceSoD } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// ─── CHART OF ACCOUNTS ────────────────────────────────────────────────────

router.post('/accounts', 
  requirePermission('create', 'account'),
  auditLog('CREATE', 'account'),
  AccountingController.createAccount
);

router.get('/accounts', 
  requirePermission('read', 'account'),
  AccountingController.getAccounts
);

router.post('/accounts/default', 
  requirePermission('create', 'account'),
  auditLog('CREATE', 'account'),
  AccountingController.createDefaultChartOfAccounts
);

router.get('/accounts/:accountId/balance', 
  requirePermission('read', 'account'),
  AccountingController.getAccountBalance
);

// ─── JOURNAL ENTRIES ──────────────────────────────────────────────────────

router.post('/journal-entries', 
  requirePermission('create', 'journal_entry'),
  enforceSoD(['create', 'approve'], 'journal_entry'),
  auditLog('CREATE', 'journal_entry'),
  AccountingController.createJournalEntry
);

router.get('/journal-entries', 
  requirePermission('read', 'journal_entry'),
  AccountingController.getJournalEntries
);

router.get('/journal-entries/:entryId', 
  requirePermission('read', 'journal_entry'),
  AccountingController.getJournalEntry
);

router.post('/journal-entries/:entryId/post', 
  requirePermission('approve', 'journal_entry'),
  auditLog('POST', 'journal_entry'),
  AccountingController.postJournalEntry
);

router.post('/journal-entries/:entryId/reverse', 
  requirePermission('create', 'journal_entry'),
  auditLog('REVERSE', 'journal_entry'),
  AccountingController.reverseJournalEntry
);

router.get('/trial-balance', 
  requirePermission('read', 'journal_entry'),
  AccountingController.getTrialBalance
);

// ─── PERIOD CLOSE AND LOCK ────────────────────────────────────────────────

router.post('/fiscal-periods/close', 
  requirePermission('approve', 'fiscal_period'),
  auditLog('CLOSE', 'fiscal_period'),
  AccountingController.closeFiscalPeriod
);

router.post('/fiscal-periods/unlock', 
  requirePermission('approve', 'fiscal_period'),
  auditLog('UNLOCK', 'fiscal_period'),
  AccountingController.unlockFiscalPeriod
);

// ─── INVOICES (AR/AP) ─────────────────────────────────────────────────────

router.post('/invoices', 
  requirePermission('create', 'invoice'),
  auditLog('CREATE', 'invoice'),
  AccountingController.createInvoice
);

router.post('/invoices/:invoiceId/approve', 
  requirePermission('approve', 'invoice'),
  enforceSoD(['create', 'approve'], 'invoice'),
  auditLog('APPROVE', 'invoice'),
  AccountingController.approveInvoice
);

router.post('/payments', 
  requirePermission('create', 'payment'),
  auditLog('CREATE', 'payment'),
  AccountingController.recordPayment
);

router.get('/reports/ap-aging', 
  requirePermission('read', 'invoice'),
  AccountingController.getAPAgingReport
);

router.get('/reports/ar-aging', 
  requirePermission('read', 'invoice'),
  AccountingController.getARAgingReport
);

router.get('/reports/ap-aging-by-vendor', 
  requirePermission('read', 'invoice'),
  AccountingController.getAPAgingByVendor
);

// ─── ACCOUNTS RECEIVABLE (AR) ─────────────────────────────────────────────

router.post('/ar/generate-invoice-from-order/:orderId', 
  requirePermission('create', 'invoice'),
  auditLog('GENERATE_INVOICE_FROM_ORDER', 'invoice'),
  AccountingController.generateInvoiceFromSalesOrder
);

router.post('/ar/payments', 
  requirePermission('create', 'payment'),
  auditLog('CREATE', 'payment'),
  AccountingController.recordCustomerPayment
);

router.get('/reports/ar-aging-by-customer', 
  requirePermission('read', 'invoice'),
  AccountingController.getARAgingByCustomer
);

// ─── INVOICE MANAGEMENT ───────────────────────────────────────────────────

router.get('/invoices/:invoiceId', 
  requirePermission('read', 'invoice'),
  AccountingController.getInvoiceDetails
);

router.get('/invoices/pending/ap', 
  requirePermission('read', 'invoice'),
  AccountingController.getPendingAPInvoices
);

router.post('/invoices/:invoiceId/submit-for-approval', 
  requirePermission('create', 'invoice'),
  auditLog('SUBMIT_FOR_APPROVAL', 'invoice'),
  AccountingController.submitInvoiceForApproval
);

router.post('/approval-requests/:approvalRequestId/process', 
  requirePermission('approve', 'invoice'),
  enforceSoD(['create', 'approve'], 'invoice'),
  auditLog('PROCESS_APPROVAL', 'invoice'),
  AccountingController.processInvoiceApproval
);

// ─── BANK RECONCILIATION ──────────────────────────────────────────────────

router.get('/bank-accounts', 
  requirePermission('read', 'bank_account'),
  AccountingController.getBankAccounts
);

router.post('/bank-accounts', 
  requirePermission('create', 'bank_account'),
  auditLog('CREATE', 'bank_account'),
  AccountingController.createBankAccount
);

router.post('/bank-statements/import', 
  requirePermission('create', 'bank_statement'),
  auditLog('IMPORT', 'bank_statement'),
  AccountingController.importBankStatement
);

router.post('/bank-statements/import-file', 
  requirePermission('create', 'bank_statement'),
  auditLog('IMPORT', 'bank_statement'),
  AccountingController.importBankStatementFromFile
);

router.post('/bank-statements/:statementId/auto-match', 
  requirePermission('update', 'bank_statement'),
  AccountingController.autoMatchBankTransactions
);

router.post('/bank-statements/:statementId/enhanced-match', 
  requirePermission('update', 'bank_statement'),
  AccountingController.enhancedAutoMatch
);

router.get('/bank-statements/:statementId/reconciliation-details', 
  requirePermission('read', 'bank_statement'),
  AccountingController.getReconciliationDetails
);

router.post('/bank-transactions/:transactionId/match', 
  requirePermission('update', 'bank_statement'),
  auditLog('MATCH', 'bank_transaction'),
  AccountingController.manualMatchTransaction
);

router.post('/bank-transactions/:transactionId/unmatch', 
  requirePermission('update', 'bank_statement'),
  auditLog('UNMATCH', 'bank_transaction'),
  AccountingController.unmatchTransaction
);

router.post('/bank-reconciliations', 
  requirePermission('create', 'bank_reconciliation'),
  auditLog('CREATE', 'bank_reconciliation'),
  AccountingController.createBankReconciliation
);

// ─── BUDGETING ────────────────────────────────────────────────────────────

router.get('/budgets', 
  requirePermission('read', 'budget'),
  AccountingController.getBudgets
);

router.post('/budgets', 
  requirePermission('create', 'budget'),
  auditLog('CREATE', 'budget'),
  AccountingController.createBudget
);

router.post('/budgets/:budgetId/approve', 
  requirePermission('approve', 'budget'),
  enforceSoD(['create', 'approve'], 'budget'),
  auditLog('APPROVE', 'budget'),
  AccountingController.approveBudget
);

router.post('/budgets/update-actuals', 
  requirePermission('update', 'budget'),
  AccountingController.updateBudgetActuals
);

router.get('/budgets/:budgetId/variance-report', 
  requirePermission('read', 'budget'),
  AccountingController.getBudgetVarianceReport
);

// ─── FIXED ASSETS ─────────────────────────────────────────────────────────

router.post('/fixed-assets', 
  requirePermission('create', 'fixed_asset'),
  auditLog('CREATE', 'fixed_asset'),
  AccountingController.createFixedAsset
);

router.post('/fixed-assets/:assetId/depreciation', 
  requirePermission('update', 'fixed_asset'),
  AccountingController.calculateDepreciation
);

router.post('/fixed-assets/depreciation/generate-entries', 
  requirePermission('create', 'journal_entry'),
  auditLog('GENERATE_DEPRECIATION', 'journal_entry'),
  AccountingController.generateDepreciationJournalEntries
);

router.get('/fixed-assets/register', 
  requirePermission('read', 'fixed_asset'),
  AccountingController.getFixedAssetRegister
);

// ─── FINANCIAL STATEMENTS ─────────────────────────────────────────────────

router.get('/reports/profit-and-loss', 
  requirePermission('read', 'financial_statement'),
  AccountingController.generateProfitAndLoss
);

router.get('/reports/balance-sheet', 
  requirePermission('read', 'financial_statement'),
  AccountingController.generateBalanceSheet
);

router.get('/reports/cash-flow', 
  requirePermission('read', 'financial_statement'),
  AccountingController.generateCashFlowStatement
);

router.get('/reports/financial-statements', 
  requirePermission('read', 'financial_statement'),
  AccountingController.generateFinancialStatements
);

export default router;
