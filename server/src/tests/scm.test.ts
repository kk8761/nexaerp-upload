/**
 * Supply Chain Management Service Tests
 */

import scmService from '../services/scm.service';
import prisma from '../config/prisma';

describe('SCM Service', () => {
  let testProductId: string;
  let testSupplierId: string;
  
  beforeAll(async () => {
    // Create test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product for SCM',
        sku: 'TEST-SCM-001',
        price: 100,
        cost: 50,
        stock: 100,
        minStock: 20,
        reorderPoint: 30,
        reorderQty: 50
      }
    });
    testProductId = product.id;
    
    // Create test supplier
    const supplier = await prisma.supplier.create({
      data: {
        vendorCode: 'VEN-TEST-001',
        name: 'Test Supplier',
        email: 'test@supplier.com',
        phone: '1234567890'
      }
    });
    testSupplierId = supplier.id;
  });
  
  afterAll(async () => {
    // Cleanup
    await prisma.demandForecast.deleteMany({ where: { productId: testProductId } });
    await prisma.product.delete({ where: { id: testProductId } });
    await prisma.supplier.delete({ where: { id: testSupplierId } });
    await prisma.$disconnect();
  });
  
  describe('Demand Forecasting', () => {
    it('should create demand forecast with moving average', async () => {
      // Create some historical orders first
      const order = await prisma.order.create({
        data: {
          orderNo: `ORD-TEST-${Date.now()}`,
          type: 'sale',
          subtotal: 100,
          total: 100,
          status: 'completed',
          items: {
            create: {
              productId: testProductId,
              productName: 'Test Product',
              qty: 10,
              price: 10,
              subtotal: 100
            }
          }
        }
      });
      
      const forecast = await scmService.forecastDemand({
        productId: testProductId,
        method: 'moving_average',
        periods: 3,
        historicalPeriods: 6,
        movingAveragePeriods: 3
      });
      
      expect(forecast).toBeDefined();
      expect(forecast.productId).toBe(testProductId);
      expect(forecast.method).toBe('moving_average');
      expect(forecast.forecast).toHaveLength(3);
      expect(forecast.accuracy).toBeDefined();
      
      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });
    
    it('should create demand forecast with exponential smoothing', async () => {
      const forecast = await scmService.forecastDemand({
        productId: testProductId,
        method: 'exponential_smoothing',
        periods: 3,
        historicalPeriods: 6,
        alpha: 0.3
      });
      
      expect(forecast).toBeDefined();
      expect(forecast.method).toBe('exponential_smoothing');
      expect(forecast.forecast).toHaveLength(3);
    });
    
    it('should create demand forecast with linear regression', async () => {
      const forecast = await scmService.forecastDemand({
        productId: testProductId,
        method: 'linear_regression',
        periods: 3,
        historicalPeriods: 6
      });
      
      expect(forecast).toBeDefined();
      expect(forecast.method).toBe('linear_regression');
      expect(forecast.forecast).toHaveLength(3);
    });
  });
  
  describe('Supply Planning', () => {
    it('should create supply plan', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      
      const plan = await scmService.createSupplyPlan({
        planningHorizonStart: startDate,
        planningHorizonEnd: endDate,
        productIds: [testProductId],
        serviceLevelTarget: 95,
        notes: 'Test supply plan'
      });
      
      expect(plan).toBeDefined();
      expect(plan.planNumber).toMatch(/^SP-/);
      expect(plan.supplyActions).toBeDefined();
      expect(Array.isArray(plan.supplyActions)).toBe(true);
      
      // Cleanup
      await prisma.supplyPlan.delete({ where: { id: plan.planId } });
    });
  });
  
  describe('Shipment Tracking', () => {
    it('should create shipment', async () => {
      const shipment = await scmService.createShipment({
        carrier: 'FedEx',
        trackingNumber: 'TEST-TRACK-001',
        originAddress: '123 Origin St',
        originCountry: 'USA',
        destinationAddress: '456 Destination Ave',
        destinationCountry: 'USA',
        items: [
          {
            productId: testProductId,
            productName: 'Test Product',
            quantity: 10,
            unit: 'pcs'
          }
        ]
      });
      
      expect(shipment).toBeDefined();
      expect(shipment.shipmentNumber).toMatch(/^SH-/);
      expect(shipment.carrier).toBe('FedEx');
      expect(shipment.trackingNumber).toBe('TEST-TRACK-001');
      expect(shipment.items).toHaveLength(1);
      
      // Cleanup
      await prisma.shipment.delete({ where: { id: shipment.id } });
    });
    
    it('should update shipment status', async () => {
      const shipment = await scmService.createShipment({
        carrier: 'UPS',
        trackingNumber: 'TEST-TRACK-002',
        originAddress: '123 Origin St',
        originCountry: 'USA',
        destinationAddress: '456 Destination Ave',
        destinationCountry: 'USA',
        items: [
          {
            productId: testProductId,
            productName: 'Test Product',
            quantity: 5,
            unit: 'pcs'
          }
        ]
      });
      
      const updated = await scmService.updateShipmentStatus(shipment.id, {
        status: 'in_transit',
        location: 'Distribution Center',
        description: 'Package in transit'
      });
      
      expect(updated.status).toBe('in_transit');
      
      // Cleanup
      await prisma.shipment.delete({ where: { id: shipment.id } });
    });
  });
  
  describe('Supplier Performance', () => {
    it('should calculate supplier performance', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      const endDate = new Date();
      
      const performance = await scmService.calculateSupplierPerformance({
        supplierId: testSupplierId,
        evaluationPeriodStart: startDate,
        evaluationPeriodEnd: endDate
      });
      
      expect(performance).toBeDefined();
      expect(performance.supplierId).toBe(testSupplierId);
      expect(performance.overallRating).toBeGreaterThanOrEqual(0);
      expect(performance.overallRating).toBeLessThanOrEqual(100);
      
      // Cleanup
      await prisma.supplierPerformance.delete({ where: { id: performance.id } });
    });
  });
  
  describe('Global Inventory Visibility', () => {
    it('should get global inventory visibility', async () => {
      const inventory = await scmService.getGlobalInventoryVisibility(testProductId);
      
      expect(inventory).toBeDefined();
      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory[0].productId).toBe(testProductId);
    });
  });
  
  describe('Vendor Collaboration Portal', () => {
    it('should share purchase order with vendor', async () => {
      const vendorPO = await scmService.sharePurchaseOrderWithVendor({
        poNumber: `PO-TEST-${Date.now()}`,
        supplierId: testSupplierId,
        issueDate: new Date(),
        items: [
          {
            lineNumber: 1,
            productId: testProductId,
            productName: 'Test Product',
            quantity: 100,
            unit: 'pcs',
            unitPrice: 50,
            amount: 5000
          }
        ],
        subtotal: 5000,
        total: 5000
      });
      
      expect(vendorPO).toBeDefined();
      expect(vendorPO.supplierId).toBe(testSupplierId);
      expect(vendorPO.items).toHaveLength(1);
      
      // Cleanup
      await prisma.vendorPurchaseOrder.delete({ where: { id: vendorPO.id } });
    });
  });
});
