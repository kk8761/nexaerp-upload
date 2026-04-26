-- Migration: Add Quality Management System tables
-- Task 21: Implement Quality Management System

-- InspectionPlan table
CREATE TABLE "InspectionPlan" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "planNumber" VARCHAR(100) UNIQUE NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "productId" TEXT,
  "inspectionType" VARCHAR(50) NOT NULL DEFAULT 'receiving', -- receiving, in_process, final, periodic
  "samplingType" VARCHAR(50) NOT NULL DEFAULT 'none', -- none, random, systematic, stratified
  "sampleSize" INTEGER,
  "samplePercentage" DECIMAL(5,2),
  "acceptanceLevel" DECIMAL(5,2), -- AQL (Acceptable Quality Level)
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_inspection_plan_product" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL
);

-- InspectionCheckpoint table (inspection criteria/checkpoints)
CREATE TABLE "InspectionCheckpoint" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "inspectionPlanId" TEXT NOT NULL,
  "checkpointNumber" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "checkType" VARCHAR(50) NOT NULL DEFAULT 'visual', -- visual, measurement, functional, destructive
  "measurementUnit" VARCHAR(50),
  "targetValue" DECIMAL(15,4),
  "minValue" DECIMAL(15,4),
  "maxValue" DECIMAL(15,4),
  "isMandatory" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_checkpoint_plan" FOREIGN KEY ("inspectionPlanId") REFERENCES "InspectionPlan"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_checkpoint_number" UNIQUE ("inspectionPlanId", "checkpointNumber")
);

-- InspectionResult table
CREATE TABLE "InspectionResult" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "resultNumber" VARCHAR(100) UNIQUE NOT NULL,
  "inspectionPlanId" TEXT NOT NULL,
  "productId" TEXT,
  "batchNumber" VARCHAR(100),
  "lotNumber" VARCHAR(100),
  "inspectionDate" TIMESTAMP NOT NULL,
  "inspectedBy" TEXT NOT NULL,
  "quantityInspected" DECIMAL(15,4) NOT NULL,
  "quantityAccepted" DECIMAL(15,4) DEFAULT 0,
  "quantityRejected" DECIMAL(15,4) DEFAULT 0,
  "status" VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, passed, failed, conditional
  "overallResult" VARCHAR(50), -- pass, fail, conditional
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_result_plan" FOREIGN KEY ("inspectionPlanId") REFERENCES "InspectionPlan"("id") ON DELETE RESTRICT,
  CONSTRAINT "fk_result_product" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL
);

-- InspectionCheckpointResult table (individual checkpoint results)
CREATE TABLE "InspectionCheckpointResult" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "inspectionResultId" TEXT NOT NULL,
  "checkpointId" TEXT NOT NULL,
  "result" VARCHAR(50) NOT NULL DEFAULT 'pending', -- pass, fail, na
  "measuredValue" DECIMAL(15,4),
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_checkpoint_result_inspection" FOREIGN KEY ("inspectionResultId") REFERENCES "InspectionResult"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_checkpoint_result_checkpoint" FOREIGN KEY ("checkpointId") REFERENCES "InspectionCheckpoint"("id") ON DELETE RESTRICT
);

-- NonConformance table
CREATE TABLE "NonConformance" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ncNumber" VARCHAR(100) UNIQUE NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "productId" TEXT,
  "batchNumber" VARCHAR(100),
  "inspectionResultId" TEXT,
  "severity" VARCHAR(50) NOT NULL DEFAULT 'minor', -- critical, major, minor
  "status" VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, closed
  "detectedDate" TIMESTAMP NOT NULL,
  "detectedBy" TEXT NOT NULL,
  "quantityAffected" DECIMAL(15,4),
  "disposition" VARCHAR(50), -- rework, scrap, use_as_is, return_to_supplier
  "rootCause" TEXT,
  "rootCauseCategory" VARCHAR(100), -- material, process, equipment, human, environment, method
  "assignedTo" TEXT,
  "targetCloseDate" TIMESTAMP,
  "actualCloseDate" TIMESTAMP,
  "closedBy" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_nc_product" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_nc_inspection" FOREIGN KEY ("inspectionResultId") REFERENCES "InspectionResult"("id") ON DELETE SET NULL
);

-- CorrectiveAction table (CAPA - Corrective and Preventive Actions)
CREATE TABLE "CorrectiveAction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "caNumber" VARCHAR(100) UNIQUE NOT NULL,
  "nonConformanceId" TEXT NOT NULL,
  "actionType" VARCHAR(50) NOT NULL DEFAULT 'corrective', -- corrective, preventive
  "description" TEXT NOT NULL,
  "assignedTo" TEXT NOT NULL,
  "dueDate" TIMESTAMP NOT NULL,
  "completedDate" TIMESTAMP,
  "status" VARCHAR(50) DEFAULT 'open', -- open, in_progress, completed, verified, closed
  "effectiveness" VARCHAR(50), -- effective, ineffective, pending_verification
  "verifiedBy" TEXT,
  "verifiedDate" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_ca_nonconformance" FOREIGN KEY ("nonConformanceId") REFERENCES "NonConformance"("id") ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX "idx_inspection_plan_product" ON "InspectionPlan"("productId");
CREATE INDEX "idx_inspection_plan_active" ON "InspectionPlan"("isActive");
CREATE INDEX "idx_inspection_checkpoint_plan" ON "InspectionCheckpoint"("inspectionPlanId");
CREATE INDEX "idx_inspection_result_plan" ON "InspectionResult"("inspectionPlanId");
CREATE INDEX "idx_inspection_result_product" ON "InspectionResult"("productId");
CREATE INDEX "idx_inspection_result_status" ON "InspectionResult"("status");
CREATE INDEX "idx_inspection_result_date" ON "InspectionResult"("inspectionDate");
CREATE INDEX "idx_checkpoint_result_inspection" ON "InspectionCheckpointResult"("inspectionResultId");
CREATE INDEX "idx_checkpoint_result_checkpoint" ON "InspectionCheckpointResult"("checkpointId");
CREATE INDEX "idx_nc_product" ON "NonConformance"("productId");
CREATE INDEX "idx_nc_status" ON "NonConformance"("status");
CREATE INDEX "idx_nc_severity" ON "NonConformance"("severity");
CREATE INDEX "idx_nc_inspection" ON "NonConformance"("inspectionResultId");
CREATE INDEX "idx_ca_nonconformance" ON "CorrectiveAction"("nonConformanceId");
CREATE INDEX "idx_ca_status" ON "CorrectiveAction"("status");
CREATE INDEX "idx_ca_assigned" ON "CorrectiveAction"("assignedTo");
