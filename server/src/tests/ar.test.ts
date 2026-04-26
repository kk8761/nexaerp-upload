import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as accountingService from '../services/accounting.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Accounts Receivable (AR) Module', () => {
  let testOrderId: string;
  let testInvoiceId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-ar-${Date.now()}@example.com`,
        password: 'hashedpassword',
        role: 'admin',
      },
    });
    testUserId = user.id;

    // Create a test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        sku: `TEST-SKU-${Date.now()}`,
        price: 100,
        cost: 50,
        stock: 100,
      },
    });

    // Create a test sales order
    const order = await prisma.order.create({
      data: {
        orderNo: `ORD-TEST-${Date.now()}`,
        type: 'sale',
        customerName: 'Test Customer',
        subtotal: 100,
        taxAmount: 10,
        total: 110,
        paymentStatus: 'paid',
        status: 'completed',
        items: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              qty: 1,
              price: 100,
              subtotal: 100,
              gstAmount: 10,
            },
          ],
        },
      },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testInvoiceId) {
      await prisma.payment.deleteMany({ where: { invoiceId: testInvoiceId } });
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: testInvoiceId } });
      await prisma.invoice.deleteMany({ where: { id: testInvoiceId } });
    }
    await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
    await prisma.order.deleteMany({ where: { id: testOrderId } });
    await prisma.product.deleteMany({ where: { name: 'Test Product' } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('generateInvoiceFromSalesOrder', () => {
    it('should generate a customer invoice from a sales order', async () => {
      const invoice = await accountingService.generateInvoiceFromSalesOrder(testOrderId, testUserId);
      
      expect(invoice).toBeDefined();
      expect(invoice.type).toBe('AR');
      expect(invoice.invoiceNo).toMatch(/^INV-/);
      expect(invoice.total).toBe(110);
      expect(invoice.subtotal).toBe(100);
      expect(invoice.taxAmount).toBe(10);
      expect(invoice.status).toBe('unpaid');
      expect(invoice.lineItems).toHaveLength(1);
      
      testInvoiceId = invoice.id;
    });

    it('should not allow duplicate invoice generation for the same order', async () => {
      await expect(
        accountingService.generateInvoiceFromSalesOrder(testOrderId, testUserId)
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('recordCustomerPayment', () => {
    it('should record a customer payment and update invoice status', async () => {
      const payment = await accountingService.recordCustomerPayment({
        invoiceId: testInvoiceId,
        amount: 110,
        paymentDate: new Date(),
        paymentMethod: 'cash',
        userId: testUserId,
      });
      
      expect(payment).toBeDefined();
      expect(payment.paymentNo).toMatch(/^RCP-/);
      expect(payment.amount).toBe(110);
      
      // Check invoice status updated
      const invoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
      });
      expect(invoice?.status).toBe('paid');
      expect(invoice?.amountPaid).toBe(110);
    });

    it('should not allow payment exceeding remaining balance', async () => {
      await expect(
        accountingService.recordCustomerPayment({
          invoiceId: testInvoiceId,
          amount: 1,
          paymentDate: new Date(),
          paymentMethod: 'cash',
          userId: testUserId,
        })
      ).rejects.toThrow(/exceeds remaining balance/);
    });
  });

  describe('getARAgingReport', () => {
    it('should generate AR aging report', async () => {
      const asOfDate = new Date();
      const report = await accountingService.getARAgingReport(asOfDate);
      
      expect(report).toBeDefined();
      expect(report.asOfDate).toBeDefined();
      expect(report.aging).toBeDefined();
      expect(report.totals).toBeDefined();
      expect(report.summary).toBeDefined();
    });
  });

  describe('getARAgingByCustomer', () => {
    it('should generate AR aging report by customer', async () => {
      const asOfDate = new Date();
      const report = await accountingService.getARAgingByCustomer(asOfDate);
      
      expect(report).toBeDefined();
      expect(report.asOfDate).toBeDefined();
      expect(report.customers).toBeDefined();
      expect(Array.isArray(report.customers)).toBe(true);
    });
  });
});
