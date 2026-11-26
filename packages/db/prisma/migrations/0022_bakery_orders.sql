CREATE TABLE "BakeryProduct" (
 "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
 "name" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "priceCents" INTEGER NOT NULL CHECK ("priceCents" BETWEEN 1 AND 1000000),
 "stock" INTEGER NOT NULL CHECK ("stock" BETWEEN 0 AND 100000), "active" BOOLEAN NOT NULL DEFAULT true,
 "displayOrder" INTEGER NOT NULL DEFAULT 0, "photoRef" TEXT NOT NULL DEFAULT '', "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "BakeryProduct_businessId_active_displayOrder_idx" ON "BakeryProduct"("businessId", "active", "displayOrder");
CREATE TABLE "BakeryDelivery" (
 "businessId" TEXT PRIMARY KEY REFERENCES "Business"("id") ON DELETE RESTRICT,
 "preparationMinutes" INTEGER NOT NULL CHECK ("preparationMinutes" BETWEEN 0 AND 240),
 "speedMph" INTEGER NOT NULL CHECK ("speedMph" BETWEEN 5 AND 60), "zones" JSONB NOT NULL
);
CREATE TABLE "BakeryOrder" (
 "id" TEXT PRIMARY KEY, "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT,
 "attemptKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "tokenHash" TEXT NOT NULL UNIQUE,
 "status" TEXT NOT NULL DEFAULT 'RECEIVED' CHECK ("status" IN ('RECEIVED','WORKING_ON_IT','OUT_FOR_DELIVERY')),
 "version" INTEGER NOT NULL DEFAULT 0, "customer" JSONB NOT NULL, "delivery" JSONB NOT NULL,
 "subtotalCents" INTEGER NOT NULL, "deliveryFeeCents" INTEGER NOT NULL, "totalCents" INTEGER NOT NULL,
 "paymentResult" TEXT NOT NULL DEFAULT 'SIMULATED_SUCCESS', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "arrivalFrom" TIMESTAMP(3) NOT NULL, "arrivalTo" TIMESTAMP(3) NOT NULL,
 UNIQUE ("businessId", "attemptKey")
);
CREATE INDEX "BakeryOrder_businessId_createdAt_idx" ON "BakeryOrder"("businessId", "createdAt");
CREATE TABLE "BakeryOrderItem" (
 "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "BakeryOrder"("id") ON DELETE RESTRICT,
 "productId" TEXT NOT NULL, "name" TEXT NOT NULL, "priceCents" INTEGER NOT NULL, "quantity" INTEGER NOT NULL
);
CREATE INDEX "BakeryOrderItem_orderId_idx" ON "BakeryOrderItem"("orderId");
CREATE TABLE "BakeryOrderEvent" (
 "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "BakeryOrder"("id") ON DELETE RESTRICT,
 "status" TEXT NOT NULL, "actorId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "BakeryOrderEvent_orderId_createdAt_idx" ON "BakeryOrderEvent"("orderId", "createdAt");
