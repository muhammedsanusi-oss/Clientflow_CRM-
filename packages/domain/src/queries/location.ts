import { crmEntitlementWhere } from "../subscription-access";
/*
 * Code guide: packages/domain/src/queries/location.ts
 * Database query module for location. Uses the shared Prisma client and business/user predicates; HTTP
 * callers supply session-derived identity and perform route-level access checks. Follow the functions below
 * for the exact membership/role filters used.
 */
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
/*
 * Import connection: ../schemas/location -> packages/domain/src/schemas/location.ts.
 * Type CreateLocationInput: Type contract used to check callers at compile time; it does not fetch or modify
 * data.
 */
import type { CreateLocationInput } from "../schemas/location";
/*
 * Import connection: ./membership -> packages/domain/src/queries/membership.ts.
 * requireMembership: Checks an active user membership in the selected business within the supplied
 * transaction and returns it, or raises NOT_FOUND.
 */
import { requireMembership } from "./membership";

/*
 * Reads locations using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export function listLocations(businessId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await requireMembership(tx, businessId, userId);
    return tx.location.findMany({
      where: {
        business_id: businessId,
        business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } },
      },
      orderBy: { created_at: "desc" },
    });
  });
}

/*
 * Reads location by id using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export function getLocationById(id: string, businessId: string, userId: string) {
  return prisma.location.findFirst({
    where: {
      id,
      business_id: businessId,
      business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } },
    },
  });
}

/*
 * Creates a location only after the transaction checks active business membership.
 */
export async function createLocation(businessId: string, userId: string, input: CreateLocationInput) {
  return prisma.$transaction(async (tx) => {
    await requireMembership(tx, businessId, userId);
    return tx.location.create({
      data: {
        business_id: businessId,
        ...input,
      },
    });
  });
}
