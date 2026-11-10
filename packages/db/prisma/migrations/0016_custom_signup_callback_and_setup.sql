BEGIN;

ALTER TABLE "CustomCrmRequest"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "callbackAt" TIMESTAMP(3),
  ADD COLUMN "callbackTimeZone" TEXT;

ALTER TABLE "User" ADD COLUMN "setupTokenHash" TEXT;
CREATE UNIQUE INDEX "User_setupTokenHash_key" ON "User"("setupTokenHash");

COMMIT;
