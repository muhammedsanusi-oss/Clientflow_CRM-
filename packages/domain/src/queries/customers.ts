import { crmEntitlementWhere } from "../subscription-access";
/*
 * Code guide: packages/domain/src/queries/customers.ts
 * Database query module for customers. Uses the shared Prisma client and business/user predicates; HTTP
 * callers supply session-derived identity and perform route-level access checks. Follow the functions below
 * for the exact membership/role filters used. The older header below predates the current nested customer API
 * routes.
 */
// Customer queries use a business scope. There are no customer HTTP routes
// yet; future callers must verify session-derived membership before use.
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
/*
 * Import connection: ../schemas/customer -> packages/domain/src/schemas/customer.ts.
 * Type CreateCustomerInput: Type contract used to check callers at compile time; it does not fetch or modify
 * data.
 */
import type { CreateCustomerInput } from "../schemas/customer";

/*
 * Reads customers using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export function listCustomers(business_id: string, userId: string) {
  return prisma.customer.findMany({
    where: { business_id, business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } } },
    orderBy: { createdAt: "desc" },
  });
}

/*
 * Reads customer using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export function getCustomer(id: string, business_id: string, userId: string) {
  return prisma.customer.findFirst({
    where: { id, business_id, business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } } },
  });
}

/*
 * Business API customer write, distinct from createCustomerForUser used by the camelCase browser workflow.
 */
export async function createCustomer(business_id: string, userId: string, input: CreateCustomerInput) {
  const business = await prisma.business.findFirst({
    where: { id: business_id, ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } },
    select: { id: true },
  });
  if (!business) return null;

  return prisma.customer.create({
    data: {
      business_id,
      ...input
    },
  });
}
