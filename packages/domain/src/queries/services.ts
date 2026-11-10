/*
 * Code guide: packages/domain/src/queries/services.ts
 * Database query module for services. Uses the shared Prisma client and business/user predicates; HTTP
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
 * Import connection: ../schemas/service -> packages/domain/src/schemas/service.ts.
 * Type CreateServiceInput: Type contract used to check callers at compile time; it does not fetch or modify
 * data.
 */
import type { CreateServiceInput } from "../schemas/service";

/*
 * Reads services using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export function listServices(businessId: string, userId: string) {
  return prisma.service.findMany({
    where: { business_id: businessId, business: { employees: { some: { user_id: userId } } } },
    orderBy: { name: "asc" },
  });
}

/*
 * Reads service using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export function getService(id: string, businessId: string, userId: string) {
  return prisma.service.findFirst({
    where: { id, business_id: businessId, business: { employees: { some: { user_id: userId } } } },
  });
}

/*
 * Writes a service in an authorized business and maps the API is_active field to the stored is_Active
 * property.
 */
export async function createService(businessId: string, userId: string, input: CreateServiceInput) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, employees: { some: { user_id: userId } } },
    select: { id: true },
  });
  if (!business) return null;

  return prisma.service.create({
    data: {
      business_id: businessId,
      name: input.name,
      category: input.category,
      description: input.description,
      duration_minutes: input.duration_minutes,
      base_price: input.base_price,
      is_Active: input.is_active,
    },
  });
}
