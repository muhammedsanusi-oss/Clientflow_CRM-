CREATE TYPE "DemoServicePlan" AS ENUM ('STANDARD', 'CRM', 'MANAGED');
CREATE TYPE "DemoSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TABLE "DemoSubscription" (
  "businessId" TEXT PRIMARY KEY REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "plan" "DemoServicePlan" NOT NULL,
  "status" "DemoSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "DemoSubscriptionEvent" (
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "action" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("businessId", "version")
);
