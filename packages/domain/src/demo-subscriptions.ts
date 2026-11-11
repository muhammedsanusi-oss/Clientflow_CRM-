import { z } from "zod";
import { domainDatabase as prisma, type Prisma } from "./queries/membership";
import { DomainError } from "./errors";
import { DEMO_PLANS, type DemoPlan } from "./subscription-access";

export const DemoSubscriptionAction = z.object({
  businessId: z.string().min(1).max(100),
  scenario: z.enum(["ENROLL", "PAY_SUCCESS", "PAY_FAILURE", "CANCEL"]),
  plan: z.enum(["STANDARD", "CRM", "MANAGED"]),
  expectedVersion: z.number().int().min(-1),
}).strict();

const managerWhere = (userId: string): Prisma.BusinessWhereInput => ({ OR: [
  { employees: { some: { user_id: userId, is_active: true, role: "OWNER", user: { mustChangePassword: false } } } },
  { developerAccess: { some: { developerId: userId, developer: { isDeveloper: true, mustChangePassword: false } } } },
] });

export function addCalendarMonth(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}

type SnapshotInput = { plan: DemoPlan; status: string; periodStart: Date | null; periodEnd: Date | null; version: number };
function snapshot(value: SnapshotInput | null) {
  return value ? { plan: value.plan, status: value.status, version: value.version, periodStart: value.periodStart?.toISOString() ?? null,
    periodEnd: value.periodEnd?.toISOString() ?? null, amountCents: DEMO_PLANS[value.plan].cents, currency: "USD", simulated: true } : { subscription: null };
}

export async function createPendingDemoSubscription(tx: Prisma.TransactionClient, businessId: string, actorId: string, plan: DemoPlan) {
  const subscription = await tx.demoSubscription.create({ data: { businessId, plan } });
  await tx.demoSubscriptionEvent.create({ data: {
    businessId, actorId, version: 0, action: "ENROLL", before: snapshot(null), after: snapshot(subscription),
  } });
  return subscription;
}

export function listSubscriptionBusinesses(userId: string) {
  return prisma.business.findMany({ where: managerWhere(userId), select: {
    id: true, name: true, websiteTemplate: true, demoSubscription: true,
  }, orderBy: [{ created_at: "desc" }, { id: "desc" }] });
}

export async function getDemoSubscription(userId: string, businessId: string) {
  return prisma.business.findFirst({ where: { id: businessId, ...managerWhere(userId) }, select: {
    id: true, name: true, websiteTemplate: true, demoSubscription: true,
    demoSubscriptionEvents: { orderBy: { version: "desc" }, select: {
      version: true, action: true, before: true, after: true, createdAt: true,
      actor: { select: { id: true, name: true } },
    } },
  } });
}

export async function simulateSubscription(userId: string, input: z.input<typeof DemoSubscriptionAction>) {
  const action = DemoSubscriptionAction.parse(input);
  return prisma.$transaction(async tx => {
    // Lock the authorized tenant, including enrollment where no subscription exists yet.
    const business = await tx.business.findFirst({ where: { id: action.businessId, ...managerWhere(userId) }, select: { id: true } });
    if (!business) throw new DomainError("NOT_FOUND", "Business not found");
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${business.id} FOR UPDATE`;
    const authorized = await tx.business.findFirst({ where: { id: business.id, ...managerWhere(userId) }, select: { id: true } });
    if (!authorized) throw new DomainError("NOT_FOUND", "Business not found");
    const before = await tx.demoSubscription.findUnique({ where: { businessId: business.id } });
    if ((before?.version ?? -1) !== action.expectedVersion) throw new DomainError("CONFLICT", "Subscription changed. Refresh and try again.");
    if (action.scenario === "ENROLL") {
      if (before) throw new DomainError("CONFLICT", "Already enrolled in demo billing.");
      return createPendingDemoSubscription(tx, business.id, userId, action.plan);
    }
    if (!before) throw new DomainError("CONFLICT", "Enroll in demo billing first.");
    if (action.scenario !== "PAY_SUCCESS" && action.plan !== before.plan) throw new DomainError("CONFLICT", "A plan change requires simulated successful payment.");
    const now = new Date();
    const paid = action.scenario === "PAY_SUCCESS";
    const renewal = paid && before.plan === action.plan && before.periodEnd && before.periodEnd > now;
    const after = await tx.demoSubscription.update({ where: { businessId: business.id, version: before.version }, data: {
      version: { increment: 1 },
      status: paid ? "ACTIVE" : action.scenario === "PAY_FAILURE" ? "PAST_DUE" : "CANCELED",
      plan: paid ? action.plan : before.plan,
      ...(paid ? { periodStart: renewal ? before.periodStart : now, periodEnd: addCalendarMonth(renewal ? before.periodEnd! : now) } : {}),
    } });
    await tx.demoSubscriptionEvent.create({ data: {
      businessId: business.id, actorId: userId, version: after.version, action: action.scenario,
      before: snapshot(before), after: snapshot(after),
    } });
    return after;
  });
}
