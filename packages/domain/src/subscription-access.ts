import type { Prisma } from "./queries/membership";

export const DEMO_PLANS = {
  STANDARD: { label: "Standard website", cents: 3900 },
  CRM: { label: "Website + standard CRM", cents: 7900 },
  MANAGED: { label: "Managed service", cents: 14900 },
} as const;
export type DemoPlan = keyof typeof DEMO_PLANS;
type Subscription = { plan: DemoPlan; status: string; periodEnd: Date | null };

export function hasWebsiteAccess(subscription: Subscription | null | undefined, now = new Date()) {
  return !subscription || (subscription.status === "ACTIVE" && !!subscription.periodEnd && subscription.periodEnd > now);
}
export function hasCrmAccess(subscription: Subscription | null | undefined, now = new Date()) {
  return hasWebsiteAccess(subscription, now) && (!subscription || subscription.plan !== "STANDARD");
}

// A missing record is intentional legacy access, never an implicit paid subscription.
export function websiteEntitlementWhere(): Prisma.BusinessWhereInput {
  return { OR: [{ demoSubscription: null }, { demoSubscription: { is: {
    status: "ACTIVE", periodEnd: { gt: new Date() },
  } } }] };
}
export function crmEntitlementWhere(): Prisma.BusinessWhereInput {
  return { OR: [{ demoSubscription: null }, { demoSubscription: { is: {
    status: "ACTIVE", plan: { in: ["CRM", "MANAGED"] }, periodEnd: { gt: new Date() },
  } } }] };
}

export function ownerWorkspaceHref(business: { id: string; demoSubscription?: Subscription | null }) {
  const id = encodeURIComponent(business.id);
  if (!hasWebsiteAccess(business.demoSubscription)) return `/subscription?businessId=${id}`;
  return hasCrmAccess(business.demoSubscription) ? `/calendar?businessId=${id}` : `/businesses/${id}/website`;
}
