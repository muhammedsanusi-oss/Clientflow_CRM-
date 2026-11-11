// Disposable local browser-check fixture. Never changes existing accounts or sites.
import { prisma, LOCAL_DEV_URL } from "../../packages/db/src/index";
import { hashPassword } from "../../packages/auth/src/password";
import { LOCAL_TEST_ACCOUNTS } from "../../packages/auth/src/test-accounts";
const businessId = "managed-keyboard-check";
const userId = "managed-keyboard-owner";
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? LOCAL_DEV_URL);
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "15432") throw new Error("Local development database required");
  if (process.argv.includes("--cleanup")) {
    const fixture = await prisma.business.findFirst({ where: { id: businessId, name: "Disposable keyboard check", employees: { some: { user_id: userId, user: { email: "managed-keyboard@example.test" } } } }, select: { id: true } });
    if (!fixture) throw new Error("Matching disposable fixture not found; nothing removed");
    await prisma.$transaction(async tx => {
      await tx.developerNotification.deleteMany({ where: { businessId } });
      await tx.managedServiceTime.deleteMany({ where: { request: { businessId } } });
      await tx.managedServiceEvent.deleteMany({ where: { request: { businessId } } });
      await tx.managedServiceRequest.deleteMany({ where: { businessId } });
      await tx.demoSubscription.deleteMany({ where: { businessId } });
      await tx.employee.deleteMany({ where: { business_id: businessId, user_id: userId } });
      await tx.developerBusinessAccess.deleteMany({ where: { businessId } });
      await tx.business.delete({ where: { id: businessId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    console.log("Removed only the disposable keyboard-check fixture");
    return;
  }
  if (await prisma.business.findUnique({ where: { id: businessId } }) || await prisma.user.findUnique({ where: { id: userId } })) throw new Error("Fixture IDs already exist; existing records left untouched");
  const passwordHash = await hashPassword("Managed-keyboard-demo-2026!");
  await prisma.$transaction(async tx => {
    await tx.user.create({ data: { id: userId, name: "Keyboard demo owner", email: "managed-keyboard@example.test", passwordHash } });
    await tx.business.create({ data: { id: businessId, name: "Disposable keyboard check", description: "Temporary UI verification", business_type: "OTHER", email: "managed-keyboard@example.test", phone_number: "2125550111", websiteTemplate: "CONTACT",
      demoSubscription: { create: { plan: "MANAGED", status: "ACTIVE", periodEnd: new Date(Date.now() + 86_400_000) } },
      employees: { create: { user_id: userId, first_name: "Keyboard", last_name: "Owner", email: "managed-keyboard@example.test", phone_number: "2125550111", role: "OWNER", hire_date: new Date() } },
      developerAccess: { create: { developerId: LOCAL_TEST_ACCOUNTS.developer.id } },
    } });
  });
  console.log("Disposable Managed fixture ready: managed-keyboard@example.test / Managed-keyboard-demo-2026!");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Fixture failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
