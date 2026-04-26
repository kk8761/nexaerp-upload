-- CreateTable
CREATE TABLE "PutawayStrategy" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "strategyType" VARCHAR(50) NOT NULL,
    "warehouseId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PutawayStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PutawayTask" (
    "id" TEXT NOT NULL,
    "taskNumber" VARCHAR(100) NOT NULL,
    "strategyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "fromLocation" VARCHAR(100),
    "toBinLocationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedTo" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PutawayTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WavePick" (
    "id" TEXT NOT NULL,
    "waveNumber" VARCHAR(100) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "pickingMethod" VARCHAR(50) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scheduledDate" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WavePick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickList" (
    "id" TEXT NOT NULL,
    "pickListNumber" VARCHAR(100) NOT NULL,
    "wavePickId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "orderId" VARCHAR(100),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedTo" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "pickingStarted" TIMESTAMP(3),
    "pickingCompleted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickListItem" (
    "id" TEXT NOT NULL,
    "pickListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "binLocationId" TEXT,
    "quantityOrdered" DOUBLE PRECISION NOT NULL,
    "quantityPicked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "batchNumber" VARCHAR(100),
    "serialNumbers" TEXT[],
    "pickSequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingSlip" (
    "id" TEXT NOT NULL,
    "slipNumber" VARCHAR(100) NOT NULL,
    "pickListId" TEXT NOT NULL,
    "orderId" VARCHAR(100),
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "packedBy" TEXT,
    "packingStarted" TIMESTAMP(3),
    "packingCompleted" TIMESTAMP(3),
    "shippingCarrier" VARCHAR(100),
    "trackingNumber" VARCHAR(100),
    "weight" DOUBLE PRECISION,
    "dimensions" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingSlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseWorker" (
    "id" TEXT NOT NULL,
    "workerId" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "warehouseId" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "shiftStart" VARCHAR(10),
    "shiftEnd" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseProductivityLog" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "taskType" VARCHAR(50) NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "unitsProcessed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "efficiency" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseProductivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseTaskAssignment" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "taskType" VARCHAR(50) NOT NULL,
    "taskId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedDuration" DOUBLE PRECISION,
    "actualDuration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseTaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PutawayTask_taskNumber_key" ON "PutawayTask"("taskNumber");

-- CreateIndex
CREATE INDEX "PutawayTask_warehouseId_status_idx" ON "PutawayTask"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "PutawayTask_assignedTo_status_idx" ON "PutawayTask"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "PutawayTask_priority_idx" ON "PutawayTask"("priority");

-- CreateIndex
CREATE INDEX "PutawayStrategy_warehouseId_isActive_idx" ON "PutawayStrategy"("warehouseId", "isActive");

-- CreateIndex
CREATE INDEX "PutawayStrategy_strategyType_idx" ON "PutawayStrategy"("strategyType");

-- CreateIndex
CREATE UNIQUE INDEX "WavePick_waveNumber_key" ON "WavePick"("waveNumber");

-- CreateIndex
CREATE INDEX "WavePick_warehouseId_status_idx" ON "WavePick"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "WavePick_scheduledDate_idx" ON "WavePick"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "PickList_pickListNumber_key" ON "PickList"("pickListNumber");

-- CreateIndex
CREATE INDEX "PickList_warehouseId_status_idx" ON "PickList"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "PickList_assignedTo_status_idx" ON "PickList"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "PickList_wavePickId_idx" ON "PickList"("wavePickId");

-- CreateIndex
CREATE INDEX "PickListItem_pickListId_idx" ON "PickListItem"("pickListId");

-- CreateIndex
CREATE INDEX "PickListItem_productId_idx" ON "PickListItem"("productId");

-- CreateIndex
CREATE INDEX "PickListItem_binLocationId_idx" ON "PickListItem"("binLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "PackingSlip_slipNumber_key" ON "PackingSlip"("slipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PackingSlip_pickListId_key" ON "PackingSlip"("pickListId");

-- CreateIndex
CREATE INDEX "PackingSlip_warehouseId_status_idx" ON "PackingSlip"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "PackingSlip_packedBy_idx" ON "PackingSlip"("packedBy");

-- CreateIndex
CREATE INDEX "PackingSlip_orderId_idx" ON "PackingSlip"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseWorker_workerId_key" ON "WarehouseWorker"("workerId");

-- CreateIndex
CREATE INDEX "WarehouseWorker_warehouseId_isActive_idx" ON "WarehouseWorker"("warehouseId", "isActive");

-- CreateIndex
CREATE INDEX "WarehouseWorker_role_idx" ON "WarehouseWorker"("role");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseProductivityLog_workerId_date_taskType_key" ON "WarehouseProductivityLog"("workerId", "date", "taskType");

-- CreateIndex
CREATE INDEX "WarehouseProductivityLog_warehouseId_date_idx" ON "WarehouseProductivityLog"("warehouseId", "date");

-- CreateIndex
CREATE INDEX "WarehouseProductivityLog_workerId_date_idx" ON "WarehouseProductivityLog"("workerId", "date");

-- CreateIndex
CREATE INDEX "WarehouseTaskAssignment_workerId_status_idx" ON "WarehouseTaskAssignment"("workerId", "status");

-- CreateIndex
CREATE INDEX "WarehouseTaskAssignment_warehouseId_taskType_status_idx" ON "WarehouseTaskAssignment"("warehouseId", "taskType", "status");

-- CreateIndex
CREATE INDEX "WarehouseTaskAssignment_priority_idx" ON "WarehouseTaskAssignment"("priority");

-- AddForeignKey
ALTER TABLE "PutawayTask" ADD CONSTRAINT "PutawayTask_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "PutawayStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickList" ADD CONSTRAINT "PickList_wavePickId_fkey" FOREIGN KEY ("wavePickId") REFERENCES "WavePick"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickListItem" ADD CONSTRAINT "PickListItem_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "PickList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingSlip" ADD CONSTRAINT "PackingSlip_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "PickList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseProductivityLog" ADD CONSTRAINT "WarehouseProductivityLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WarehouseWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTaskAssignment" ADD CONSTRAINT "WarehouseTaskAssignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WarehouseWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
