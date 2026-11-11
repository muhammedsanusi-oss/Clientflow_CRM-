ALTER TYPE "DeveloperNotificationType" ADD VALUE 'MANAGED_SERVICE_REQUEST';
CREATE TYPE "ManagedRequestStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'CANCELED');
CREATE TABLE "ManagedServiceRequest" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "submissionKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "ManagedRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ManagedServiceRequest_businessId_submissionKey_key" ON "ManagedServiceRequest"("businessId", "submissionKey");
CREATE INDEX "ManagedServiceRequest_businessId_createdAt_idx" ON "ManagedServiceRequest"("businessId", "createdAt");
CREATE TABLE "ManagedServiceTime" (
  "id" TEXT PRIMARY KEY,
  "requestId" TEXT NOT NULL REFERENCES "ManagedServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "month" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "voidedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ManagedServiceTime_requestId_month_idx" ON "ManagedServiceTime"("requestId", "month");
CREATE TABLE "ManagedServiceEvent" (
  "requestId" TEXT NOT NULL REFERENCES "ManagedServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "action" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("requestId", "version")
);
