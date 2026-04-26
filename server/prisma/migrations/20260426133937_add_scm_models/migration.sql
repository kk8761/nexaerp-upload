/*
  Warnings:

  - You are about to drop the column `completedQty` on the `ProductionOrder` table. All the data in the column will be lost.
  - You are about to drop the column `orderNo` on the `ProductionOrder` table. All the data in the column will be lost.
  - You are about to drop the column `targetQuantity` on the `ProductionOrder` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `ProductionOrder` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the `BOMItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[orderNumber]` on the table `ProductionOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderNumber` to the `ProductionOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `ProductionOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `ProductionOrder` table without a default value. This is not possible if the table is not empty.
  - Made the column `startDate` on table `ProductionOrder` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "BOMItem" DROP CONSTRAINT "BOMItem_bomId_fkey";

-- DropForeignKey
ALTER TABLE "BOMItem" DROP CONSTRAINT "BOMItem_rawMaterialId_fkey";

-- DropIndex
DROP INDEX "ProductionOrder_orderNo_key";

-- AlterTable
ALTER TABLE "BillOfMaterial" ADD COLUMN     "baseQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "baseUnit" VARCHAR(20) NOT NULL DEFAULT 'pcs',
ADD COLUMN     "bomType" VARCHAR(50) NOT NULL DEFAULT 'production',
ADD COLUMN     "totalLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalMaterialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validTo" TIMESTAMP(3),
ADD COLUMN     "version" VARCHAR(50) NOT NULL DEFAULT '1.0';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "accessLevel" VARCHAR(20) NOT NULL DEFAULT 'private',
ADD COLUMN     "allowedRoles" TEXT[],
ADD COLUMN     "allowedUsers" TEXT[],
ADD COLUMN     "category" VARCHAR(50) NOT NULL DEFAULT 'other',
ADD COLUMN     "extractedData" JSONB,
ADD COLUMN     "fileName" VARCHAR(255) NOT NULL,
ADD COLUMN     "linkedEntityId" VARCHAR(255),
ADD COLUMN     "linkedEntityType" VARCHAR(50),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "mimeType" VARCHAR(100) NOT NULL,
ADD COLUMN     "ocrProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocrProcessedAt" TIMESTAMP(3),
ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "ProductionOrder" DROP COLUMN "completedQty",
DROP COLUMN "orderNo",
DROP COLUMN "targetQuantity",
ADD COLUMN     "actualLaborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "actualMaterialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "actualOutput" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "orderNumber" VARCHAR(100) NOT NULL,
ADD COLUMN     "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
ADD COLUMN     "productId" TEXT NOT NULL,
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "scheduledEndDate" TIMESTAMP(3),
ADD COLUMN     "scrapQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "workCenterId" TEXT,
ALTER COLUMN "startDate" SET NOT NULL,
ALTER COLUMN "status" SET DATA TYPE VARCHAR(50);

-- DropTable
DROP TABLE "BOMItem";

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileUrl" VARCHAR(1024) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "changes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ESignatureRequest" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "message" TEXT,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ESignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ESignatureSigner" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "signingOrder" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signedAt" TIMESTAMP(3),
    "ipAddress" VARCHAR(45),
    "signatureData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ESignatureSigner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentArchivalPolicy" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50),
    "retentionDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentArchivalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseReport" (
    "id" TEXT NOT NULL,
    "reportNumber" VARCHAR(100) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL,
    "expenseReportId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOMComponent" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "componentProductId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "scrapFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "componentType" VARCHAR(50) NOT NULL DEFAULT 'raw_material',
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "BOMComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOMOperation" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "operationNumber" INTEGER NOT NULL,
    "operationName" VARCHAR(255) NOT NULL,
    "workCenterId" TEXT,
    "setupTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overheadCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "BOMOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkCenter" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "capacity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrderOperation" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "operationNumber" INTEGER NOT NULL,
    "operationName" VARCHAR(255) NOT NULL,
    "workCenterId" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "actualDuration" DOUBLE PRECISION,
    "operatorId" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProductionOrderOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialConsumption" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "batchNumber" VARCHAR(100),
    "serialNumbers" TEXT[],
    "consumptionType" VARCHAR(50) NOT NULL DEFAULT 'manual',
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "MaterialConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityInspection" (
    "id" TEXT NOT NULL,
    "inspectionNumber" VARCHAR(100) NOT NULL,
    "productionOrderId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "batchNumber" VARCHAR(100),
    "inspectionType" VARCHAR(50) NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectorId" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "result" VARCHAR(50),
    "checkpoints" JSONB,
    "defectsFound" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "quarantined" BOOLEAN NOT NULL DEFAULT false,
    "quarantineLocation" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MRPRun" (
    "id" TEXT NOT NULL,
    "runNumber" VARCHAR(100) NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planningHorizon" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "plannedOrders" JSONB,
    "purchaseRequisitions" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MRPRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'general',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" VARCHAR(50) NOT NULL,
    "triggerEntity" VARCHAR(100),
    "triggerFields" TEXT[],
    "cronExpression" VARCHAR(100),
    "webhookUrl" VARCHAR(1024),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "stepType" VARCHAR(50) NOT NULL,
    "conditionField" VARCHAR(100),
    "conditionOperator" VARCHAR(50),
    "conditionValue" TEXT,
    "logicalOperator" VARCHAR(10),
    "actionType" VARCHAR(50),
    "actionConfig" JSONB,
    "retryOnFailure" BOOLEAN NOT NULL DEFAULT false,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'running',
    "triggerData" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorStep" INTEGER,

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecutionStep" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "stepType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowExecutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTemplateLibrary" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "templateData" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTemplateLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "forecastMethod" VARCHAR(50) NOT NULL,
    "forecastPeriods" INTEGER NOT NULL,
    "historicalData" JSONB NOT NULL,
    "forecastedDemand" JSONB NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "mae" DOUBLE PRECISION,
    "rmse" DOUBLE PRECISION,
    "parameters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyPlan" (
    "id" TEXT NOT NULL,
    "planNumber" VARCHAR(100) NOT NULL,
    "planningHorizonStart" TIMESTAMP(3) NOT NULL,
    "planningHorizonEnd" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "supplyActions" JSONB NOT NULL,
    "constraints" JSONB,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceLevelTarget" DOUBLE PRECISION NOT NULL DEFAULT 95,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "shipmentNumber" VARCHAR(100) NOT NULL,
    "orderId" VARCHAR(100),
    "carrier" VARCHAR(100) NOT NULL,
    "trackingNumber" VARCHAR(255) NOT NULL,
    "originAddress" TEXT NOT NULL,
    "originCity" VARCHAR(100),
    "originState" VARCHAR(100),
    "originCountry" VARCHAR(100) NOT NULL,
    "originPostalCode" VARCHAR(20),
    "destinationAddress" TEXT NOT NULL,
    "destinationCity" VARCHAR(100),
    "destinationState" VARCHAR(100),
    "destinationCountry" VARCHAR(100) NOT NULL,
    "destinationPostalCode" VARCHAR(20),
    "status" VARCHAR(50) NOT NULL DEFAULT 'created',
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "weight" DOUBLE PRECISION,
    "dimensions" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" VARCHAR(255) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(20) NOT NULL,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentTrackingEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "location" VARCHAR(255),
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPerformance" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "evaluationPeriodStart" TIMESTAMP(3) NOT NULL,
    "evaluationPeriodEnd" TIMESTAMP(3) NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "onTimeDeliveries" INTEGER NOT NULL DEFAULT 0,
    "lateDeliveries" INTEGER NOT NULL DEFAULT 0,
    "onTimeDeliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defectRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageLeadTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceCompetitiveness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPortalAccess" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPortalAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" VARCHAR(100) NOT NULL,
    "supplierId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "confirmedBy" VARCHAR(255),
    "confirmedAt" TIMESTAMP(3),
    "vendorNotes" TEXT,
    "estimatedShipDate" TIMESTAMP(3),
    "actualShipDate" TIMESTAMP(3),
    "trackingNumber" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productId" TEXT,
    "productName" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),

    CONSTRAINT "VendorPurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierLeadTime" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT,
    "productCategory" VARCHAR(100),
    "route" VARCHAR(255),
    "averageLeadTime" DOUBLE PRECISION NOT NULL,
    "minLeadTime" DOUBLE PRECISION NOT NULL,
    "maxLeadTime" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierLeadTime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "DocumentVersion_uploadedById_idx" ON "DocumentVersion"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "ESignatureRequest_documentId_idx" ON "ESignatureRequest"("documentId");

-- CreateIndex
CREATE INDEX "ESignatureRequest_status_idx" ON "ESignatureRequest"("status");

-- CreateIndex
CREATE INDEX "ESignatureRequest_createdById_idx" ON "ESignatureRequest"("createdById");

-- CreateIndex
CREATE INDEX "ESignatureSigner_requestId_idx" ON "ESignatureSigner"("requestId");

-- CreateIndex
CREATE INDEX "ESignatureSigner_email_idx" ON "ESignatureSigner"("email");

-- CreateIndex
CREATE INDEX "ESignatureSigner_status_idx" ON "ESignatureSigner"("status");

-- CreateIndex
CREATE INDEX "DocumentArchivalPolicy_category_idx" ON "DocumentArchivalPolicy"("category");

-- CreateIndex
CREATE INDEX "DocumentArchivalPolicy_isActive_idx" ON "DocumentArchivalPolicy"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseReport_reportNumber_key" ON "ExpenseReport"("reportNumber");

-- CreateIndex
CREATE INDEX "ExpenseReport_employeeId_idx" ON "ExpenseReport"("employeeId");

-- CreateIndex
CREATE INDEX "ExpenseReport_status_idx" ON "ExpenseReport"("status");

-- CreateIndex
CREATE INDEX "ExpenseItem_expenseReportId_idx" ON "ExpenseItem"("expenseReportId");

-- CreateIndex
CREATE INDEX "BOMComponent_bomId_idx" ON "BOMComponent"("bomId");

-- CreateIndex
CREATE INDEX "BOMComponent_componentProductId_idx" ON "BOMComponent"("componentProductId");

-- CreateIndex
CREATE INDEX "BOMOperation_workCenterId_idx" ON "BOMOperation"("workCenterId");

-- CreateIndex
CREATE UNIQUE INDEX "BOMOperation_bomId_operationNumber_key" ON "BOMOperation"("bomId", "operationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCenter_code_key" ON "WorkCenter"("code");

-- CreateIndex
CREATE INDEX "WorkCenter_isActive_idx" ON "WorkCenter"("isActive");

-- CreateIndex
CREATE INDEX "ProductionOrderOperation_productionOrderId_idx" ON "ProductionOrderOperation"("productionOrderId");

-- CreateIndex
CREATE INDEX "ProductionOrderOperation_status_idx" ON "ProductionOrderOperation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrderOperation_productionOrderId_operationNumber_key" ON "ProductionOrderOperation"("productionOrderId", "operationNumber");

-- CreateIndex
CREATE INDEX "MaterialConsumption_productionOrderId_idx" ON "MaterialConsumption"("productionOrderId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_productId_idx" ON "MaterialConsumption"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityInspection_inspectionNumber_key" ON "QualityInspection"("inspectionNumber");

-- CreateIndex
CREATE INDEX "QualityInspection_productionOrderId_idx" ON "QualityInspection"("productionOrderId");

-- CreateIndex
CREATE INDEX "QualityInspection_productId_idx" ON "QualityInspection"("productId");

-- CreateIndex
CREATE INDEX "QualityInspection_status_idx" ON "QualityInspection"("status");

-- CreateIndex
CREATE INDEX "QualityInspection_inspectionDate_idx" ON "QualityInspection"("inspectionDate");

-- CreateIndex
CREATE UNIQUE INDEX "MRPRun_runNumber_key" ON "MRPRun"("runNumber");

-- CreateIndex
CREATE INDEX "MRPRun_status_idx" ON "MRPRun"("status");

-- CreateIndex
CREATE INDEX "MRPRun_runDate_idx" ON "MRPRun"("runDate");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Workflow_isActive_idx" ON "Workflow"("isActive");

-- CreateIndex
CREATE INDEX "Workflow_triggerType_idx" ON "Workflow"("triggerType");

-- CreateIndex
CREATE INDEX "Workflow_triggerEntity_idx" ON "Workflow"("triggerEntity");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_workflowId_stepOrder_key" ON "WorkflowStep"("workflowId", "stepOrder");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_idx" ON "WorkflowExecution"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_idx" ON "WorkflowExecution"("status");

-- CreateIndex
CREATE INDEX "WorkflowExecution_startedAt_idx" ON "WorkflowExecution"("startedAt");

-- CreateIndex
CREATE INDEX "WorkflowExecutionStep_executionId_idx" ON "WorkflowExecutionStep"("executionId");

-- CreateIndex
CREATE INDEX "WorkflowExecutionStep_status_idx" ON "WorkflowExecutionStep"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowExecutionStep_executionId_stepOrder_key" ON "WorkflowExecutionStep"("executionId", "stepOrder");

-- CreateIndex
CREATE INDEX "WorkflowTemplateLibrary_category_idx" ON "WorkflowTemplateLibrary"("category");

-- CreateIndex
CREATE INDEX "WorkflowTemplateLibrary_isPublic_idx" ON "WorkflowTemplateLibrary"("isPublic");

-- CreateIndex
CREATE INDEX "DemandForecast_productId_idx" ON "DemandForecast"("productId");

-- CreateIndex
CREATE INDEX "DemandForecast_forecastMethod_idx" ON "DemandForecast"("forecastMethod");

-- CreateIndex
CREATE INDEX "DemandForecast_createdAt_idx" ON "DemandForecast"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyPlan_planNumber_key" ON "SupplyPlan"("planNumber");

-- CreateIndex
CREATE INDEX "SupplyPlan_status_idx" ON "SupplyPlan"("status");

-- CreateIndex
CREATE INDEX "SupplyPlan_planningHorizonStart_idx" ON "SupplyPlan"("planningHorizonStart");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_carrier_idx" ON "Shipment"("carrier");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentItem_productId_idx" ON "ShipmentItem"("productId");

-- CreateIndex
CREATE INDEX "ShipmentTrackingEvent_shipmentId_idx" ON "ShipmentTrackingEvent"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentTrackingEvent_eventDate_idx" ON "ShipmentTrackingEvent"("eventDate");

-- CreateIndex
CREATE INDEX "SupplierPerformance_supplierId_idx" ON "SupplierPerformance"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPerformance_evaluationPeriodStart_idx" ON "SupplierPerformance"("evaluationPeriodStart");

-- CreateIndex
CREATE INDEX "SupplierPerformance_overallRating_idx" ON "SupplierPerformance"("overallRating");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPortalAccess_supplierId_key" ON "VendorPortalAccess"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPortalAccess_username_key" ON "VendorPortalAccess"("username");

-- CreateIndex
CREATE INDEX "VendorPortalAccess_username_idx" ON "VendorPortalAccess"("username");

-- CreateIndex
CREATE INDEX "VendorPortalAccess_isActive_idx" ON "VendorPortalAccess"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPurchaseOrder_poNumber_key" ON "VendorPurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "VendorPurchaseOrder_supplierId_idx" ON "VendorPurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "VendorPurchaseOrder_status_idx" ON "VendorPurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "VendorPurchaseOrder_poNumber_idx" ON "VendorPurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "VendorPurchaseOrderItem_poId_idx" ON "VendorPurchaseOrderItem"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPurchaseOrderItem_poId_lineNumber_key" ON "VendorPurchaseOrderItem"("poId", "lineNumber");

-- CreateIndex
CREATE INDEX "SupplierLeadTime_supplierId_idx" ON "SupplierLeadTime"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierLeadTime_productId_idx" ON "SupplierLeadTime"("productId");

-- CreateIndex
CREATE INDEX "SupplierLeadTime_productCategory_idx" ON "SupplierLeadTime"("productCategory");

-- CreateIndex
CREATE INDEX "BillOfMaterial_productId_version_idx" ON "BillOfMaterial"("productId", "version");

-- CreateIndex
CREATE INDEX "BillOfMaterial_isActive_idx" ON "BillOfMaterial"("isActive");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "Document_linkedEntityType_linkedEntityId_idx" ON "Document"("linkedEntityType", "linkedEntityId");

-- CreateIndex
CREATE INDEX "Document_accessLevel_idx" ON "Document"("accessLevel");

-- CreateIndex
CREATE INDEX "Document_ocrProcessed_idx" ON "Document"("ocrProcessed");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_orderNumber_key" ON "ProductionOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_idx" ON "ProductionOrder"("status");

-- CreateIndex
CREATE INDEX "ProductionOrder_productId_idx" ON "ProductionOrder"("productId");

-- CreateIndex
CREATE INDEX "ProductionOrder_startDate_idx" ON "ProductionOrder"("startDate");

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESignatureRequest" ADD CONSTRAINT "ESignatureRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESignatureSigner" ADD CONSTRAINT "ESignatureSigner_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ESignatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_expenseReportId_fkey" FOREIGN KEY ("expenseReportId") REFERENCES "ExpenseReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMComponent" ADD CONSTRAINT "BOMComponent_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMComponent" ADD CONSTRAINT "BOMComponent_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "BillOfMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMOperation" ADD CONSTRAINT "BOMOperation_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMOperation" ADD CONSTRAINT "BOMOperation_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "BillOfMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "WorkCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrderOperation" ADD CONSTRAINT "ProductionOrderOperation_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecutionStep" ADD CONSTRAINT "WorkflowExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "WorkflowExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentTrackingEvent" ADD CONSTRAINT "ShipmentTrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPerformance" ADD CONSTRAINT "SupplierPerformance_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPortalAccess" ADD CONSTRAINT "VendorPortalAccess_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPurchaseOrderItem" ADD CONSTRAINT "VendorPurchaseOrderItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "VendorPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierLeadTime" ADD CONSTRAINT "SupplierLeadTime_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
