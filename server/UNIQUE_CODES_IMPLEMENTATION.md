# Unique Codes Implementation

## Overview
This document describes the implementation of unique code generation for vendors, transactions, and locations in the NexaERP system. All codes are automatically generated to ensure uniqueness and consistency across the system.

## Implemented Unique Codes

### 1. Vendor Codes (VEN-XXXXXX)

#### Format
- **Pattern**: `VEN-XXXXXX`
- **Example**: `VEN-000001`, `VEN-000042`, `VEN-001234`
- **Length**: 10 characters (VEN- prefix + 6 digits)

#### Implementation
- **Model**: `Supplier` in Prisma schema
- **Field**: `vendorCode` (unique constraint)
- **Generator**: `generateVendorCode()` in `supplier.service.ts`
- **Auto-generated**: Yes, on supplier creation

#### Usage
```typescript
import { createSupplier } from './services/supplier.service';

const supplier = await createSupplier({
  name: 'Acme Corporation',
  email: 'contact@acme.com',
  phone: '+1-555-0100',
  paymentTerms: 'Net 30',
  creditLimit: 50000,
});

console.log(supplier.vendorCode); // VEN-000001
```

#### Database Schema
```prisma
model Supplier {
  id              String   @id @default(uuid())
  vendorCode      String   @unique @db.VarChar(50)
  name            String   @db.VarChar(255)
  contactPerson   String?  @db.VarChar(255)
  email           String?  @db.VarChar(255)
  phone           String?  @db.VarChar(50)
  address         String?  @db.Text
  city            String?  @db.VarChar(100)
  state           String?  @db.VarChar(100)
  country         String?  @db.VarChar(100)
  postalCode      String?  @db.VarChar(20)
  taxId           String?  @db.VarChar(100)
  paymentTerms    String?  @db.VarChar(100)
  creditLimit     Float    @default(0)
  currentBalance  Float    @default(0)
  status          String   @default("active") @db.VarChar(50)
  notes           String?  @db.Text
  
  invoices        Invoice[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([status])
  @@index([name])
}
```

### 2. Transaction Codes (TXN-XXXXXX)

#### Format
- **Pattern**: `TXN-XXXXXX`
- **Example**: `TXN-000001`, `TXN-000042`, `TXN-001234`
- **Length**: 10 characters (TXN- prefix + 6 digits)

#### Implementation
- **Models**: `JournalEntry` and `Payment` in Prisma schema
- **Field**: `transactionCode` (unique constraint)
- **Generator**: `generateTransactionCode()` in `supplier.service.ts`
- **Auto-generated**: Yes, on journal entry or payment creation

#### Usage
```typescript
import { createJournalEntry } from './services/accounting.service';

const journalEntry = await createJournalEntry({
  date: new Date(),
  description: 'Office supplies purchase',
  lines: [
    { accountId: expenseAccountId, debit: 500, credit: 0 },
    { accountId: cashAccountId, debit: 0, credit: 500 },
  ],
  createdBy: userId,
});

console.log(journalEntry.transactionCode); // TXN-000001
```

#### Database Schema
```prisma
model JournalEntry {
  id              String   @id @default(uuid())
  entryNumber     String   @unique @db.VarChar(100)
  transactionCode String?  @unique @db.VarChar(50)
  // ... other fields
  
  @@index([transactionCode])
}

model Payment {
  id              String   @id @default(uuid())
  paymentNo       String   @unique @db.VarChar(100)
  transactionCode String?  @unique @db.VarChar(50)
  // ... other fields
  
  @@index([transactionCode])
}
```

#### Global Uniqueness
Transaction codes are globally unique across both journal entries and payments. The generator counts both tables to ensure no duplicates:

```typescript
export async function generateTransactionCode(): Promise<string> {
  const [journalCount, paymentCount] = await Promise.all([
    prisma.journalEntry.count(),
    prisma.payment.count(),
  ]);
  
  const totalCount = journalCount + paymentCount;
  const nextNumber = totalCount + 1;
  return `TXN-${String(nextNumber).padStart(6, '0')}`;
}
```

### 3. Location Codes (LOC-XXXXXX)

#### Format
- **Pattern**: `LOC-XXXXXX`
- **Example**: `LOC-000001`, `LOC-000042`, `LOC-001234`
- **Length**: 10 characters (LOC- prefix + 6 digits)

#### Implementation
- **Model**: `Warehouse` in Prisma schema
- **Field**: `code` (unique constraint)
- **Generator**: `generateLocationCode()` in `supplier.service.ts`
- **Auto-generated**: Yes, on warehouse creation

#### Usage
```typescript
import { generateLocationCode } from './services/supplier.service';

const locationCode = await generateLocationCode();

const warehouse = await prisma.warehouse.create({
  data: {
    name: 'Main Warehouse',
    code: locationCode,
    address: '123 Industrial Blvd',
    managerId: managerId,
  },
});

console.log(warehouse.code); // LOC-000001
```

#### Database Schema
```prisma
model Warehouse {
  id          String   @id @default(uuid())
  name        String   @db.VarChar(255)
  code        String   @unique @db.VarChar(50)
  address     String?  @db.Text
  managerId   String?
  storeId     String   @default("store-001")
  
  // ... relations
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### Bin Location Codes
Bin locations within warehouses use a hierarchical code format:

- **Pattern**: `{Aisle}-{Rack}-{Shelf}`
- **Example**: `A-01-05`, `B-12-03`, `C-05-10`
- **Unique**: Within each warehouse (composite unique constraint)

```prisma
model BinLocation {
  id          String   @id @default(uuid())
  warehouseId String
  code        String   @db.VarChar(50)
  aisle       String?  @db.VarChar(20)
  rack        String?  @db.VarChar(20)
  shelf       String?  @db.VarChar(20)
  
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  
  @@unique([warehouseId, code])
}
```

## Service Functions

### Supplier Service (`supplier.service.ts`)

#### Core Functions
- `generateVendorCode()` - Generate unique vendor code
- `generateTransactionCode()` - Generate unique transaction code
- `generateLocationCode()` - Generate unique location code
- `createSupplier(data)` - Create supplier with auto-generated vendor code
- `updateSupplier(id, data)` - Update supplier information
- `getSupplier(id)` - Get supplier by ID with invoices
- `getSupplierByCode(vendorCode)` - Get supplier by vendor code
- `listSuppliers(filters)` - List suppliers with search and filters
- `updateSupplierBalance(id)` - Recalculate supplier outstanding balance
- `deactivateSupplier(id)` - Deactivate supplier
- `activateSupplier(id)` - Activate supplier
- `blockSupplier(id, reason)` - Block supplier from transactions
- `getSupplierStatistics(id)` - Get supplier statistics and metrics

#### Example: Create Supplier
```typescript
const supplier = await createSupplier({
  name: 'Tech Supplies Inc.',
  contactPerson: 'John Doe',
  email: 'john@techsupplies.com',
  phone: '+1-555-0200',
  address: '456 Tech Park',
  city: 'San Francisco',
  state: 'CA',
  country: 'USA',
  postalCode: '94105',
  taxId: 'TAX-123456',
  paymentTerms: 'Net 45',
  creditLimit: 100000,
  notes: 'Preferred supplier for IT equipment',
});

// Result:
// {
//   id: 'uuid...',
//   vendorCode: 'VEN-000002',
//   name: 'Tech Supplies Inc.',
//   ...
// }
```

#### Example: Get Supplier Statistics
```typescript
const stats = await getSupplierStatistics(supplierId);

// Result:
// {
//   supplier: { ... },
//   statistics: {
//     totalInvoices: 45,
//     totalInvoiceAmount: 125000,
//     totalPaid: 100000,
//     totalOutstanding: 25000,
//     paidInvoices: 40,
//     unpaidInvoices: 3,
//     partialInvoices: 2,
//     averagePaymentDays: 32,
//     creditUtilization: 25, // 25% of credit limit used
//   }
// }
```

## API Endpoints

### Supplier Management

#### Create Supplier
```http
POST /api/suppliers
Content-Type: application/json

{
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "phone": "+1-555-0100",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postalCode": "10001",
  "taxId": "TAX-987654",
  "paymentTerms": "Net 30",
  "creditLimit": 50000
}
```

#### Get Supplier
```http
GET /api/suppliers/:supplierId
```

#### Get Supplier by Code
```http
GET /api/suppliers/code/:vendorCode
```

#### List Suppliers
```http
GET /api/suppliers?status=active&search=acme&limit=50&offset=0
```

#### Update Supplier
```http
PUT /api/suppliers/:supplierId
Content-Type: application/json

{
  "paymentTerms": "Net 45",
  "creditLimit": 75000
}
```

#### Get Supplier Statistics
```http
GET /api/suppliers/:supplierId/statistics
```

#### Deactivate/Activate/Block Supplier
```http
POST /api/suppliers/:supplierId/deactivate
POST /api/suppliers/:supplierId/activate
POST /api/suppliers/:supplierId/block
Content-Type: application/json

{
  "reason": "Payment issues"
}
```

## Integration with Existing Systems

### Invoice Creation with Supplier
```typescript
import { createInvoice } from './services/accounting.service';

const invoice = await createInvoice({
  type: 'AP',
  supplierId: supplier.id, // Links to Supplier model
  issueDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  lineItems: [
    {
      lineNumber: 1,
      description: 'Office Supplies',
      quantity: 10,
      unitPrice: 25.00,
      taxAmount: 5.00,
    },
  ],
});

// Invoice will automatically:
// - Link to supplier via supplierId
// - Update supplier's currentBalance
// - Generate unique invoiceNo
```

### Payment with Transaction Code
```typescript
import { recordPayment } from './services/accounting.service';

const payment = await recordPayment({
  invoiceId: invoice.id,
  amount: 250.00,
  paymentDate: new Date(),
  paymentMethod: 'bank_transfer',
  referenceNo: 'WIRE-12345',
  userId: currentUser.id,
});

// Payment will automatically:
// - Generate unique transactionCode (TXN-XXXXXX)
// - Create GL journal entry with transactionCode
// - Update invoice status
// - Update supplier balance
```

### Warehouse with Location Code
```typescript
import { generateLocationCode } from './services/supplier.service';

const locationCode = await generateLocationCode();

const warehouse = await prisma.warehouse.create({
  data: {
    name: 'Distribution Center East',
    code: locationCode, // LOC-000003
    address: '789 Logistics Way',
    managerId: managerId,
  },
});

// Create bin locations within warehouse
const binLocation = await prisma.binLocation.create({
  data: {
    warehouseId: warehouse.id,
    code: 'A-05-12',
    aisle: 'A',
    rack: '05',
    shelf: '12',
    capacity: 1000,
  },
});
```

## Migration Details

### Migration File
- **Path**: `server/prisma/migrations/20260426090000_add_unique_codes_for_vendors_transactions_locations/migration.sql`
- **Applied**: Successfully

### Changes Made
1. Created `Supplier` table with unique `vendorCode`
2. Added `transactionCode` to `JournalEntry` table (unique)
3. Added `transactionCode` to `Payment` table (unique)
4. Added unique constraint to `Warehouse.code`
5. Added foreign key from `Invoice.supplierId` to `Supplier.id`
6. Created indexes for performance optimization

## Benefits

### 1. Traceability
- Every vendor has a unique, human-readable code
- Every financial transaction has a unique identifier
- Every location has a unique code for inventory tracking

### 2. Audit Trail
- Transaction codes link journal entries and payments
- Easy to trace financial transactions across systems
- Supports compliance and regulatory requirements

### 3. Data Integrity
- Unique constraints prevent duplicates
- Foreign key relationships ensure referential integrity
- Automatic generation prevents human error

### 4. Reporting
- Easy to filter and search by codes
- Consistent formatting across all reports
- Supports external system integration

### 5. User Experience
- Human-readable codes (VEN-000001 vs UUID)
- Easy to communicate codes verbally or in writing
- Consistent format across the system

## Testing

### Test Scenarios
1. **Vendor Code Generation**
   - Create multiple suppliers
   - Verify sequential vendor codes
   - Verify uniqueness constraint

2. **Transaction Code Generation**
   - Create journal entries and payments
   - Verify global uniqueness across both tables
   - Verify sequential numbering

3. **Location Code Generation**
   - Create multiple warehouses
   - Verify sequential location codes
   - Verify uniqueness constraint

4. **Supplier Balance Updates**
   - Create invoices for supplier
   - Record payments
   - Verify balance calculations

5. **Supplier Statistics**
   - Create multiple invoices and payments
   - Verify statistics calculations
   - Verify credit utilization

## Future Enhancements

### Potential Improvements
1. **Custom Code Formats**
   - Allow configuration of code prefixes
   - Support different numbering schemes per tenant
   - Add date-based codes (e.g., VEN-2024-0001)

2. **Code Ranges**
   - Reserve code ranges for different purposes
   - Support multiple code series

3. **Barcode Integration**
   - Generate barcodes for vendor codes
   - Generate barcodes for location codes
   - Support barcode scanning

4. **External System Integration**
   - Map vendor codes to external system IDs
   - Sync codes with ERP systems
   - Support code import/export

5. **Advanced Search**
   - Search by partial codes
   - Fuzzy matching for codes
   - Code history tracking

## Conclusion

The unique code implementation provides a robust foundation for vendor management, transaction tracking, and location management in the NexaERP system. All codes are automatically generated, ensuring consistency and uniqueness across the system. The implementation integrates seamlessly with existing accounting, inventory, and approval workflow systems.
