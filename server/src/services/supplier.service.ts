import prisma from '../config/prisma';

/**
 * Supplier/Vendor Management Service
 * Handles vendor creation, updates, and unique vendor code generation
 */

export interface SupplierInput {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  notes?: string;
}

/**
 * Generate unique vendor code
 * Format: VEN-XXXXXX (e.g., VEN-000001)
 */
export async function generateVendorCode(): Promise<string> {
  const count = await prisma.supplier.count();
  const nextNumber = count + 1;
  return `VEN-${String(nextNumber).padStart(6, '0')}`;
}

/**
 * Generate unique transaction code for journal entries and payments
 * Format: TXN-XXXXXX (e.g., TXN-000001)
 */
export async function generateTransactionCode(): Promise<string> {
  // Count both journal entries and payments to ensure global uniqueness
  const [journalCount, paymentCount] = await Promise.all([
    prisma.journalEntry.count(),
    prisma.payment.count(),
  ]);
  
  const totalCount = journalCount + paymentCount;
  const nextNumber = totalCount + 1;
  return `TXN-${String(nextNumber).padStart(6, '0')}`;
}

/**
 * Generate unique location code for warehouses
 * Format: LOC-XXXXXX (e.g., LOC-000001)
 */
export async function generateLocationCode(): Promise<string> {
  const count = await prisma.warehouse.count();
  const nextNumber = count + 1;
  return `LOC-${String(nextNumber).padStart(6, '0')}`;
}

/**
 * Create a new supplier/vendor
 */
export async function createSupplier(data: SupplierInput) {
  const vendorCode = await generateVendorCode();
  
  return await prisma.supplier.create({
    data: {
      vendorCode,
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
      taxId: data.taxId,
      paymentTerms: data.paymentTerms || 'Net 30',
      creditLimit: data.creditLimit || 0,
      currentBalance: 0,
      status: 'active',
      notes: data.notes,
    },
  });
}

/**
 * Update supplier information
 */
export async function updateSupplier(supplierId: string, data: Partial<SupplierInput>) {
  return await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      postalCode: data.postalCode,
      taxId: data.taxId,
      paymentTerms: data.paymentTerms,
      creditLimit: data.creditLimit,
      notes: data.notes,
    },
  });
}

/**
 * Get supplier by ID
 */
export async function getSupplier(supplierId: string) {
  return await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      invoices: {
        where: {
          type: 'AP',
        },
        orderBy: {
          issueDate: 'desc',
        },
        take: 10,
      },
    },
  });
}

/**
 * Get supplier by vendor code
 */
export async function getSupplierByCode(vendorCode: string) {
  return await prisma.supplier.findUnique({
    where: { vendorCode },
    include: {
      invoices: {
        where: {
          type: 'AP',
        },
        orderBy: {
          issueDate: 'desc',
        },
        take: 10,
      },
    },
  });
}

/**
 * List all suppliers with filters
 */
export async function listSuppliers(filters?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  
  if (filters?.status) {
    where.status = filters.status;
  }
  
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { vendorCode: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.supplier.count({ where }),
  ]);
  
  return { suppliers, total };
}

/**
 * Update supplier balance (called when invoices are created or payments are made)
 */
export async function updateSupplierBalance(supplierId: string) {
  // Calculate total outstanding from unpaid and partial invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      supplierId,
      type: 'AP',
      status: { in: ['unpaid', 'partial'] },
    },
    select: {
      total: true,
      amountPaid: true,
    },
  });
  
  const currentBalance = invoices.reduce(
    (sum, inv) => sum + (inv.total - inv.amountPaid),
    0
  );
  
  return await prisma.supplier.update({
    where: { id: supplierId },
    data: { currentBalance },
  });
}

/**
 * Deactivate supplier
 */
export async function deactivateSupplier(supplierId: string) {
  return await prisma.supplier.update({
    where: { id: supplierId },
    data: { status: 'inactive' },
  });
}

/**
 * Activate supplier
 */
export async function activateSupplier(supplierId: string) {
  return await prisma.supplier.update({
    where: { id: supplierId },
    data: { status: 'active' },
  });
}

/**
 * Block supplier (prevents new transactions)
 */
export async function blockSupplier(supplierId: string, reason?: string) {
  return await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      status: 'blocked',
      notes: reason ? `BLOCKED: ${reason}` : undefined,
    },
  });
}

/**
 * Get supplier statistics
 */
export async function getSupplierStatistics(supplierId: string) {
  const [supplier, invoices] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id: supplierId },
    }),
    prisma.invoice.findMany({
      where: {
        supplierId,
        type: 'AP',
      },
      include: {
        payments: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        invoice: {
          supplierId,
          type: 'AP',
        },
      },
    }),
  ]);
  
  if (!supplier) {
    throw new Error('Supplier not found');
  }
  
  const totalInvoices = invoices.length;
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalOutstanding = totalInvoiceAmount - totalPaid;
  
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid').length;
  const partialInvoices = invoices.filter(inv => inv.status === 'partial').length;
  
  // Calculate average payment time
  const paidInvoicesWithPayments = invoices.filter(
    inv => inv.status === 'paid' && inv.payments.length > 0
  );
  
  const avgPaymentDays = paidInvoicesWithPayments.length > 0
    ? paidInvoicesWithPayments.reduce((sum, inv) => {
        const lastPayment = inv.payments[inv.payments.length - 1];
        const days = Math.floor(
          (new Date(lastPayment.paymentDate).getTime() - new Date(inv.issueDate).getTime()) /
          (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / paidInvoicesWithPayments.length
    : 0;
  
  return {
    supplier,
    statistics: {
      totalInvoices,
      totalInvoiceAmount,
      totalPaid,
      totalOutstanding,
      paidInvoices,
      unpaidInvoices,
      partialInvoices,
      averagePaymentDays: Math.round(avgPaymentDays),
      creditUtilization: supplier.creditLimit > 0
        ? (totalOutstanding / supplier.creditLimit) * 100
        : 0,
    },
  };
}
