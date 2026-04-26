-- Add Supplier/Vendor model with unique vendor code
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "vendorCode" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contactPerson" VARCHAR(255),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "postalCode" VARCHAR(20),
    "taxId" VARCHAR(100),
    "paymentTerms" VARCHAR(100),
    "creditLimit" DOUBLE PRECISION DEFAULT 0,
    "currentBalance" DOUBLE PRECISION DEFAULT 0,
    "status" VARCHAR(50) DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on vendorCode
CREATE UNIQUE INDEX "Supplier_vendorCode_key" ON "Supplier"("vendorCode");

-- Add indexes for Supplier
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- Update Invoice table to add supplierId foreign key
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" 
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique transaction code to JournalEntry if not exists
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "transactionCode" VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS "JournalEntry_transactionCode_key" ON "JournalEntry"("transactionCode");

-- Add unique transaction code to Payment if not exists
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transactionCode" VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_transactionCode_key" ON "Payment"("transactionCode");

-- Add unique location code to Warehouse if not already unique
CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_code_key" ON "Warehouse"("code");

-- Add unique location code to BinLocation (already has unique constraint with warehouseId)
-- No change needed as BinLocation already has @@unique([warehouseId, code])

-- Add indexes for transaction codes
CREATE INDEX IF NOT EXISTS "JournalEntry_transactionCode_idx" ON "JournalEntry"("transactionCode");
CREATE INDEX IF NOT EXISTS "Payment_transactionCode_idx" ON "Payment"("transactionCode");
