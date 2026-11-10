import { z } from "zod";
import { domainDatabase as prisma, type Prisma } from "./queries/membership";
import { DomainError } from "./errors";
import { hasWebsiteAccess } from "./subscription-access";

const id = z.string().min(1).max(100);
const note = z.string().trim().min(1, "Describe the work or reason.").max(4000);
const base = { businessId: id, requestId: id, expectedVersion: z.number().int().min(0) };
export const ManagedServiceMutation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CREATE"), businessId: id, submissionKey: z.string().uuid(), title: z.string().trim().min(1).max(150), description: note }).strict(),
  z.object({ action: z.literal("START"), ...base }).strict(),
  z.object({ action: z.literal("CANCEL"), ...base }).strict(),
  z.object({ action: z.literal("COMPLETE"), ...base, note }).strict(),
  z.object({ action: z.literal("DECLINE"), ...base, note }).strict(),
  z.object({ action: z.literal("LOG_TIME"), ...base, minutes: z.number().int().min(1).max(30), note }).strict(),
  z.object({ action: z.literal("VOID_TIME"), ...base, entryId: id, note }).strict(),
]);
export type ManagedMutation = z.input<typeof ManagedServiceMutation>;

export const managedManagerWhere = (userId: string): Prisma.BusinessWhereInput => ({ OR: [
  { employees: { some: { user_id: userId, role: "OWNER", is_active: true, user: { mustChangePassword: false } } } },
  { developerAccess: { some: { developerId: userId, developer: { isDeveloper: true, mustChangePassword: false } } } },
] });
const missing = () => new DomainError("NOT_FOUND", "Managed service not found");
const conflict = (message: string) => new DomainError("CONFLICT", message);
export function managedMonth(now = new Date()) {
  return { month: now.toISOString().slice(0, 7), resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
}
async function businessFor(tx: Prisma.TransactionClient, userId: string, businessId: string) {
  const business = await tx.business.findFirst({ where: { id: businessId, ...managedManagerWhere(userId) }, select: {
    id: true, name: true, websiteTemplate: true, demoSubscription: true,
    employees: { where: { user_id: userId, role: "OWNER", is_active: true, user: { mustChangePassword: false } }, select: { id: true } },
    developerAccess: { where: { developerId: userId, developer: { isDeveloper: true, mustChangePassword: false } }, select: { developerId: true } },
  } });
  if (!business) throw missing();
  return { ...business, isOwner: business.employees.length > 0, isDeveloper: business.developerAccess.length > 0,
    eligible: business.demoSubscription?.plan === "MANAGED" && hasWebsiteAccess(business.demoSubscription) };
}
async function usedMinutes(tx: Prisma.TransactionClient, userId: string, businessId: string, month: string) {
  return (await tx.managedServiceTime.aggregate({ where: { month, voidedAt: null,
    request: { businessId, business: managedManagerWhere(userId) },
  }, _sum: { minutes: true } }))._sum.minutes ?? 0;
}
export async function getManagedService(userId: string, businessId: string) {
  return prisma.$transaction(async tx => {
    const business = await businessFor(tx, userId, businessId);
    const period = managedMonth();
    const used = await usedMinutes(tx, userId, businessId, period.month);
    const requests = await tx.managedServiceRequest.findMany({ where: { businessId, business: managedManagerWhere(userId) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: {
        timeEntries: { include: { actor: { select: { name: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }, events: { include: { actor: { select: { name: true } } }, orderBy: { version: "asc" } },
      } });
    return { business, ...period, used, remaining: business.eligible ? Math.max(0, 30 - used) : 0, requests };
  });
}
export function listManagedServiceBusinesses(userId: string) {
  return prisma.business.findMany({ where: { ...managedManagerWhere(userId), AND: [{ OR: [
    { demoSubscription: { is: { plan: "MANAGED" } } }, { managedRequests: { some: {} } },
  ] }] }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function mutateManagedService(userId: string, input: ManagedMutation) {
  const action = ManagedServiceMutation.parse(input);
  return prisma.$transaction(async tx => {
    await businessFor(tx, userId, action.businessId);
    // This is the same tenant lock used by billing and publishing. It also
    // serializes the shared budget across different requests.
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${action.businessId} FOR UPDATE`;
    const business = await businessFor(tx, userId, action.businessId);
    if (action.action === "CREATE") {
      if (!business.isOwner || !business.eligible) throw missing();
      const previous = await tx.managedServiceRequest.findFirst({ where: {
        businessId: business.id, submissionKey: action.submissionKey, business: managedManagerWhere(userId),
      } });
      if (previous) {
        if (previous.title !== action.title || previous.description !== action.description) throw conflict("This submission was already used. Refresh and try again.");
        return previous;
      }
      const request = await tx.managedServiceRequest.create({ data: { businessId: business.id, title: action.title, description: action.description, submissionKey: action.submissionKey } });
      await tx.managedServiceEvent.create({ data: { requestId: request.id, version: 0, actorId: userId, action: "CREATE", before: {}, after: { status: request.status }, note: action.description } });
      const grants = await tx.developerBusinessAccess.findMany({ where: { businessId: business.id, developer: { isDeveloper: true, mustChangePassword: false } }, select: { developerId: true } });
      if (grants.length) await tx.developerNotification.createMany({ data: grants.map(grant => ({
        developerId: grant.developerId, businessId: business.id, eventKey: `managed-service:${request.id}`,
        type: "MANAGED_SERVICE_REQUEST", title: "New managed content request", message: `${business.name}: ${request.title}`,
        href: `/businesses/${encodeURIComponent(business.id)}/managed-service`,
      })) });
      return request;
    }
    const request = await tx.managedServiceRequest.findFirst({ where: { id: action.requestId, businessId: business.id, business: managedManagerWhere(userId) } });
    if (!request) throw missing();
    if (request.version !== action.expectedVersion) throw conflict("Request changed. Refresh and try again.");
    if (action.action === "CANCEL" ? !business.isOwner : !business.isDeveloper) throw missing();
    if (!["CANCEL", "DECLINE", "VOID_TIME"].includes(action.action) && !business.eligible) throw missing();
    let status = request.status;
    let eventDetails: Prisma.InputJsonObject = {};
    let eventNote = "";
    if (action.action === "CANCEL") {
      if (status !== "SUBMITTED") throw conflict("Only submitted requests can be canceled. Discuss work in progress with your developer.");
      status = "CANCELED";
    } else if (action.action === "START") {
      if (status !== "SUBMITTED") throw conflict("Only submitted requests can be started.");
      status = "IN_PROGRESS";
    } else if (action.action === "DECLINE") {
      if (status !== "SUBMITTED" && status !== "IN_PROGRESS") throw conflict("This request is already closed.");
      status = "DECLINED";
      eventNote = action.note;
    } else if (action.action === "COMPLETE") {
      if (status !== "IN_PROGRESS") throw conflict("Start the request before completing it.");
      const recorded = await tx.managedServiceTime.count({ where: { requestId: request.id, voidedAt: null, request: { businessId: business.id, business: managedManagerWhere(userId) } } });
      if (!recorded) throw conflict("Record the content-change time before completing the request.");
      status = "COMPLETED";
      eventNote = action.note;
    } else if (action.action === "LOG_TIME") {
      if (status !== "IN_PROGRESS") throw conflict("Time can only be recorded while work is in progress.");
      const { month } = managedMonth();
      const used = await usedMinutes(tx, userId, business.id, month);
      if (used + action.minutes > 30) throw conflict(`Only ${30 - used} included minutes remain. Additional work requires a separate quote.`);
      const entry = await tx.managedServiceTime.create({ data: { requestId: request.id, actorId: userId, month, minutes: action.minutes, description: action.note } });
      eventDetails = { entryId: entry.id, month, minutes: action.minutes };
      eventNote = action.note;
    } else {
      if (status === "COMPLETED") throw conflict("Completed work cannot be corrected here.");
      const entry = await tx.managedServiceTime.findFirst({ where: { id: action.entryId, requestId: request.id, voidedAt: null, request: { businessId: business.id, business: managedManagerWhere(userId) } } });
      if (!entry) throw missing();
      await tx.managedServiceTime.update({ where: { id: entry.id }, data: { voidedAt: new Date(), voidReason: action.note, voidedById: userId } });
      eventDetails = { entryId: entry.id, month: entry.month, restoredMinutes: entry.minutes };
      eventNote = action.note;
    }
    const after = await tx.managedServiceRequest.update({ where: { id: request.id, version: request.version }, data: { status, version: { increment: 1 } } });
    await tx.managedServiceEvent.create({ data: { requestId: request.id, version: after.version, actorId: userId, action: action.action,
      before: { status: request.status }, after: { status, ...eventDetails }, note: eventNote } });
    return after;
  });
}
