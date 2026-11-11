import { crmEntitlementWhere } from "../subscription-access";
/*
 * Code guide: packages/domain/src/queries/tasks.ts
 * Database query module for tasks. Uses the shared Prisma client and business/user predicates; HTTP callers
 * supply session-derived identity and perform route-level access checks. Follow the functions below for the
 * exact membership/role filters used.
 */
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
/*
 * Import connection: ../schemas/task -> packages/domain/src/schemas/task.ts.
 * Type CreateTaskInput: Type contract used to check callers at compile time; it does not fetch or modify
 * data.
 */
import type { CreateTaskInput } from "../schemas/task";

// Reusable relationship predicate connecting this resource to the supplied business and user membership. The
// route may perform additional active-access checks.
const ownedCustomerWhere = (businessId: string, userId: string) => ({
  business_id: businessId,
  business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } },
});

/*
 * Reads tasks using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export function listTasks(businessId: string, userId: string) {
  return prisma.task.findMany({
    where: { customer: ownedCustomerWhere(businessId, userId) },
    include: { customer: true, employee: true },
    orderBy: { due_date: "asc" },
  });
}

/*
 * Reads task using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export function getTask(id: string, businessId: string, userId: string) {
  return prisma.task.findFirst({
    where: { id, customer: ownedCustomerWhere(businessId, userId) },
    include: { customer: true, employee: true },
  });
}

/*
 * Checks customer and employee business links before creating the follow-up task.
 */
export async function createTask(businessId: string, userId: string, input: CreateTaskInput) {
  const [customer, employee] = await Promise.all([
    prisma.customer.findFirst({ where: { id: input.customer_id, ...ownedCustomerWhere(businessId, userId) }, select: { id: true } }),
    prisma.employee.findFirst({
      where: { id: input.employee_id, business_id: businessId, business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } } },
      select: { id: true },
    }),
  ]);
  if (!customer || !employee) return null;

  return prisma.task.create({
    data: { ...input, customer_id: customer.id, employee_id: employee.id },
    include: { customer: true, employee: true },
  });
}
