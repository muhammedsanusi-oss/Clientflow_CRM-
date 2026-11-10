import { prisma, LOCAL_DEV_URL } from "../packages/db/src/index";
import { LOCAL_TEST_ACCOUNTS } from "../packages/auth/src/test-accounts";
import { simulateSubscription } from "../packages/domain/src/demo-subscriptions";
import { DEMO_PLANS, type DemoPlan } from "../packages/domain/src/subscription-access";

// Explicit local preview conversion, never a production migration or login reset.
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? LOCAL_DEV_URL);
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "15432") {
    throw new Error("Subscription previews require the local development database on port 15432.");
  }
  const developerId = LOCAL_TEST_ACCOUNTS.developer.id;
  const businesses = await prisma.business.findMany({ where: {
    websiteTemplate: { not: null },
    developerAccess: { some: { developerId, developer: { isDeveloper: true, mustChangePassword: false } } },
  }, select: { id: true, name: true, demoSubscription: true }, orderBy: { id: "asc" } });
  const plans: DemoPlan[] = ["STANDARD", "CRM", "MANAGED"];
  for (const [index, business] of businesses.entries()) {
    let subscription = business.demoSubscription;
    if (!subscription && !process.argv.includes("--list")) {
      const plan = business.id === "local-test-business" ? "CRM" : plans[index % plans.length];
      const pending = await simulateSubscription(developerId, { businessId: business.id, scenario: "ENROLL", plan, expectedVersion: -1 });
      subscription = await simulateSubscription(developerId, { businessId: business.id, scenario: "PAY_SUCCESS", plan, expectedVersion: pending.version });
    }
    console.log(JSON.stringify({ name: business.name, id: business.id,
      service: subscription ? DEMO_PLANS[subscription.plan].label : "Not enrolled",
      status: subscription?.status ?? "Not enrolled", simulated: true }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Preview setup failed"); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
