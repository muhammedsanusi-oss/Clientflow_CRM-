ALTER TABLE "Business" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User"
  ADD COLUMN "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "temporaryExpiresAt" TIMESTAMP(3),
  ADD COLUMN "temporaryConsumedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "restricted" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "DeveloperBusinessAccess" (
  "developerId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  CONSTRAINT "DeveloperBusinessAccess_pkey" PRIMARY KEY ("developerId", "businessId"),
  CONSTRAINT "DeveloperBusinessAccess_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeveloperBusinessAccess_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DeveloperBusinessAccess_businessId_idx" ON "DeveloperBusinessAccess"("businessId");
CREATE TABLE "AuthThrottle" (
  "key" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthThrottle_pkey" PRIMARY KEY ("key")
);
