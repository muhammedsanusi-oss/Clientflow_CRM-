/*
 * Code guide: packages/domain/src/queries/interactions.ts
 * Database query module for interactions. Uses the shared Prisma client and business/user predicates; HTTP
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
 * Import connection: ../schemas/interaction -> packages/domain/src/schemas/interaction.ts.
 * Type CreateInteractionInput: Type contract used to check callers at compile time; it does not fetch or
 * modify data.
 */
import type { CreateInteractionInput } from "../schemas/interaction";

// Reusable relationship predicate connecting this resource to the supplied business and user membership. The
// route may perform additional active-access checks.
const ownedCustomerWhere = (businessId: string, userId: string) => ({
  business_id: businessId,
  business: { employees: { some: { user_id: userId } } },
});

/*
 * Reads interactions using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export function listInteractions(customerId: string, businessId: string, userId: string) {
  return prisma.interaction.findMany({
    where: { customer_id: customerId, customer: ownedCustomerWhere(businessId, userId) },
    include: { employee: true },
    orderBy: { interaction_date: "desc" },
  });
}

/*
 * Reads interaction using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export function getInteraction(id: string, customerId: string, businessId: string, userId: string) {
  return prisma.interaction.findFirst({
    where: {
      id,
      customer_id: customerId,
      customer: ownedCustomerWhere(businessId, userId),
    },
    include: { employee: true },
  });
}

/*
 * Creates a customer communication record with the signed-in user membership recorded as author.
 */
export async function createInteraction(customerId: string, businessId: string, userId: string, input: CreateInteractionInput) {
  const [customer, employee] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, ...ownedCustomerWhere(businessId, userId) }, select: { id: true } }),
    prisma.employee.findFirst({
      where: { business_id: businessId, user_id: userId },
      select: { id: true },
    }),
  ]);
  if (!customer || !employee) return null;

  return prisma.interaction.create({
    data: {
      customer_id: customer.id,
      employee_id: employee.id,
      type: input.type,
      subject: input.subject,
      content: input.content,
      ...(input.interaction_date ? { interaction_date: input.interaction_date } : {}),
    },
    include: { employee: true },
  });
}
