-- Prisma represents these guarantees as standalone unique indexes.
ALTER TABLE "BakeryOrder" DROP CONSTRAINT "BakeryOrder_businessId_attemptKey_key";
ALTER TABLE "BakeryOrder" DROP CONSTRAINT "BakeryOrder_tokenHash_key";
CREATE UNIQUE INDEX "BakeryOrder_businessId_attemptKey_key" ON "BakeryOrder"("businessId", "attemptKey");
CREATE UNIQUE INDEX "BakeryOrder_tokenHash_key" ON "BakeryOrder"("tokenHash");
