import { prisma, LOCAL_DEV_URL } from "../packages/db/src/index";
import { LOCAL_TEST_ACCOUNTS } from "../packages/auth/src/test-accounts";
import { getManagedService, managedManagerWhere, mutateManagedService } from "../packages/domain/src/managed-service";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? LOCAL_DEV_URL);
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "15432") throw new Error("Managed previews require the local development database on port 15432.");
  const developerId = LOCAL_TEST_ACCOUNTS.developer.id;
  // Only the known preview website, with its existing developer grant. No
  // account, website, subscription, or real work is rewritten by this fixture.
  const businessId = "local-website-sample-barbershop";
  const data = await getManagedService(developerId, businessId);
  if (!data.business.isDeveloper || !data.business.eligible) throw new Error("The Corner Chair needs an active Managed demo subscription.");
  for (const [suffix, submissionKey] of [
    ["completed", "00000000-0000-4000-8000-000000000001"],
    ["submitted", "00000000-0000-4000-8000-000000000002"],
  ]) {
    let request = await prisma.$transaction(async tx => {
      const authorized = await tx.business.findFirst({ where: { id: businessId, ...managedManagerWhere(developerId) }, select: { id: true } });
      if (!authorized) throw new Error("Preview business not found");
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
      const previous = await tx.managedServiceRequest.findFirst({ where: { businessId, submissionKey, business: managedManagerWhere(developerId) } });
      if (previous) return previous;
      const request = await tx.managedServiceRequest.create({ data: { businessId, submissionKey,
        title: suffix === "completed" ? "Demo example: opening-hours update" : "Demo example: replace the welcome text",
        description: "Synthetic preview request for exploring the Managed workflow. No website content is changed by this example.",
      } });
      await tx.managedServiceEvent.create({ data: { requestId: request.id, actorId: developerId, version: 0, action: "DEMO_CREATE", before: {}, after: { status: "SUBMITTED", demo: true }, note: "Explicit local preview fixture; not a real customer request." } });
      return request;
    });
    if (suffix === "completed" && request.status === "SUBMITTED" && request.version === 0) {
      request = await mutateManagedService(developerId, { action: "START", businessId, requestId: request.id, expectedVersion: request.version });
      request = await mutateManagedService(developerId, { action: "LOG_TIME", businessId, requestId: request.id, expectedVersion: request.version, minutes: 10, note: "Demo: 10 minutes of example content work. No actual website changes were made." });
      await mutateManagedService(developerId, { action: "COMPLETE", businessId, requestId: request.id, expectedVersion: request.version, note: "Demo completion for preview only; use the editor for real published changes." });
    }
  }
  const result = await getManagedService(developerId, businessId);
  console.log(JSON.stringify({ business: result.business.name, month: result.month, usedMinutes: result.used, remainingMinutes: result.remaining, requests: result.requests.length, demo: true }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Preview setup failed"); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
