BEGIN;

CREATE TABLE "BusinessBillingAddress" (
  "businessId" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "apartmentSuite" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "zipCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessBillingAddress_pkey" PRIMARY KEY ("businessId"),
  CONSTRAINT "BusinessBillingAddress_businessId_fkey" FOREIGN KEY ("businessId")
    REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

COMMIT;
