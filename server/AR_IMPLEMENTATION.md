# Accounts Receivable (AR) Implementation

## Overview

The Accounts Receivable (AR) module provides complete customer invoice management, payment receipt processing, and aging reports. This implementation integrates with the existing accounting system and automatically creates journal entries for proper double-entry bookkeeping.

## Features Implemented

### 1. Customer Invoice Generation from Sales Orders

**Function**: `generateInvoiceFromSalesOrder(orderId, userId)`

Automatically converts a sales order into a customer invoice (AR type).

**Features**:
- Generates unique invoice numbers (INV-XXXXXX format)
- Converts order line items to invoice line items
- Calculates subtotal, tax, and total amounts
- Sets default payment terms (30 days)
- Creates GL journal entries:
  - Debit: Accounts Receivable (1120)
  - Credit: Sales Revenue (4000)
  - Credit: Tax Payable (2120) if applicable
- Prevents duplicate invoice generation for the same order

**API Endpoint**:
```
POST /api/accounting/ar/generate-invoice-from-order/:orderId
```

**Request**: No body required (orderId in URL)

**Response**:
```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoiceNo": "INV-000001",
    "type": "AR",
    "customerId": "uuid",
    "issueDate": "2024-01-15T00:00:00.000Z",
    "dueDate": "2024-02-14T00:00:00.000Z",
    "subtotal": 1000.00,
    "taxAmount": 100.00,
    "total": 1100.00,
    "status": "unpaid",
    "lineItems": [...]
  },
  "message": "Customer invoice generated successfully"
}
```

### 2. Customer Payment Receipt Processing

**Function**: `recordCustomerPayment(data)`

Records customer payments against invoices and updates invoice status.

**Features**:
- Generates unique payment receipt numbers (RCP-XXXXXX format)
- Validates payment amount against remaining balance
- Updates invoice status (unpaid → partial → paid)
- Creates GL journal entries:
  - Debit: Cash/Bank Account (1110 or linked GL account)
  - Credit: Accounts Receivable (1120)
- Updates bank account balance if bank account specified
- Supports multiple payment methods (cash, check, bank_transfer, credit_card)

**API Endpoint**:
```
POST /api/accounting/ar/payments
```

**Request Body**:
```json
{
  "invoiceId": "uuid",
  "amount": 1100.00,
  "paymentDate": "2024-01-20T00:00:00.000Z",
  "paymentMethod": "bank_transfer",
  "referenceNo": "TXN123456",
  "bankAccountId": "uuid",
  "notes": "Payment received via wire transfer"
}
```

**Response**:
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "paymentNo": "RCP-000001",
    "transactionCode": "TXN-000001",
    "invoiceId": "uuid",
    "amount": 1100.00,
    "paymentDate": "2024-01-20T00:00:00.000Z",
    "paymentMethod": "bank_transfer",
    "referenceNo": "TXN123456"
  },
  "message": "Customer payment recorded successfully"
}
```

### 3. AR Aging Report

**Function**: `getARAgingReport(asOfDate)`

Generates accounts receivable aging report categorizing outstanding invoices by age.

**Features**:
- Categories: Current, 30 days, 60 days, 90 days, 90+ days
- Calculates total outstanding per category
- Provides summary statistics:
  - Total invoices
  - Total outstanding amount
  - Average days overdue
- Filters by unpaid and partially paid invoices only

**API Endpoint**:
```
GET /api/accounting/reports/ar-aging?asOfDate=2024-01-31
```

**Response**:
```json
{
  "success": true,
  "report": {
    "asOfDate": "2024-01-31T00:00:00.000Z",
    "aging": {
      "current": [...],
      "days30": [...],
      "days60": [...],
      "days90": [...],
      "over90": [...]
    },
    "totals": {
      "current": 5000.00,
      "days30": 3000.00,
      "days60": 2000.00,
      "days90": 1000.00,
      "over90": 500.00,
      "total": 11500.00
    },
    "summary": {
      "totalInvoices": 15,
      "totalOutstanding": 11500.00,
      "averageDaysOverdue": 25.5
    }
  }
}
```

### 4. AR Aging Report by Customer

**Function**: `getARAgingByCustomer(asOfDate, customerId?)`

Generates AR aging report grouped by customer.

**Features**:
- Groups outstanding invoices by customer
- Calculates total outstanding per customer
- Optional filtering by specific customer
- Includes invoice line items for detailed analysis

**API Endpoint**:
```
GET /api/accounting/reports/ar-aging-by-customer?asOfDate=2024-01-31&customerId=uuid
```

**Response**:
```json
{
  "success": true,
  "report": {
    "asOfDate": "2024-01-31T00:00:00.000Z",
    "customers": [
      {
        "customerId": "uuid",
        "invoices": [...],
        "totalOutstanding": 5000.00
      },
      ...
    ]
  }
}
```

## Database Schema

The AR module uses the existing `Invoice` model with `type='AR'`:

```prisma
model Invoice {
  id              String   @id @default(uuid())
  invoiceNo       String   @unique
  type            String   // 'AR' for customer invoices
  customerId      String?
  issueDate       DateTime
  dueDate         DateTime
  subtotal        Float
  taxAmount       Float
  total           Float
  amountPaid      Float    @default(0)
  status          String   @default("unpaid") // unpaid, partial, paid, voided
  description     String?
  notes           String?
  
  lineItems       InvoiceLineItem[]
  payments        Payment[]
}

model Payment {
  id              String   @id @default(uuid())
  paymentNo       String   @unique
  transactionCode String?  @unique
  invoiceId       String
  amount          Float
  paymentDate     DateTime
  paymentMethod   String
  referenceNo     String?
  bankAccountId   String?
  notes           String?
}
```

## Integration with General Ledger

All AR transactions automatically create journal entries:

### Invoice Generation
```
DR  Accounts Receivable (1120)    $1,100
    CR  Sales Revenue (4000)                $1,000
    CR  Tax Payable (2120)                  $  100
```

### Payment Receipt
```
DR  Cash/Bank (1110)              $1,100
    CR  Accounts Receivable (1120)         $1,100
```

## Security & Permissions

All AR endpoints are protected with RBAC:
- `create:invoice` - Generate invoices
- `create:payment` - Record payments
- `read:invoice` - View invoices and reports

Audit logging is enabled for all AR transactions.

## Testing

Unit tests are provided in `server/src/tests/ar.test.ts`:
- Invoice generation from sales orders
- Payment receipt processing
- Invoice status updates
- AR aging reports
- Duplicate prevention

Run tests:
```bash
npm test -- ar.test.ts
```

## Usage Examples

### 1. Generate Invoice from Sales Order

```typescript
// After a sales order is completed
const invoice = await accountingService.generateInvoiceFromSalesOrder(
  orderId,
  userId
);
```

### 2. Record Customer Payment

```typescript
const payment = await accountingService.recordCustomerPayment({
  invoiceId: 'invoice-uuid',
  amount: 1100.00,
  paymentDate: new Date(),
  paymentMethod: 'bank_transfer',
  referenceNo: 'TXN123456',
  bankAccountId: 'bank-uuid',
  userId: 'user-uuid',
});
```

### 3. Generate AR Aging Report

```typescript
const report = await accountingService.getARAgingReport(new Date());
console.log(`Total Outstanding: $${report.totals.total}`);
```

## API Routes Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounting/ar/generate-invoice-from-order/:orderId` | Generate invoice from sales order |
| POST | `/api/accounting/ar/payments` | Record customer payment |
| GET | `/api/accounting/reports/ar-aging` | Get AR aging report |
| GET | `/api/accounting/reports/ar-aging-by-customer` | Get AR aging by customer |

## Requirements Satisfied

This implementation satisfies **Requirement 4.4** from the spec:

> The System SHALL support accounts payable and accounts receivable management. This includes managing customer invoices, tracking payments, and generating aging reports to monitor outstanding receivables.

**Acceptance Criteria Met**:
- ✅ Customer invoice management
- ✅ Invoice generation from sales orders
- ✅ Payment receipt processing
- ✅ AR aging reports with categorization (current, 30, 60, 90, 90+ days)
- ✅ Integration with General Ledger for automatic journal entries
- ✅ Invoice status tracking (unpaid, partial, paid)

## Future Enhancements

Potential improvements for future iterations:
1. Automated payment reminders for overdue invoices
2. Credit memo support for returns/adjustments
3. Recurring invoice generation
4. Customer credit limit management
5. Payment plan support for installment payments
6. Integration with payment gateways (Stripe, PayPal)
7. Automated dunning process for collections
8. Customer statement generation
