BEGIN;

CREATE TYPE "DeveloperNotificationType" AS ENUM (
  'WEBSITE_INQUIRY',
  'OWNER_FEATURE_REQUEST',
  'CUSTOM_CRM_REQUEST',
  'SERVICE_DOWN',
  'SERVICE_RECOVERED'
);
CREATE TYPE "MonitorStatus" AS ENUM ('UP', 'DOWN');

CREATE TABLE "CustomCrmRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "businessName" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomCrmRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomCrmRequest_createdAt_idx" ON "CustomCrmRequest"("createdAt");

CREATE TABLE "DeveloperNotification" (
  "id" TEXT NOT NULL,
  "developerId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "type" "DeveloperNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "businessId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "DeveloperNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeveloperNotification_developerId_fkey" FOREIGN KEY ("developerId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeveloperNotification_businessId_fkey" FOREIGN KEY ("businessId")
    REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DeveloperNotification_developerId_eventKey_key"
  ON "DeveloperNotification"("developerId", "eventKey");
CREATE INDEX "DeveloperNotification_developerId_readAt_createdAt_idx"
  ON "DeveloperNotification"("developerId", "readAt", "createdAt");

CREATE TABLE "ExternalMonitorState" (
  "monitorId" TEXT NOT NULL,
  "status" "MonitorStatus" NOT NULL DEFAULT 'UP',
  "lastEventId" TEXT NOT NULL,
  "lastObservedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalMonitorState_pkey" PRIMARY KEY ("monitorId")
);

CREATE TABLE "ExternalMonitorEvent" (
  "eventId" TEXT NOT NULL,
  "monitorId" TEXT NOT NULL,
  "status" "MonitorStatus" NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalMonitorEvent_pkey" PRIMARY KEY ("eventId")
);
CREATE INDEX "ExternalMonitorEvent_monitorId_observedAt_idx"
  ON "ExternalMonitorEvent"("monitorId", "observedAt");

COMMIT;
