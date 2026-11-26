-- Existing orders keep working through their private tracking links.
ALTER TABLE "BakeryOrder" ADD COLUMN "orderNumber" TEXT;
CREATE UNIQUE INDEX "BakeryOrder_orderNumber_key" ON "BakeryOrder"("orderNumber");
