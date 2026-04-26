import { Request, Response } from 'express';
import * as accountingService from '../services/accounting.service';

export class AccountingController {
  
  // ─── CHART OF ACCOUNTS (COA) ──────────────────────────────────────────────

  static async createAccount(req: Request, res: Response) {
    try {
      const account = await accountingService.createAccount(req.body);
      res.status(201).json({ success: true, account });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create account' });
    }
  }

  static async getAccounts(_req: Request, res: Response) {
    try {
      const accounts = await accountingService.getChartOfAccounts();
      res.json({ success: true, accounts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch chart of accounts' });
    }
  }

  static async createDefaultChartOfAccounts(_req: Request, res: Response) {
    try {
      const accounts = await accountingService.createDefaultChartOfAccounts();
      res.status(201).json({ success: true, accounts, message: 'Default chart of accounts created' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to create default chart of accounts' });
    }
  }

  static async getAccountBalance(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const balance = await accountingService.getAccountBalance(accountId);
      res.json({ success: true, balance });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get account balance' });
    }
  }

  // ─── JOURNAL ENTRIES ──────────────────────────────────────────────────────

  static async createJournalEntry(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const data = {
        ...req.body,
        date: new Date(req.body.date),
        createdBy: user.id,
      };
      
      const entry = await accountingService.createJournalEntry(data);
      res.status(201).json({ success: true, journalEntry: entry });
    } catch (error: any) {
      console.error(error);
      res.status(400).json({ success: false, message: error.message || 'Failed to create journal entry' });
    }
  }

  static async postJournalEntry(req: Request, res: Response) {
    try {
      const { entryId } = req.params;
      const entry = await accountingService.postJournalEntry(entryId);
      res.json({ success: true, journalEntry: entry, message: 'Journal entry posted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to post journal entry' });
    }
  }

  static async reverseJournalEntry(req: Request, res: Response) {
    try {
      const { entryId } = req.params;
      const { reversalDate } = req.body;
      const user: any = req.user;
      
      const entry = await accountingService.reverseJournalEntry(
        entryId,
        new Date(reversalDate),
        user.id
      );
      res.json({ success: true, journalEntry: entry, message: 'Journal entry reversed successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to reverse journal entry' });
    }
  }

  static async getJournalEntry(req: Request, res: Response) {
    try {
      const { entryId } = req.params;
      const entry = await accountingService.getJournalEntry(entryId);
      res.json({ success: true, journalEntry: entry });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get journal entry' });
    }
  }

  static async getJournalEntries(req: Request, res: Response) {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        status: req.query.status as string,
        sourceModule: req.query.sourceModule as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      
      const entries = await accountingService.getJournalEntries(filters);
      res.json({ success: true, journalEntries: entries });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get journal entries' });
    }
  }

  static async getTrialBalance(req: Request, res: Response) {
    try {
      const asOfDate = req.query.asOfDate 
        ? new Date(req.query.asOfDate as string) 
        : new Date();
      
      const trialBalance = await accountingService.getTrialBalance(asOfDate);
      res.json({ success: true, trialBalance });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate trial balance' });
    }
  }

  // ─── PERIOD CLOSE AND LOCK ────────────────────────────────────────────────

  static async closeFiscalPeriod(req: Request, res: Response) {
    try {
      const { period } = req.body;
      const user: any = req.user;
      
      const fiscalPeriod = await accountingService.closeFiscalPeriod(period, user.id);
      res.json({ success: true, fiscalPeriod, message: `Period ${period} locked successfully` });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to close fiscal period' });
    }
  }

  static async unlockFiscalPeriod(req: Request, res: Response) {
    try {
      const { period } = req.body;
      
      const fiscalPeriod = await accountingService.unlockFiscalPeriod(period);
      res.json({ success: true, fiscalPeriod, message: `Period ${period} unlocked successfully` });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to unlock fiscal period' });
    }
  }

  // ─── INVOICES (AR/AP) ─────────────────────────────────────────────────────

  static async createInvoice(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        issueDate: new Date(req.body.issueDate),
        dueDate: new Date(req.body.dueDate),
      };
      
      const invoice = await accountingService.createInvoice(data);
      res.status(201).json({ success: true, invoice });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create invoice' });
    }
  }

  static async approveInvoice(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const user: any = req.user;
      
      const invoice = await accountingService.approveInvoice(invoiceId, user.id);
      res.json({ success: true, invoice, message: 'Invoice approved successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to approve invoice' });
    }
  }

  static async recordPayment(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const data = {
        ...req.body,
        paymentDate: new Date(req.body.paymentDate),
        userId: user.id,
      };
      
      const payment = await accountingService.recordPayment(data);
      res.status(201).json({ success: true, payment, message: 'Payment recorded successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to record payment' });
    }
  }

  static async getAPAgingReport(req: Request, res: Response) {
    try {
      const asOfDate = req.query.asOfDate 
        ? new Date(req.query.asOfDate as string) 
        : new Date();
      
      const report = await accountingService.getAPAgingReport(asOfDate);
      res.json({ success: true, report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate AP aging report' });
    }
  }

  static async getARAgingReport(req: Request, res: Response) {
    try {
      const asOfDate = req.query.asOfDate 
        ? new Date(req.query.asOfDate as string) 
        : new Date();
      
      const report = await accountingService.getARAgingReport(asOfDate);
      res.json({ success: true, report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate AR aging report' });
    }
  }

  static async getAPAgingByVendor(req: Request, res: Response) {
    try {
      const asOfDate = req.query.asOfDate 
        ? new Date(req.query.asOfDate as string) 
        : new Date();
      const supplierId = req.query.supplierId as string | undefined;
      
      const report = await accountingService.getAPAgingByVendor(asOfDate, supplierId);
      res.json({ success: true, report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate AP aging by vendor report' });
    }
  }

  // ─── ACCOUNTS RECEIVABLE (AR) ─────────────────────────────────────────────

  static async generateInvoiceFromSalesOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const user: any = req.user;
      
      const invoice = await accountingService.generateInvoiceFromSalesOrder(orderId, user.id);
      res.json({ success: true, invoice, message: 'Customer invoice generated successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to generate invoice from sales order' });
    }
  }

  static async recordCustomerPayment(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const payment = await accountingService.recordCustomerPayment({
        ...req.body,
        userId: user.id,
      });
      res.json({ success: true, payment, message: 'Customer payment recorded successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to record customer payment' });
    }
  }

  static async getARAgingByCustomer(req: Request, res: Response) {
    try {
      const asOfDate = req.query.asOfDate 
        ? new Date(req.query.asOfDate as string) 
        : new Date();
      const customerId = req.query.customerId as string | undefined;
      
      const report = await accountingService.getARAgingByCustomer(asOfDate, customerId);
      res.json({ success: true, report });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate AR aging by customer report' });
    }
  }

  // ─── INVOICE MANAGEMENT ───────────────────────────────────────────────────

  static async getInvoiceDetails(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      
      const invoice = await accountingService.getInvoiceDetails(invoiceId);
      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      
      return res.json({ success: true, invoice });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to get invoice details' });
    }
  }

  static async getPendingAPInvoices(_req: Request, res: Response) {
    try {
      const invoices = await accountingService.getPendingAPInvoices();
      res.json({ success: true, invoices });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get pending AP invoices' });
    }
  }

  static async submitInvoiceForApproval(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const user: any = req.user;
      
      const approvalRequest = await accountingService.submitInvoiceForApproval(invoiceId, user.id);
      res.json({ success: true, approvalRequest, message: 'Invoice submitted for approval' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to submit invoice for approval' });
    }
  }

  static async processInvoiceApproval(req: Request, res: Response) {
    try {
      const { approvalRequestId } = req.params;
      const { action, comments } = req.body;
      const user: any = req.user;
      
      const result = await accountingService.processInvoiceApproval(
        approvalRequestId,
        user.id,
        action,
        comments
      );
      
      res.json({ success: true, result, message: `Invoice ${action} successfully` });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to process invoice approval' });
    }
  }

  // ─── BANK RECONCILIATION ──────────────────────────────────────────────────

  static async getBankAccounts(_req: Request, res: Response) {
    try {
      const bankAccounts = await accountingService.getBankAccounts();
      res.json({ success: true, bankAccounts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get bank accounts' });
    }
  }

  static async createBankAccount(req: Request, res: Response) {
    try {
      const bankAccount = await accountingService.createBankAccount(req.body);
      res.status(201).json({ success: true, bankAccount });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to create bank account' });
    }
  }

  static async importBankStatement(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        statementDate: new Date(req.body.statementDate),
        transactions: req.body.transactions.map((t: any) => ({
          ...t,
          transactionDate: new Date(t.transactionDate),
        })),
      };
      
      const statement = await accountingService.importBankStatement(data);
      res.status(201).json({ success: true, statement, message: 'Bank statement imported successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to import bank statement' });
    }
  }

  static async importBankStatementFromFile(req: Request, res: Response): Promise<void> {
    try {
      const { bankAccountId, fileType } = req.body;
      const fileContent = req.body.fileContent || req.body.content;
      
      if (!fileContent) {
        res.status(400).json({ success: false, message: 'File content is required' });
        return;
      }
      
      if (!['csv', 'ofx'].includes(fileType)) {
        res.status(400).json({ success: false, message: 'Invalid file type. Only CSV and OFX are supported.' });
        return;
      }
      
      const statement = await accountingService.importBankStatementFromFile(
        bankAccountId,
        fileContent,
        fileType as 'csv' | 'ofx'
      );
      
      res.status(201).json({ 
        success: true, 
        statement, 
        message: `Bank statement imported successfully from ${fileType.toUpperCase()} file` 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to import bank statement from file' });
    }
  }

  static async autoMatchBankTransactions(req: Request, res: Response) {
    try {
      const { statementId } = req.params;
      
      const matches = await accountingService.autoMatchBankTransactions(statementId);
      res.json({ 
        success: true, 
        matches, 
        message: `Automatically matched ${matches.length} transactions` 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to auto-match transactions' });
    }
  }

  static async enhancedAutoMatch(req: Request, res: Response) {
    try {
      const { statementId } = req.params;
      
      const result = await accountingService.enhancedAutoMatch(statementId);
      res.json({ 
        success: true, 
        ...result,
        message: `Matched ${result.matches.length} transactions, found ${result.suggestions.length} suggestions` 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to auto-match transactions' });
    }
  }

  static async manualMatchTransaction(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const { matchType, matchId } = req.body;
      
      const result = await accountingService.manualMatchTransaction(transactionId, matchType, matchId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to match transaction' });
    }
  }

  static async unmatchTransaction(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      
      const result = await accountingService.unmatchTransaction(transactionId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to unmatch transaction' });
    }
  }

  static async getReconciliationDetails(req: Request, res: Response) {
    try {
      const { statementId } = req.params;
      
      const details = await accountingService.getReconciliationDetails(statementId);
      res.json({ success: true, ...details });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get reconciliation details' });
    }
  }

  static async createBankReconciliation(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const data = {
        ...req.body,
        reconciliationDate: new Date(req.body.reconciliationDate),
        reconciledBy: user.id,
      };
      
      const reconciliation = await accountingService.createBankReconciliation(data);
      res.status(201).json({ success: true, reconciliation });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to create bank reconciliation' });
    }
  }

  // ─── BUDGETING ────────────────────────────────────────────────────────────

  static async getBudgets(req: Request, res: Response) {
    try {
      const { fiscalYear, status } = req.query;
      
      const budgets = await accountingService.getBudgets({
        fiscalYear: fiscalYear as string,
        status: status as string,
      });
      
      res.json({ success: true, budgets });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get budgets' });
    }
  }

  static async createBudget(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      };
      
      const budget = await accountingService.createBudget(data);
      res.status(201).json({ success: true, budget });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to create budget' });
    }
  }

  static async approveBudget(req: Request, res: Response) {
    try {
      const { budgetId } = req.params;
      const user: any = req.user;
      
      const budget = await accountingService.approveBudget(budgetId, user.id);
      res.json({ success: true, budget, message: 'Budget approved successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to approve budget' });
    }
  }

  static async updateBudgetActuals(req: Request, res: Response) {
    try {
      const { period } = req.body;
      
      await accountingService.updateBudgetActuals(period);
      res.json({ success: true, message: `Budget actuals updated for period ${period}` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to update budget actuals' });
    }
  }

  static async getBudgetVarianceReport(req: Request, res: Response) {
    try {
      const { budgetId } = req.params;
      
      const budget = await accountingService.getBudgetVarianceReport(budgetId);
      res.json({ success: true, budget });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate budget variance report' });
    }
  }

  // ─── FIXED ASSETS ─────────────────────────────────────────────────────────

  static async createFixedAsset(req: Request, res: Response) {
    try {
      const data = {
        ...req.body,
        acquisitionDate: new Date(req.body.acquisitionDate),
      };
      
      const asset = await accountingService.createFixedAsset(data);
      res.status(201).json({ success: true, asset });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to create fixed asset' });
    }
  }

  static async calculateDepreciation(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const { period } = req.body;
      
      const entry = await accountingService.calculateDepreciation(assetId, period);
      res.json({ success: true, depreciationEntry: entry });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to calculate depreciation' });
    }
  }

  static async generateDepreciationJournalEntries(req: Request, res: Response) {
    try {
      const { period } = req.body;
      const user: any = req.user;
      
      const entries = await accountingService.generateDepreciationJournalEntries(period, user.id);
      res.json({ 
        success: true, 
        entries, 
        message: `Generated ${entries.length} depreciation journal entries for period ${period}` 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate depreciation entries' });
    }
  }

  static async getFixedAssetRegister(_req: Request, res: Response) {
    try {
      const register = await accountingService.getFixedAssetRegister();
      res.json({ success: true, register });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get fixed asset register' });
    }
  }

  // ─── FINANCIAL STATEMENTS ─────────────────────────────────────────────────

  static async generateProfitAndLoss(req: Request, res: Response) {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      const statement = await accountingService.generateProfitAndLoss(startDate, endDate);
      res.json({ success: true, statement });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate P&L statement' });
    }
  }

  static async generateBalanceSheet(req: Request, res: Response) {
    try {
      const asOfDate = req.query.asOfDate 
        ? new Date(req.query.asOfDate as string) 
        : new Date();
      
      const statement = await accountingService.generateBalanceSheet(asOfDate);
      res.json({ success: true, statement });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate balance sheet' });
    }
  }

  static async generateCashFlowStatement(req: Request, res: Response) {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      const statement = await accountingService.generateCashFlowStatement(startDate, endDate);
      res.json({ success: true, statement });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate cash flow statement' });
    }
  }

  static async generateFinancialStatements(req: Request, res: Response) {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      const statements = await accountingService.generateFinancialStatements(startDate, endDate);
      res.json({ success: true, statements });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to generate financial statements' });
    }
  }
}
