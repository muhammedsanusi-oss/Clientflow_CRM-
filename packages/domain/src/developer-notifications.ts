import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma, type Prisma } from "@project/db";
import { DomainError } from "./errors";
import { callbackInstant, CustomCrmRequest } from "./callback-request";
export { CustomCrmRequest } from "./callback-request";

export const ExternalMonitorEvent = z.object({
  eventId: z.string().trim().min(1).max(160),
  monitorId: z.string().trim().min(1).max(120),
  status: z.enum(["UP", "DOWN"]),
  observedAt: z.string().datetime({ offset: true }).transform(value => new Date(value)),
}).strict();

export const DeveloperNotificationRead = z.union([
  z.object({ notificationId: z.string().min(1).max(100) }).strict(),
  z.object({ all: z.literal(true) }).strict(),
]);

type NotificationInput = {
  eventKey: string;
  type: "WEBSITE_INQUIRY" | "OWNER_FEATURE_REQUEST" | "CUSTOM_CRM_REQUEST" | "SERVICE_DOWN" | "SERVICE_RECOVERED";
  title: string;
  message: string;
  href: string;
  businessId?: string;
};

async function notifyAllDevelopers(tx: Prisma.TransactionClient, notification: NotificationInput) {
  const developers = await tx.user.findMany({
    where: { isDeveloper: true, mustChangePassword: false },
    select: { id: true },
  });
  if (!developers.length) return;
  await tx.developerNotification.createMany({
    data: developers.map(developer => ({ ...notification, developerId: developer.id })),
    skipDuplicates: true,
  });
}

export async function notifyBusinessDevelopers(
  tx: Prisma.TransactionClient,
  businessId: string,
  businessName: string,
  notification: Omit<NotificationInput, "businessId" | "href">,
) {
  const developers = await tx.user.findMany({
    where: { isDeveloper: true, mustChangePassword: false },
    select: { id: true, developerAccess: { where: { businessId }, select: { businessId: true } } },
  });
  if (!developers.length) return;
  await tx.developerNotification.createMany({
    data: developers.map(developer => {
      const hasAccess = developer.developerAccess.length > 0;
      return {
        ...notification,
        developerId: developer.id,
        title: hasAccess ? notification.title : "New business request",
        message: hasAccess ? `${businessName}: ${notification.message}` : "A new business request was submitted.",
        href: hasAccess ? `/businesses/${encodeURIComponent(businessId)}/requests` : "/notifications",
        businessId: hasAccess ? businessId : null,
      };
    }),
    skipDuplicates: true,
  });
}

function assertDeveloper(user: { isDeveloper: boolean; mustChangePassword: boolean } | null): asserts user is { isDeveloper: true; mustChangePassword: false } {
  if (!user?.isDeveloper || user.mustChangePassword) throw new DomainError("NOT_FOUND", "Resource not found");
}

async function requireDeveloper(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findFirst({
    where: { id: userId, isDeveloper: true, mustChangePassword: false },
    select: { isDeveloper: true, mustChangePassword: true },
  });
  assertDeveloper(user);
}

export async function submitCustomCrmRequest(input: z.infer<typeof CustomCrmRequest>) {
  input = CustomCrmRequest.parse(input);
  if (input.website) return;
  await prisma.$transaction(async tx => {
    const key = createHash("sha256").update(`custom-crm-request:${input.email}`).digest("hex");
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const now = new Date();
    const attempts = await tx.$queryRaw<Array<{ attempts: number }>>`
      INSERT INTO "AuthThrottle" ("key", "attempts", "windowStart") VALUES (${key}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN 1 ELSE "AuthThrottle"."attempts" + 1 END,
        "windowStart" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN ${now} ELSE "AuthThrottle"."windowStart" END
      RETURNING "attempts"`;
    if (attempts[0].attempts > 5) throw new DomainError("RATE_LIMITED", "Too many requests. Please try again in 15 minutes.");
    const request = await tx.customCrmRequest.create({ data: {
      name: input.name,
      email: input.email,
      businessName: input.businessName,
      description: input.description,
      phone: input.phone,
      callbackAt: callbackInstant(input.callbackDate, input.callbackTime, input.callbackTimeZone)!,
      callbackTimeZone: input.callbackTimeZone,
    } });
    await notifyAllDevelopers(tx, {
      eventKey: `custom-crm-request:${request.id}`,
      type: "CUSTOM_CRM_REQUEST",
      title: "New custom CRM request",
      message: `${request.name}${request.businessName ? ` (${request.businessName})` : ""} asked for a custom CRM.`,
      href: "/custom-crm-requests",
    });
  });
}

export async function listCustomCrmRequests(userId: string) {
  await requireDeveloper(prisma, userId);
  return prisma.customCrmRequest.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
}

export async function getCustomCrmRequestForPortalSetup(userId: string, requestId: string) {
  return prisma.$transaction(async tx => {
    await requireDeveloper(tx, userId);
    const request = await tx.customCrmRequest.findUnique({
      where: { id: requestId },
      select: { name: true, email: true, phone: true, businessName: true, description: true },
    });
    if (!request) throw new DomainError("NOT_FOUND", "Request not found");
    const [firstName, ...lastName] = request.name.trim().split(/\s+/);
    return {
      initialValues: { name: request.businessName, first_name: firstName, last_name: lastName.join(" "), owner_email: request.email },
      contactPhone: request.phone,
      requestedWork: request.description,
    };
  });
}

// Managed requests retain their explicit business grant even after notification creation.
const managedNotificationVisibility = (userId: string): Prisma.DeveloperNotificationWhereInput => ({ OR: [
  { type: { not: "MANAGED_SERVICE_REQUEST" } },
  { business: { developerAccess: { some: { developerId: userId } } } },
] });

export async function listDeveloperNotifications(userId: string) {
  await requireDeveloper(prisma, userId);
  return prisma.developerNotification.findMany({
    where: { developerId: userId, ...managedNotificationVisibility(userId) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });
}

export async function getUnreadDeveloperNotificationCount(userId: string) {
  await requireDeveloper(prisma, userId);
  return prisma.developerNotification.count({ where: { developerId: userId, readAt: null, ...managedNotificationVisibility(userId) } });
}

export async function markDeveloperNotificationRead(userId: string, notificationId: string) {
  await prisma.$transaction(async tx => {
    await requireDeveloper(tx, userId);
    const result = await tx.developerNotification.updateMany({
      where: { id: notificationId, developerId: userId, readAt: null, ...managedNotificationVisibility(userId) },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      const notification = await tx.developerNotification.findFirst({ where: { id: notificationId, developerId: userId, ...managedNotificationVisibility(userId) }, select: { id: true } });
      if (!notification) throw new DomainError("NOT_FOUND", "Notification not found");
    }
  });
}

export async function markAllDeveloperNotificationsRead(userId: string) {
  await prisma.$transaction(async tx => {
    await requireDeveloper(tx, userId);
    await tx.developerNotification.updateMany({
      where: { developerId: userId, readAt: null, ...managedNotificationVisibility(userId) },
      data: { readAt: new Date() },
    });
  });
}

export async function listDeveloperBusinessRequests(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, developerAccess: { some: { developerId: userId, developer: { isDeveloper: true, mustChangePassword: false } } } },
    select: { id: true, name: true },
  });
  if (!business) throw new DomainError("NOT_FOUND", "Resource not found");
  const [inquiries, featureRequests] = await Promise.all([
    prisma.websiteInquiry.findMany({ where: { businessId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    prisma.websiteFeatureRequest.findMany({ where: { businessId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ]);
  return { business, inquiries, featureRequests };
}

export async function listExternalMonitorStates(userId: string) {
  await requireDeveloper(prisma, userId);
  return prisma.externalMonitorState.findMany({ orderBy: { monitorId: "asc" } });
}

export async function receiveExternalMonitorEvent(input: z.infer<typeof ExternalMonitorEvent>) {
  return prisma.$transaction(async tx => {
    const inserted = await tx.externalMonitorEvent.createMany({
      data: [{
        eventId: input.eventId,
        monitorId: input.monitorId,
        status: input.status,
        observedAt: input.observedAt,
      }],
      skipDuplicates: true,
    });
    if (!inserted.count) return { duplicate: true, transition: false };

    await tx.$executeRaw`
      INSERT INTO "ExternalMonitorState" ("monitorId", "status", "lastEventId", "lastObservedAt", "updatedAt")
      VALUES (${input.monitorId}, 'UP', ${input.eventId}, NULL, ${new Date()})
      ON CONFLICT ("monitorId") DO NOTHING`;
    const states = await tx.$queryRaw<Array<{ status: "UP" | "DOWN"; stale: boolean }>>`
      SELECT "status", "lastObservedAt" IS NOT NULL AND "lastObservedAt" >= ${input.observedAt} AS "stale"
      FROM "ExternalMonitorState"
      WHERE "monitorId" = ${input.monitorId} FOR UPDATE`;
    const state = states[0];
    if (state.stale) {
      return { duplicate: false, transition: false, stale: true };
    }

    const transition = state.status !== input.status;
    await tx.externalMonitorState.update({
      where: { monitorId: input.monitorId },
      data: { status: input.status, lastEventId: input.eventId, lastObservedAt: input.observedAt },
    });
    if (transition) {
      const down = input.status === "DOWN";
      await notifyAllDevelopers(tx, {
        eventKey: `monitor:${input.eventId}`,
        type: down ? "SERVICE_DOWN" : "SERVICE_RECOVERED",
        title: down ? "Service reported down" : "Service recovered",
        message: `${input.monitorId} is ${down ? "down" : "back up"} according to the external monitor.`,
        href: "/notifications",
      });
    }
    return { duplicate: false, transition };
  });
}
