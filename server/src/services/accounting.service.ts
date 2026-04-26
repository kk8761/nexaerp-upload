import prisma from '../config/prisma';
import { generateTransactionCode } from './supplier.service';

/**
 * Accounting Service
 * Implements full accounting suite with GL, AP/AR, bank reconciliation, budgeting, and fixed assets
 */

// ─── Chart of Accounts ───────────────────────────────────────

export interface AccountInput {
  accountCode: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'COGS';
  subType?: string;
  currency?: string;
  parentId?: string;
  isControlAccount?: boolean;
}

export async function createAccount(data: AccountInput) {
  return await prisma.account.create({
    data: {
      ...data,
      balance: 0,
      isActive: true,
    },
    include: {
      parent: true,
      children: true,
    },
  });
}

export async function getChartOfAccounts() {
  return await prisma.account.findMany({
    where: { isActive: true },
    include: {
      parent: true,
      children: true,
    },
    orderBy: { accountCode: 'asc' },
  });
}

export async function getAccountBalance(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { balance: true },
  });
  return account?.balance || 0;
}

/**
 * Create default chart of accounts template
 * Based on standard accounting structure
 */
export async function createDefaultChartOfAccounts() {
  const accounts = [
    // Assets (1000-1999)
    { accountCode: '1000', name: 'Assets', type: 'Asset', isControlAccount: true },
    { accountCode: '1100', name: 'Current Assets', type: 'Asset', parentCode: '1000' },
    { accountCode: '1110', name: 'Cash', type: 'Asset', parentCode: '1100' },
    { accountCode: '1120', name: 'Accounts Receivable', type: 'Asset', parentCode: '1100' },
    { accountCode: '1130', name: 'Inventory', type: 'Asset', parentCode: '1100' },
    { accountCode: '1200', name: 'Fixed Assets', type: 'Asset', parentCode: '1000' },
    { accountCode: '1210', name: 'Property, Plant & Equipment', type: 'Asset', parentCode: '1200' },
    { accountCode: '1220', name: 'Accumulated Depreciation', type: 'Asset', parentCode: '1200' },
    
    // Liabilities (2000-2999)
    { accountCode: '2000', name: 'Liabilities', type: 'Liability', isControlAccount: true },
    { accountCode: '2100', name: 'Current Liabilities', type: 'Liability', parentCode: '2000' },
    { accountCode: '2110', name: 'Accounts Payable', type: 'Liability', parentCode: '2100' },
    { accountCode: '2120', name: 'Accrued Expenses', type: 'Liability', parentCode: '2100' },
    { accountCode: '2200', name: 'Long-term Liabilities', type: 'Liability', parentCode: '2000' },
    { accountCode: '2210', name: 'Long-term Debt', type: 'Liability', parentCode: '2200' },
    
    // Equity (3000-3999)
    { accountCode: '3000', name: 'Equity', type: 'Equity', isControlAccount: true },
    { accountCode: '3100', name: 'Owner\'s Equity', type: 'Equity', parentCode: '3000' },
    { accountCode: '3200', name: 'Retained Earnings', type: 'Equity', parentCode: '3000' },
    
    // Revenue (4000-4999)
    { accountCode: '4000', name: 'Revenue', type: 'Revenue', isControlAccount: true },
    { accountCode: '4100', name: 'Sales Revenue', type: 'Revenue', parentCode: '4000' },
    { accountCode: '4200', name: 'Service Revenue', type: 'Revenue', parentCode: '4000' },
    
    // Cost of Goods Sold (5000-5999)
    { accountCode: '5000', name: 'Cost of Goods Sold', type: 'COGS', isControlAccount: true },
    { accountCode: '5100', name: 'Direct Materials', type: 'COGS', parentCode: '5000' },
    { accountCode: '5200', name: 'Direct Labor', type: 'COGS', parentCode: '5000' },
    
    // Expenses (6000-9999)
    { accountCode: '6000', name: 'Operating Expenses', type: 'Expense', isControlAccount: true },
    { accountCode: '6100', name: 'Salaries & Wages', type: 'Expense', parentCode: '6000' },
    { accountCode: '6200', name: 'Rent', type: 'Expense', parentCode: '6000' },
    { accountCode: '6300', name: 'Utilities', type: 'Expense', parentCode: '6000' },
    { accountCode: '6400', name: 'Depreciation Expense', type: 'Expense', parentCode: '6000' },
    { accountCode: '6500', name: 'Marketing & Advertising', type: 'Expense', parentCode: '6000' },
  ];

  const createdAccounts: any = {};
  
  for (const account of accounts) {
    const { parentCode, ...accountData } = account as any;
    const parentId = parentCode ? createdAccounts[parentCode]?.id : undefined;
    
    const created = await prisma.account.create({
      data: {
        ...accountData,
        parentId,
        balance: 0,
        isActive: true,
      },
    });
    
    createdAccounts[account.accountCode] = created;
  }
  
  return Object.values(createdAccounts);
}

// ─── General Ledger (GL) ─────────────────────────────────────

export interface JournalEntryInput {
  date: Date;
  description: string;
  referenceId?: string;
  sourceModule?: string;
  lines: JournalLineInput[];
  createdBy: string;
}

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
  projectId?: string;
}

/**
 * Create journal entry with double-entry validation
 */
export async function createJournalEntry(data: JournalEntryInput) {
  // Validate double-entry: debits must equal credits
  const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
  }
  
  // Generate entry number and transaction code
  const count = await prisma.journalEntry.count();
  const entryNumber = `JE-${String(count + 1).padStart(6, '0')}`;
  const transactionCode = await generateTransactionCode();
  
  // Get fiscal period
  const fiscalPeriod = getFiscalPeriod(data.date);
  
  // Check if period is locked
  const period = await prisma.fiscalPeriod.findUnique({
    where: { period: fiscalPeriod },
  });
  
  if (period?.isLocked) {
    throw new Error(`Fiscal period ${fiscalPeriod} is locked. Cannot create journal entries.`);
  }
  
  return await prisma.journalEntry.create({
    data: {
      entryNumber,
      transactionCode,
      date: data.date,
      description: data.description,
      referenceId: data.referenceId,
      sourceModule: data.sourceModule || 'manual',
      status: 'draft',
      fiscalPeriod,
      createdBy: data.createdBy,
      lines: {
        create: data.lines,
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}

/**
 * Post journal entry to update account balances
 */
export async function postJournalEntry(entryId: string) {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
  
  if (!entry) {
    throw new Error('Journal entry not found');
  }
  
  if (entry.status === 'posted') {
    throw new Error('Journal entry is already posted');
  }
  
  if (entry.isLocked) {
    throw new Error('Journal entry is locked');
  }
  
  // Update account balances
  for (const line of entry.lines) {
    const account = line.account;
    let balanceChange = 0;
    
    // Calculate balance change based on account type
    // Debit increases: Assets, Expenses, COGS
    // Credit increases: Liabilities, Equity, Revenue
    if (['Asset', 'Expense', 'COGS'].includes(account.type)) {
      balanceChange = line.debit - line.credit;
    } else {
      balanceChange = line.credit - line.debit;
    }
    
    await prisma.account.update({
      where: { id: account.id },
      data: {
        balance: {
          increment: balanceChange,
        },
      },
    });
  }
  
  // Update entry status
  return await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      status: 'posted',
      postingDate: new Date(),
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
}

/**
 * Reverse journal entry
 */
export async function reverseJournalEntry(entryId: string, reversalDate: Date, userId: string) {
  const originalEntry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: {
      lines: true,
    },
  });
  
  if (!originalEntry) {
    throw new Error('Journal entry not found');
  }
  
  if (originalEntry.status !== 'posted') {
    throw new Error('Can only reverse posted journal entries');
  }
  
  // Create reversal entry with swapped debits and credits
  const reversalLines: JournalLineInput[] = originalEntry.lines.map(line => ({
    accountId: line.accountId,
    debit: line.credit,
    credit: line.debit,
    description: `Reversal of ${originalEntry.entryNumber}`,
    costCenter: line.costCenter || undefined,
    projectId: line.projectId || undefined,
  }));
  
  return await createJournalEntry({
    date: reversalDate,
    description: `Reversal of ${originalEntry.entryNumber}: ${originalEntry.description}`,
    referenceId: originalEntry.id,
    sourceModule: 'reversal',
    lines: reversalLines,
    createdBy: userId,
  });
}

/**
 * Get trial balance
 */
export async function getTrialBalance(asOfDate: Date) {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            status: 'posted',
            date: {
              lte: asOfDate,
            },
          },
        },
      },
    },
    orderBy: { accountCode: 'asc' },
  });
  
  const trialBalance = accounts.map(account => {
    const totalDebits = account.journalLines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = account.journalLines.reduce((sum, line) => sum + line.credit, 0);
    
    return {
      accountCode: account.accountCode,
      accountName: account.name,
      accountType: account.type,
      debit: totalDebits,
      credit: totalCredits,
      balance: account.balance,
    };
  });
  
  const totals = trialBalance.reduce(
    (acc, item) => ({
      totalDebits: acc.totalDebits + item.debit,
      totalCredits: acc.totalCredits + item.credit,
    }),
    { totalDebits: 0, totalCredits: 0 }
  );
  
  return {
    asOfDate,
    accounts: trialBalance,
    totals,
  };
}

// ─── Period Close and Lock ───────────────────────────────────

export function getFiscalPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function closeFiscalPeriod(period: string, userId: string) {
  // Check if period exists
  let fiscalPeriod = await prisma.fiscalPeriod.findUnique({
    where: { period },
  });
  
  if (!fiscalPeriod) {
    // Create period if it doesn't exist
    const [year, month] = period.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    fiscalPeriod = await prisma.fiscalPeriod.create({
      data: {
        period,
        startDate,
        endDate,
        fiscalYear: year,
        isLocked: false,
      },
    });
  }
  
  if (fiscalPeriod.isLocked) {
    throw new Error(`Period ${period} is already locked`);
  }
  
  // Lock the period
  return await prisma.fiscalPeriod.update({
    where: { period },
    data: {
      isLocked: true,
      lockedBy: userId,
      lockedAt: new Date(),
    },
  });
}

export async function unlockFiscalPeriod(period: string) {
  return await prisma.fiscalPeriod.update({
    where: { period },
    data: {
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
    },
  });
}

// ─── Helper Functions ────────────────────────────────────────

export async function getAccountByCode(accountCode: string) {
  return await prisma.account.findUnique({
    where: { accountCode },
  });
}

export async function getJournalEntry(entryId: string) {
  return await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getJournalEntries(filters: {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  sourceModule?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  
  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }
  
  if (filters.status) where.status = filters.status;
  if (filters.sourceModule) where.sourceModule = filters.sourceModule;
  
  return await prisma.journalEntry.findMany({
    where,
    include: {
      lines: {
        include: {
          account: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { date: 'desc' },
    take: filters.limit || 50,
    skip: filters.offset || 0,
  });
}


// ─── Accounts Payable (AP) & Accounts Receivable (AR) ───────

export interface InvoiceInput {
  invoiceNo?: string;
  type: 'AR' | 'AP';
  customerId?: string;
  supplierId?: string;
  vendorName?: string;
  vendorAddress?: string;
  issueDate: Date;
  dueDate: Date;
  description?: string;
  notes?: string;
  lineItems: InvoiceLineItemInput[];
}

export interface InvoiceLineItemInput {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  productId?: string;
  accountId?: string;
}

export async function createInvoice(data: InvoiceInput) {
  // Generate invoice number if not provided
  const invoiceNo = data.invoiceNo || await generateInvoiceNumber(data.type);
  
  // Calculate totals from line items
  const subtotal = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = data.lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const total = subtotal + taxAmount;
  
  return await prisma.invoice.create({
    data: {
      invoiceNo,
      type: data.type,
      customerId: data.customerId,
      supplierId: data.supplierId,
      vendorName: data.vendorName,
      vendorAddress: data.vendorAddress,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      description: data.description,
      notes: data.notes,
      subtotal,
      taxAmount,
      total,
      amountPaid: 0,
      status: 'unpaid',
      approvalStatus: 'pending',
      lineItems: {
        create: data.lineItems.map(item => ({
          lineNumber: item.lineNumber,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          taxAmount: item.taxAmount || 0,
          productId: item.productId,
          accountId: item.accountId,
        })),
      },
    },
    include: {
      lineItems: true,
    },
  });
}

async function generateInvoiceNumber(type: 'AR' | 'AP'): Promise<string> {
  const prefix = type === 'AR' ? 'INV' : 'BILL';
  const count = await prisma.invoice.count({ where: { type } });
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

export async function approveInvoice(invoiceId: string, approvedBy: string) {
  return await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: 'approved',
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

/**
 * Submit invoice for approval workflow based on amount thresholds
 * Thresholds:
 * - < $1,000: Auto-approve
 * - $1,000 - $10,000: Manager approval
 * - $10,000 - $50,000: Director approval
 * - > $50,000: CFO approval
 */
export async function submitInvoiceForApproval(invoiceId: string, requesterId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true },
  });
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  if (invoice.approvalStatus !== 'pending') {
    throw new Error('Invoice is not in pending status');
  }
  
  // Auto-approve small invoices
  if (invoice.total < 1000) {
    return await approveInvoice(invoiceId, 'system');
  }
  
  // Determine approval workflow based on amount
  let workflowType = 'invoice_approval_manager';
  if (invoice.total > 50000) {
    workflowType = 'invoice_approval_cfo';
  } else if (invoice.total > 10000) {
    workflowType = 'invoice_approval_director';
  }
  
  // Find or create workflow template
  let workflow = await prisma.workflowTemplate.findFirst({
    where: { name: workflowType },
  });
  
  if (!workflow) {
    // Create default workflow template if it doesn't exist
    workflow = await createDefaultApprovalWorkflow(workflowType);
  }
  
  // Create approval request
  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      entityType: 'invoice',
      entityId: invoiceId,
      requesterId,
      workflowId: workflow.id,
      status: 'pending',
      currentStep: 1,
    },
  });
  
  return approvalRequest;
}

/**
 * Process approval decision for an invoice
 */
export async function processInvoiceApproval(
  approvalRequestId: string,
  approverId: string,
  action: 'approved' | 'rejected',
  comments?: string
) {
  const approvalRequest = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: { workflow: true },
  });
  
  if (!approvalRequest) {
    throw new Error('Approval request not found');
  }
  
  if (approvalRequest.status !== 'pending') {
    throw new Error('Approval request is not pending');
  }
  
  // Record approval history
  await prisma.approvalHistory.create({
    data: {
      requestId: approvalRequestId,
      approverId,
      action,
      comments,
      step: approvalRequest.currentStep,
    },
  });
  
  if (action === 'rejected') {
    // Reject the invoice
    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: 'rejected' },
    });
    
    await prisma.invoice.update({
      where: { id: approvalRequest.entityId },
      data: { approvalStatus: 'rejected' },
    });
    
    return { status: 'rejected' };
  }
  
  // Check if there are more approval steps
  const steps = approvalRequest.workflow.steps as any[];
  const totalSteps = Array.isArray(steps) ? steps.length : 1;
  const nextStep = approvalRequest.currentStep + 1;
  
  if (nextStep > totalSteps) {
    // Final approval - approve the invoice
    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: 'approved' },
    });
    
    await approveInvoice(approvalRequest.entityId, approverId);
    
    return { status: 'approved' };
  } else {
    // Move to next approval step
    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { currentStep: nextStep },
    });
    
    return { status: 'pending', currentStep: nextStep };
  }
}

/**
 * Create default approval workflow templates
 */
async function createDefaultApprovalWorkflow(workflowType: string) {
  const workflows: Record<string, { name: string; description: string; module: string; steps: any[] }> = {
    invoice_approval_manager: {
      name: 'invoice_approval_manager',
      description: 'Manager approval for invoices $1,000 - $10,000',
      module: 'invoice',
      steps: [{ step: 1, role: 'manager', action: 'approve' }],
    },
    invoice_approval_director: {
      name: 'invoice_approval_director',
      description: 'Director approval for invoices $10,000 - $50,000',
      module: 'invoice',
      steps: [
        { step: 1, role: 'manager', action: 'approve' },
        { step: 2, role: 'director', action: 'approve' },
      ],
    },
    invoice_approval_cfo: {
      name: 'invoice_approval_cfo',
      description: 'CFO approval for invoices > $50,000',
      module: 'invoice',
      steps: [
        { step: 1, role: 'manager', action: 'approve' },
        { step: 2, role: 'director', action: 'approve' },
        { step: 3, role: 'cfo', action: 'approve' },
      ],
    },
  };
  
  const config = workflows[workflowType];
  if (!config) {
    throw new Error(`Unknown workflow type: ${workflowType}`);
  }
  
  return await prisma.workflowTemplate.create({
    data: {
      name: config.name,
      description: config.description,
      module: config.module,
      steps: config.steps,
      isActive: true,
    },
  });
}

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNo?: string;
  bankAccountId?: string;
  notes?: string;
  userId: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: data.invoiceId },
  });
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  if (invoice.approvalStatus !== 'approved') {
    throw new Error('Invoice must be approved before payment can be recorded');
  }
  
  const remainingAmount = invoice.total - invoice.amountPaid;
  if (data.amount > remainingAmount) {
    throw new Error(`Payment amount ${data.amount} exceeds remaining balance ${remainingAmount}`);
  }
  
  // Generate payment number and transaction code
  const count = await prisma.payment.count();
  const paymentNo = `PAY-${String(count + 1).padStart(6, '0')}`;
  const transactionCode = await generateTransactionCode();
  
  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      paymentNo,
      transactionCode,
      invoiceId: data.invoiceId,
      amount: data.amount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      referenceNo: data.referenceNo,
      bankAccountId: data.bankAccountId,
      notes: data.notes,
    },
  });
  
  // Update invoice
  const newAmountPaid = invoice.amountPaid + data.amount;
  const newStatus = newAmountPaid >= invoice.total ? 'paid' : 'partial';
  
  await prisma.invoice.update({
    where: { id: data.invoiceId },
    data: {
      amountPaid: newAmountPaid,
      status: newStatus,
    },
  });
  
  // Create journal entry for payment
  if (invoice.type === 'AP') {
    // AP Payment: Debit Accounts Payable, Credit Cash/Bank
    const apAccount = await getAccountByCode('2110'); // Accounts Payable
    const cashAccount = await getAccountByCode('1110'); // Cash
    
    if (apAccount && cashAccount) {
      await createJournalEntry({
        date: data.paymentDate,
        description: `Payment for ${invoice.invoiceNo} - ${invoice.vendorName || 'Vendor'}`,
        referenceId: payment.id,
        sourceModule: 'accounts_payable',
        lines: [
          {
            accountId: apAccount.id,
            debit: data.amount,
            credit: 0,
            description: `Payment to vendor`,
          },
          {
            accountId: cashAccount.id,
            debit: 0,
            credit: data.amount,
            description: `Cash payment`,
          },
        ],
        createdBy: data.userId,
      });
    }
  }
  
  return payment;
}

export async function getAPAgingReport(asOfDate: Date) {
  const invoices = await prisma.invoice.findMany({
    where: {
      type: 'AP',
      status: { in: ['unpaid', 'partial'] },
      issueDate: { lte: asOfDate },
    },
    include: {
      lineItems: true,
    },
    orderBy: { dueDate: 'asc' },
  });
  
  const aging = categorizeByAging(invoices, asOfDate);
  
  // Calculate totals
  const totals: Record<string, number> = {
    current: aging.current.reduce((sum, inv) => sum + inv.outstanding, 0),
    days30: aging.days30.reduce((sum, inv) => sum + inv.outstanding, 0),
    days60: aging.days60.reduce((sum, inv) => sum + inv.outstanding, 0),
    days90: aging.days90.reduce((sum, inv) => sum + inv.outstanding, 0),
    over90: aging.over90.reduce((sum, inv) => sum + inv.outstanding, 0),
  };
  
  totals.total = totals.current + totals.days30 + totals.days60 + totals.days90 + totals.over90;
  
  return {
    asOfDate,
    aging,
    totals,
    summary: {
      totalInvoices: invoices.length,
      totalOutstanding: totals.total,
      averageDaysOverdue: invoices.reduce((sum, inv) => {
        const days = Math.floor((asOfDate.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, days);
      }, 0) / invoices.length || 0,
    },
  };
}

export async function getARAgingReport(asOfDate: Date) {
  const invoices = await prisma.invoice.findMany({
    where: {
      type: 'AR',
      status: { in: ['unpaid', 'partial'] },
      issueDate: { lte: asOfDate },
    },
    orderBy: { dueDate: 'asc' },
  });
  
  const aging = categorizeByAging(invoices, asOfDate);
  
  // Calculate totals
  const totals: Record<string, number> = {
    current: aging.current.reduce((sum, inv) => sum + inv.outstanding, 0),
    days30: aging.days30.reduce((sum, inv) => sum + inv.outstanding, 0),
    days60: aging.days60.reduce((sum, inv) => sum + inv.outstanding, 0),
    days90: aging.days90.reduce((sum, inv) => sum + inv.outstanding, 0),
    over90: aging.over90.reduce((sum, inv) => sum + inv.outstanding, 0),
  };
  
  totals.total = totals.current + totals.days30 + totals.days60 + totals.days90 + totals.over90;
  
  return {
    asOfDate,
    aging,
    totals,
    summary: {
      totalInvoices: invoices.length,
      totalOutstanding: totals.total,
      averageDaysOverdue: invoices.reduce((sum, inv) => {
        const days = Math.floor((asOfDate.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, days);
      }, 0) / invoices.length || 0,
    },
  };
}

/**
 * Get AP aging report by vendor
 */
export async function getAPAgingByVendor(asOfDate: Date, supplierId?: string) {
  const where: any = {
    type: 'AP',
    status: { in: ['unpaid', 'partial'] },
    issueDate: { lte: asOfDate },
  };
  
  if (supplierId) {
    where.supplierId = supplierId;
  }
  
  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      lineItems: true,
    },
    orderBy: { dueDate: 'asc' },
  });
  
  // Group by vendor
  const byVendor: Record<string, any> = {};
  
  invoices.forEach(invoice => {
    const vendorKey = invoice.supplierId || invoice.vendorName || 'Unknown';
    
    if (!byVendor[vendorKey]) {
      byVendor[vendorKey] = {
        vendorId: invoice.supplierId,
        vendorName: invoice.vendorName,
        invoices: [],
        totalOutstanding: 0,
      };
    }
    
    const outstanding = invoice.total - invoice.amountPaid;
    byVendor[vendorKey].invoices.push({
      ...invoice,
      outstanding,
    });
    byVendor[vendorKey].totalOutstanding += outstanding;
  });
  
  return {
    asOfDate,
    vendors: Object.values(byVendor),
  };
}

// ─── Accounts Receivable (AR) Functions ──────────────────────

/**
 * Generate customer invoice from sales order
 */
export async function generateInvoiceFromSalesOrder(orderId: string, userId: string) {
  // Fetch the sales order with items
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });
  
  if (!order) {
    throw new Error('Sales order not found');
  }
  
  if (order.type !== 'sale') {
    throw new Error('Only sales orders can be converted to customer invoices');
  }
  
  // Check if invoice already exists for this order
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      type: 'AR',
      description: { contains: order.orderNo },
    },
  });
  
  if (existingInvoice) {
    throw new Error(`Invoice ${existingInvoice.invoiceNo} already exists for order ${order.orderNo}`);
  }
  
  // Generate invoice number
  const invoiceNo = await generateInvoiceNumber('AR');
  
  // Calculate due date (default: 30 days from issue date)
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 30);
  
  // Create line items from order items
  const lineItems: InvoiceLineItemInput[] = order.items.map((item, index) => ({
    lineNumber: index + 1,
    description: item.productName,
    quantity: item.qty,
    unitPrice: item.price,
    taxAmount: item.gstAmount,
    productId: item.productId || undefined,
  }));
  
  // Create the customer invoice
  const invoice = await createInvoice({
    invoiceNo,
    type: 'AR',
    customerId: order.customerId || undefined,
    issueDate,
    dueDate,
    description: `Invoice for Sales Order ${order.orderNo}`,
    notes: order.notes || undefined,
    lineItems,
  });
  
  // Create journal entry for AR
  const arAccount = await getAccountByCode('1120'); // Accounts Receivable
  const revenueAccount = await getAccountByCode('4000'); // Sales Revenue
  const taxPayableAccount = await getAccountByCode('2120'); // Tax Payable
  
  if (arAccount && revenueAccount) {
    const journalLines = [
      {
        accountId: arAccount.id,
        debit: invoice.total,
        credit: 0,
        description: `AR for ${invoice.invoiceNo} - ${order.customerName}`,
      },
      {
        accountId: revenueAccount.id,
        debit: 0,
        credit: invoice.subtotal,
        description: `Sales revenue`,
      },
    ];
    
    // Add tax line if applicable
    if (invoice.taxAmount > 0 && taxPayableAccount) {
      journalLines.push({
        accountId: taxPayableAccount.id,
        debit: 0,
        credit: invoice.taxAmount,
        description: `Sales tax`,
      });
    }
    
    await createJournalEntry({
      date: issueDate,
      description: `Customer Invoice ${invoice.invoiceNo} for Order ${order.orderNo}`,
      referenceId: invoice.id,
      sourceModule: 'accounts_receivable',
      lines: journalLines,
      createdBy: userId,
    });
  }
  
  return invoice;
}

/**
 * Record customer payment receipt
 */
export async function recordCustomerPayment(data: {
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNo?: string;
  bankAccountId?: string;
  notes?: string;
  userId: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: data.invoiceId },
  });
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  if (invoice.type !== 'AR') {
    throw new Error('This function is for customer invoices (AR) only');
  }
  
  const remainingAmount = invoice.total - invoice.amountPaid;
  if (data.amount > remainingAmount) {
    throw new Error(`Payment amount ${data.amount} exceeds remaining balance ${remainingAmount}`);
  }
  
  // Generate payment number and transaction code
  const count = await prisma.payment.count();
  const paymentNo = `RCP-${String(count + 1).padStart(6, '0')}`;
  const transactionCode = await generateTransactionCode();
  
  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      paymentNo,
      transactionCode,
      invoiceId: data.invoiceId,
      amount: data.amount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      referenceNo: data.referenceNo,
      bankAccountId: data.bankAccountId,
      notes: data.notes,
    },
  });
  
  // Update invoice
  const newAmountPaid = invoice.amountPaid + data.amount;
  const newStatus = newAmountPaid >= invoice.total ? 'paid' : 'partial';
  
  await prisma.invoice.update({
    where: { id: data.invoiceId },
    data: {
      amountPaid: newAmountPaid,
      status: newStatus,
    },
  });
  
  // Create journal entry for customer payment
  const arAccount = await getAccountByCode('1120'); // Accounts Receivable
  const cashAccount = data.bankAccountId 
    ? await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId }, include: { glAccount: true } })
    : null;
  const defaultCashAccount = await getAccountByCode('1110'); // Cash
  
  const cashGLAccount = cashAccount?.glAccount || defaultCashAccount;
  
  if (arAccount && cashGLAccount) {
    await createJournalEntry({
      date: data.paymentDate,
      description: `Customer payment for ${invoice.invoiceNo}`,
      referenceId: payment.id,
      sourceModule: 'accounts_receivable',
      lines: [
        {
          accountId: cashGLAccount.id,
          debit: data.amount,
          credit: 0,
          description: `Cash received`,
        },
        {
          accountId: arAccount.id,
          debit: 0,
          credit: data.amount,
          description: `AR payment received`,
        },
      ],
      createdBy: data.userId,
    });
  }
  
  // Update bank account balance if specified
  if (data.bankAccountId) {
    await prisma.bankAccount.update({
      where: { id: data.bankAccountId },
      data: {
        balance: {
          increment: data.amount,
        },
      },
    });
  }
  
  return payment;
}

/**
 * Get AR aging report by customer
 */
export async function getARAgingByCustomer(asOfDate: Date, customerId?: string) {
  const where: any = {
    type: 'AR',
    status: { in: ['unpaid', 'partial'] },
    issueDate: { lte: asOfDate },
  };
  
  if (customerId) {
    where.customerId = customerId;
  }
  
  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      lineItems: true,
    },
    orderBy: { dueDate: 'asc' },
  });
  
  // Group by customer
  const byCustomer: Record<string, any> = {};
  
  invoices.forEach(invoice => {
    const customerKey = invoice.customerId || 'Walk-in';
    
    if (!byCustomer[customerKey]) {
      byCustomer[customerKey] = {
        customerId: invoice.customerId,
        invoices: [],
        totalOutstanding: 0,
      };
    }
    
    const outstanding = invoice.total - invoice.amountPaid;
    byCustomer[customerKey].invoices.push({
      ...invoice,
      outstanding,
    });
    byCustomer[customerKey].totalOutstanding += outstanding;
  });
  
  return {
    asOfDate,
    customers: Object.values(byCustomer),
  };
}

/**
 * Get invoice details with line items
 */
export async function getInvoiceDetails(invoiceId: string) {
  return await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: {
        orderBy: { lineNumber: 'asc' },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
  });
}

/**
 * Get pending AP invoices for approval
 */
export async function getPendingAPInvoices() {
  return await prisma.invoice.findMany({
    where: {
      type: 'AP',
      approvalStatus: 'pending',
    },
    include: {
      lineItems: true,
    },
    orderBy: { issueDate: 'desc' },
  });
}

function categorizeByAging(invoices: any[], asOfDate: Date) {
  const aging = {
    current: [] as any[],
    days30: [] as any[],
    days60: [] as any[],
    days90: [] as any[],
    over90: [] as any[],
  };
  
  invoices.forEach(invoice => {
    const daysOverdue = Math.floor(
      (asOfDate.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const outstanding = invoice.total - invoice.amountPaid;
    const item = { ...invoice, daysOverdue, outstanding };
    
    if (daysOverdue <= 0) {
      aging.current.push(item);
    } else if (daysOverdue <= 30) {
      aging.days30.push(item);
    } else if (daysOverdue <= 60) {
      aging.days60.push(item);
    } else if (daysOverdue <= 90) {
      aging.days90.push(item);
    } else {
      aging.over90.push(item);
    }
  });
  
  return aging;
}

// ─── Bank Reconciliation ─────────────────────────────────────

export async function getBankAccounts() {
  return await prisma.bankAccount.findMany({
    include: {
      glAccount: true,
    },
    orderBy: {
      accountName: 'asc',
    },
  });
}

export async function createBankAccount(data: {
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency?: string;
  glAccountId?: string;
}) {
  return await prisma.bankAccount.create({
    data: {
      ...data,
      balance: 0,
      isActive: true,
    },
  });
}

export async function importBankStatement(data: {
  bankAccountId: string;
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: Array<{
    transactionDate: Date;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    referenceNo?: string;
  }>;
}) {
  // Generate statement number
  const count = await prisma.bankStatement.count();
  const statementNo = `STMT-${String(count + 1).padStart(6, '0')}`;
  
  return await prisma.bankStatement.create({
    data: {
      statementNo,
      bankAccountId: data.bankAccountId,
      statementDate: data.statementDate,
      openingBalance: data.openingBalance,
      closingBalance: data.closingBalance,
      transactions: {
        create: data.transactions,
      },
    },
    include: {
      transactions: true,
    },
  });
}

/**
 * Import bank statement from file (CSV or OFX)
 */
export async function importBankStatementFromFile(
  bankAccountId: string,
  fileContent: string,
  fileType: 'csv' | 'ofx'
) {
  const { parseCSVStatement, parseOFXStatement } = await import('../utils/bankStatementParsers');
  
  let parsedData;
  
  if (fileType === 'csv') {
    parsedData = parseCSVStatement(fileContent);
  } else if (fileType === 'ofx') {
    parsedData = parseOFXStatement(fileContent);
  } else {
    throw new Error('Unsupported file type. Only CSV and OFX are supported.');
  }
  
  return await importBankStatement({
    bankAccountId,
    ...parsedData,
  });
}

export async function autoMatchBankTransactions(statementId: string) {
  const statement = await prisma.bankStatement.findUnique({
    where: { id: statementId },
    include: {
      transactions: {
        where: { isReconciled: false },
      },
    },
  });
  
  if (!statement) {
    throw new Error('Bank statement not found');
  }
  
  const matches: any[] = [];
  
  for (const transaction of statement.transactions) {
    // Try to match with payments
    if (transaction.debit > 0) {
      // Outgoing payment - match with AP payments
      const payment = await prisma.payment.findFirst({
        where: {
          amount: transaction.debit,
          paymentDate: {
            gte: new Date(transaction.transactionDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before
            lte: new Date(transaction.transactionDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days after
          },
          bankAccountId: statement.bankAccountId,
        },
      });
      
      if (payment) {
        await prisma.bankTransaction.update({
          where: { id: transaction.id },
          data: {
            isReconciled: true,
            reconciledWith: payment.id,
          },
        });
        
        matches.push({
          transactionId: transaction.id,
          matchedWith: payment.id,
          matchType: 'payment',
        });
      }
    } else if (transaction.credit > 0) {
      // Incoming payment - match with AR payments
      const payment = await prisma.payment.findFirst({
        where: {
          amount: transaction.credit,
          paymentDate: {
            gte: new Date(transaction.transactionDate.getTime() - 3 * 24 * 60 * 60 * 1000),
            lte: new Date(transaction.transactionDate.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
          bankAccountId: statement.bankAccountId,
        },
      });
      
      if (payment) {
        await prisma.bankTransaction.update({
          where: { id: transaction.id },
          data: {
            isReconciled: true,
            reconciledWith: payment.id,
          },
        });
        
        matches.push({
          transactionId: transaction.id,
          matchedWith: payment.id,
          matchType: 'payment',
        });
      }
    }
  }
  
  return matches;
}

/**
 * Enhanced matching algorithm with fuzzy matching and journal entry support
 */
export async function enhancedAutoMatch(statementId: string) {
  const statement = await prisma.bankStatement.findUnique({
    where: { id: statementId },
    include: {
      transactions: {
        where: { isReconciled: false },
      },
      bankAccount: {
        include: {
          glAccount: true,
        },
      },
    },
  });
  
  if (!statement) {
    throw new Error('Bank statement not found');
  }
  
  const matches: any[] = [];
  const suggestions: any[] = [];
  
  for (const transaction of statement.transactions) {
    let matched = false;
    
    // 1. Exact amount and date match with payments
    const exactPayment = await prisma.payment.findFirst({
      where: {
        amount: transaction.debit > 0 ? transaction.debit : transaction.credit,
        paymentDate: transaction.transactionDate,
        bankAccountId: statement.bankAccountId,
      },
      include: {
        invoice: true,
      },
    });
    
    if (exactPayment) {
      await prisma.bankTransaction.update({
        where: { id: transaction.id },
        data: {
          isReconciled: true,
          reconciledWith: exactPayment.id,
        },
      });
      
      matches.push({
        transactionId: transaction.id,
        matchedWith: exactPayment.id,
        matchType: 'payment',
        confidence: 'high',
      });
      matched = true;
      continue;
    }
    
    // 2. Fuzzy match with payments (±3 days, exact amount)
    if (!matched) {
      const fuzzyPayment = await prisma.payment.findFirst({
        where: {
          amount: transaction.debit > 0 ? transaction.debit : transaction.credit,
          paymentDate: {
            gte: new Date(transaction.transactionDate.getTime() - 3 * 24 * 60 * 60 * 1000),
            lte: new Date(transaction.transactionDate.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
          bankAccountId: statement.bankAccountId,
        },
        include: {
          invoice: true,
        },
      });
      
      if (fuzzyPayment) {
        suggestions.push({
          transactionId: transaction.id,
          suggestedMatch: fuzzyPayment.id,
          matchType: 'payment',
          confidence: 'medium',
          reason: 'Amount matches, date within 3 days',
        });
      }
    }
    
    // 3. Match with journal entries (bank account GL)
    if (!matched && statement.bankAccount.glAccountId) {
      const journalLine = await prisma.journalLine.findFirst({
        where: {
          accountId: statement.bankAccount.glAccountId,
          OR: [
            { debit: transaction.credit },
            { credit: transaction.debit },
          ],
          journalEntry: {
            date: {
              gte: new Date(transaction.transactionDate.getTime() - 3 * 24 * 60 * 60 * 1000),
              lte: new Date(transaction.transactionDate.getTime() + 3 * 24 * 60 * 60 * 1000),
            },
            status: 'posted',
          },
        },
        include: {
          journalEntry: true,
        },
      });
      
      if (journalLine) {
        suggestions.push({
          transactionId: transaction.id,
          suggestedMatch: journalLine.journalEntryId,
          matchType: 'journal_entry',
          confidence: 'medium',
          reason: 'Amount matches journal entry',
        });
      }
    }
  }
  
  return { matches, suggestions };
}

/**
 * Manual match - user manually matches a bank transaction with a payment or journal entry
 */
export async function manualMatchTransaction(
  transactionId: string,
  _matchType: 'payment' | 'journal_entry',
  matchId: string
) {
  await prisma.bankTransaction.update({
    where: { id: transactionId },
    data: {
      isReconciled: true,
      reconciledWith: matchId,
    },
  });
  
  return { success: true, message: 'Transaction matched successfully' };
}

/**
 * Unmatch a reconciled transaction
 */
export async function unmatchTransaction(transactionId: string) {
  await prisma.bankTransaction.update({
    where: { id: transactionId },
    data: {
      isReconciled: false,
      reconciledWith: null,
    },
  });
  
  return { success: true, message: 'Transaction unmatched successfully' };
}

/**
 * Get reconciliation details with matched and unmatched items
 */
export async function getReconciliationDetails(statementId: string) {
  const statement = await prisma.bankStatement.findUnique({
    where: { id: statementId },
    include: {
      transactions: {
        include: {
          statement: {
            include: {
              bankAccount: true,
            },
          },
        },
      },
      bankAccount: {
        include: {
          glAccount: true,
        },
      },
      reconciliation: true,
    },
  });
  
  if (!statement) {
    throw new Error('Bank statement not found');
  }
  
  const matchedTransactions = statement.transactions.filter(t => t.isReconciled);
  const unmatchedTransactions = statement.transactions.filter(t => !t.isReconciled);
  
  // Get unmatched book items (payments without bank transaction match)
  const unmatchedPayments = await prisma.payment.findMany({
    where: {
      bankAccountId: statement.bankAccountId,
      paymentDate: {
        gte: new Date(statement.statementDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        lte: statement.statementDate,
      },
      NOT: {
        id: {
          in: matchedTransactions.map(t => t.reconciledWith).filter(Boolean) as string[],
        },
      },
    },
    include: {
      invoice: true,
    },
  });
  
  return {
    statement,
    matchedTransactions,
    unmatchedBankItems: unmatchedTransactions,
    unmatchedBookItems: unmatchedPayments,
    reconciliation: statement.reconciliation,
  };
}

export async function createBankReconciliation(data: {
  bankAccountId: string;
  statementId: string;
  reconciliationDate: Date;
  reconciledBy: string;
}) {
  const statement = await prisma.bankStatement.findUnique({
    where: { id: data.statementId },
    include: {
      transactions: true,
    },
  });
  
  if (!statement) {
    throw new Error('Bank statement not found');
  }
  
  // Calculate book balance from GL
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: data.bankAccountId },
    include: {
      glAccount: true,
    },
  });
  
  const bookBalance = bankAccount?.glAccount?.balance || bankAccount?.balance || 0;
  const statementBalance = statement.closingBalance;
  const difference = statementBalance - bookBalance;
  
  // Generate reconciliation number
  const count = await prisma.bankReconciliation.count();
  const reconciliationNo = `RECON-${String(count + 1).padStart(6, '0')}`;
  
  return await prisma.bankReconciliation.create({
    data: {
      reconciliationNo,
      bankAccountId: data.bankAccountId,
      statementId: data.statementId,
      reconciliationDate: data.reconciliationDate,
      statementBalance,
      bookBalance,
      difference,
      status: Math.abs(difference) < 0.01 ? 'completed' : 'in_progress',
      reconciledBy: data.reconciledBy,
    },
  });
}

// ─── Budgeting ───────────────────────────────────────────────

export async function getBudgets(filters: {
  fiscalYear?: string;
  status?: string;
}) {
  const where: any = {};
  
  if (filters.fiscalYear) {
    where.fiscalYear = filters.fiscalYear;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  return await prisma.budget.findMany({
    where,
    include: {
      _count: {
        select: {
          lineItems: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function createBudget(data: {
  name: string;
  fiscalYear: string;
  startDate: Date;
  endDate: Date;
  lineItems: Array<{
    accountId: string;
    period: string;
    budgetedAmount: number;
    costCenter?: string;
    projectId?: string;
  }>;
}) {
  return await prisma.budget.create({
    data: {
      name: data.name,
      fiscalYear: data.fiscalYear,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'draft',
      lineItems: {
        create: data.lineItems.map(item => ({
          ...item,
          actualAmount: 0,
          variance: 0,
          variancePercent: 0,
        })),
      },
    },
    include: {
      lineItems: {
        include: {
          account: true,
        },
      },
    },
  });
}

export async function approveBudget(budgetId: string, approvedBy: string) {
  return await prisma.budget.update({
    where: { id: budgetId },
    data: {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    },
  });
}

export async function updateBudgetActuals(period: string) {
  // Get all budget line items for the period
  const lineItems = await prisma.budgetLineItem.findMany({
    where: { period },
    include: {
      account: true,
      budget: true,
    },
  });
  
  for (const lineItem of lineItems) {
    // Calculate actual amount from journal entries
    const [year, month] = period.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    const journalLines = await prisma.journalLine.findMany({
      where: {
        accountId: lineItem.accountId,
        journalEntry: {
          status: 'posted',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    });
    
    const actualAmount = journalLines.reduce((sum, line) => {
      // For expense accounts, debit increases the amount
      if (lineItem.account.type === 'Expense' || lineItem.account.type === 'COGS') {
        return sum + line.debit - line.credit;
      }
      // For revenue accounts, credit increases the amount
      return sum + line.credit - line.debit;
    }, 0);
    
    const variance = actualAmount - lineItem.budgetedAmount;
    const variancePercent = lineItem.budgetedAmount !== 0 
      ? (variance / lineItem.budgetedAmount) * 100 
      : 0;
    
    await prisma.budgetLineItem.update({
      where: { id: lineItem.id },
      data: {
        actualAmount,
        variance,
        variancePercent,
      },
    });
  }
}

export async function getBudgetVarianceReport(budgetId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      lineItems: {
        include: {
          account: true,
        },
        orderBy: {
          period: 'asc',
        },
      },
    },
  });
  
  if (!budget) {
    throw new Error('Budget not found');
  }
  
  return budget;
}

// ─── Fixed Asset Depreciation ────────────────────────────────

export async function createFixedAsset(data: {
  assetNumber?: string;
  name: string;
  description?: string;
  category: string;
  acquisitionDate: Date;
  acquisitionCost: number;
  salvageValue: number;
  usefulLife: number;
  depreciationMethod: 'straight_line' | 'declining_balance';
  assetAccountId?: string;
  depreciationAccountId?: string;
  accumulatedDepAccountId?: string;
}) {
  // Generate asset number if not provided
  const assetNumber = data.assetNumber || await generateAssetNumber();
  
  return await prisma.fixedAsset.create({
    data: {
      ...data,
      assetNumber,
      accumulatedDepreciation: 0,
      netBookValue: data.acquisitionCost,
      status: 'active',
    },
  });
}

async function generateAssetNumber(): Promise<string> {
  const count = await prisma.fixedAsset.count();
  return `FA-${String(count + 1).padStart(6, '0')}`;
}

export async function calculateDepreciation(assetId: string, period: string) {
  const asset = await prisma.fixedAsset.findUnique({
    where: { id: assetId },
  });
  
  if (!asset) {
    throw new Error('Fixed asset not found');
  }
  
  if (asset.status !== 'active') {
    throw new Error('Asset is not active');
  }
  
  let depreciationAmount = 0;
  const depreciableAmount = asset.acquisitionCost - asset.salvageValue;
  
  if (asset.depreciationMethod === 'straight_line') {
    // Straight-line: (Cost - Salvage) / Useful Life
    depreciationAmount = depreciableAmount / asset.usefulLife;
  } else if (asset.depreciationMethod === 'declining_balance') {
    // Declining balance: Net Book Value * (2 / Useful Life)
    const rate = 2 / asset.usefulLife;
    depreciationAmount = asset.netBookValue * rate;
    
    // Don't depreciate below salvage value
    if (asset.netBookValue - depreciationAmount < asset.salvageValue) {
      depreciationAmount = asset.netBookValue - asset.salvageValue;
    }
  }
  
  // Check if already depreciated for this period
  const existing = await prisma.depreciationEntry.findUnique({
    where: {
      assetId_period: {
        assetId,
        period,
      },
    },
  });
  
  if (existing) {
    return existing;
  }
  
  const newAccumulatedDepreciation = asset.accumulatedDepreciation + depreciationAmount;
  const newNetBookValue = asset.acquisitionCost - newAccumulatedDepreciation;
  
  // Create depreciation entry
  const entry = await prisma.depreciationEntry.create({
    data: {
      assetId,
      period,
      depreciationAmount,
      accumulatedDepreciation: newAccumulatedDepreciation,
      netBookValue: newNetBookValue,
    },
  });
  
  // Update asset
  await prisma.fixedAsset.update({
    where: { id: assetId },
    data: {
      accumulatedDepreciation: newAccumulatedDepreciation,
      netBookValue: newNetBookValue,
      status: newNetBookValue <= asset.salvageValue ? 'fully_depreciated' : 'active',
    },
  });
  
  return entry;
}

export async function generateDepreciationJournalEntries(period: string, userId: string) {
  // Get all active fixed assets
  const assets = await prisma.fixedAsset.findMany({
    where: {
      status: 'active',
    },
  });
  
  const entries = [];
  
  for (const asset of assets) {
    const depEntry = await calculateDepreciation(asset.id, period);
    
    if (depEntry.depreciationAmount > 0 && asset.depreciationAccountId && asset.accumulatedDepAccountId) {
      // Create journal entry for depreciation
      const journalEntry = await createJournalEntry({
        date: new Date(),
        description: `Depreciation for ${asset.name} - ${period}`,
        referenceId: asset.id,
        sourceModule: 'fixed_assets',
        lines: [
          {
            accountId: asset.depreciationAccountId,
            debit: depEntry.depreciationAmount,
            credit: 0,
            description: `Depreciation expense - ${asset.name}`,
          },
          {
            accountId: asset.accumulatedDepAccountId,
            debit: 0,
            credit: depEntry.depreciationAmount,
            description: `Accumulated depreciation - ${asset.name}`,
          },
        ],
        createdBy: userId,
      });
      
      // Link journal entry to depreciation entry
      await prisma.depreciationEntry.update({
        where: { id: depEntry.id },
        data: {
          journalEntryId: journalEntry.id,
        },
      });
      
      entries.push(journalEntry);
    }
  }
  
  return entries;
}

export async function getFixedAssetRegister() {
  return await prisma.fixedAsset.findMany({
    where: {
      status: { in: ['active', 'fully_depreciated'] },
    },
    include: {
      depreciationEntries: {
        orderBy: {
          period: 'desc',
        },
        take: 12, // Last 12 months
      },
    },
    orderBy: {
      assetNumber: 'asc',
    },
  });
}


// ─── Financial Statements ────────────────────────────────────

export async function generateProfitAndLoss(startDate: Date, endDate: Date) {
  // Get all revenue, expense, and COGS accounts
  const accounts = await prisma.account.findMany({
    where: {
      type: { in: ['Revenue', 'Expense', 'COGS'] },
      isActive: true,
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            status: 'posted',
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    },
    orderBy: { accountCode: 'asc' },
  });
  
  const revenue: any[] = [];
  const cogs: any[] = [];
  const expenses: any[] = [];
  
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalExpenses = 0;
  
  accounts.forEach(account => {
    const amount = account.journalLines.reduce((sum, line) => {
      // Revenue increases with credits
      if (account.type === 'Revenue') {
        return sum + line.credit - line.debit;
      }
      // Expenses and COGS increase with debits
      return sum + line.debit - line.credit;
    }, 0);
    
    const item = {
      accountCode: account.accountCode,
      accountName: account.name,
      amount,
    };
    
    if (account.type === 'Revenue') {
      revenue.push(item);
      totalRevenue += amount;
    } else if (account.type === 'COGS') {
      cogs.push(item);
      totalCOGS += amount;
    } else if (account.type === 'Expense') {
      expenses.push(item);
      totalExpenses += amount;
    }
  });
  
  const grossProfit = totalRevenue - totalCOGS;
  const netIncome = grossProfit - totalExpenses;
  
  return {
    period: { startDate, endDate },
    revenue,
    totalRevenue,
    cogs,
    totalCOGS,
    grossProfit,
    expenses,
    totalExpenses,
    netIncome,
  };
}

export async function generateBalanceSheet(asOfDate: Date) {
  // Get all asset, liability, and equity accounts
  const accounts = await prisma.account.findMany({
    where: {
      type: { in: ['Asset', 'Liability', 'Equity'] },
      isActive: true,
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            status: 'posted',
            date: {
              lte: asOfDate,
            },
          },
        },
      },
    },
    orderBy: { accountCode: 'asc' },
  });
  
  const assets: any[] = [];
  const liabilities: any[] = [];
  const equity: any[] = [];
  
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  
  accounts.forEach(account => {
    const amount = account.journalLines.reduce((sum, line) => {
      // Assets increase with debits
      if (account.type === 'Asset') {
        return sum + line.debit - line.credit;
      }
      // Liabilities and Equity increase with credits
      return sum + line.credit - line.debit;
    }, 0);
    
    const item = {
      accountCode: account.accountCode,
      accountName: account.name,
      amount,
    };
    
    if (account.type === 'Asset') {
      assets.push(item);
      totalAssets += amount;
    } else if (account.type === 'Liability') {
      liabilities.push(item);
      totalLiabilities += amount;
    } else if (account.type === 'Equity') {
      equity.push(item);
      totalEquity += amount;
    }
  });
  
  return {
    asOfDate,
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
  };
}

export async function generateCashFlowStatement(startDate: Date, endDate: Date) {
  // Get cash account
  const cashAccounts = await prisma.account.findMany({
    where: {
      name: { contains: 'Cash', mode: 'insensitive' },
      isActive: true,
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            status: 'posted',
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        include: {
          journalEntry: true,
        },
      },
    },
  });
  
  const operating: any[] = [];
  const investing: any[] = [];
  const financing: any[] = [];
  
  let operatingCashFlow = 0;
  let investingCashFlow = 0;
  let financingCashFlow = 0;
  
  cashAccounts.forEach(account => {
    account.journalLines.forEach(line => {
      const amount = line.debit - line.credit;
      const entry = line.journalEntry;
      
      const item = {
        date: entry.date,
        description: entry.description,
        amount,
      };
      
      // Categorize based on source module or description
      if (entry.sourceModule === 'sales' || entry.sourceModule === 'purchasing' || 
          entry.description.toLowerCase().includes('revenue') || 
          entry.description.toLowerCase().includes('expense')) {
        operating.push(item);
        operatingCashFlow += amount;
      } else if (entry.description.toLowerCase().includes('asset') || 
                 entry.description.toLowerCase().includes('investment')) {
        investing.push(item);
        investingCashFlow += amount;
      } else if (entry.description.toLowerCase().includes('loan') || 
                 entry.description.toLowerCase().includes('equity')) {
        financing.push(item);
        financingCashFlow += amount;
      } else {
        // Default to operating
        operating.push(item);
        operatingCashFlow += amount;
      }
    });
  });
  
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
  
  return {
    period: { startDate, endDate },
    operating,
    operatingCashFlow,
    investing,
    investingCashFlow,
    financing,
    financingCashFlow,
    netCashFlow,
  };
}

export async function generateFinancialStatements(startDate: Date, endDate: Date) {
  const [profitAndLoss, balanceSheet, cashFlow] = await Promise.all([
    generateProfitAndLoss(startDate, endDate),
    generateBalanceSheet(endDate),
    generateCashFlowStatement(startDate, endDate),
  ]);
  
  return {
    profitAndLoss,
    balanceSheet,
    cashFlow,
  };
}
