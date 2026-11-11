import { crmEntitlementWhere } from "../subscription-access";
/*
 * Code guide: packages/domain/src/queries/membership.ts
 * Database query module for membership. Uses the shared Prisma client and business/user predicates; HTTP
 * callers supply session-derived identity and perform route-level access checks. Follow the functions below
 * for the exact membership/role filters used.
 */
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * Type Prisma: Generated TypeScript query/transaction types; a type import does not open another connection.
 * Defined in packages/db/src/generated/prisma.
 */
import { prisma, type Prisma } from "@project/db";
// Internal query context: other domain modules reuse the established DB boundary.
export { prisma as domainDatabase };
export type { Prisma };
/*
 * Import connection: ../errors -> packages/domain/src/errors.ts.
 * DomainError: Deliberate safe domain failure carrying an allowed public code/message.
 */
import { DomainError } from "../errors";

/*
 * Checks an active user membership in the selected business within the supplied transaction and returns it,
 * or raises NOT_FOUND.
 */
export async function requireMembership(tx: Prisma.TransactionClient, businessId: string, userId: string) {
  // A URL business ID is only a lookup key; an active session-derived
  // membership is the authority. Foreign and unknown IDs share one error.
  const membership = await tx.employee.findFirst({
    where: { business_id: businessId, user_id: userId, is_active: true, business: crmEntitlementWhere() },
  });
  if (!membership) throw new DomainError("NOT_FOUND", "Business not found");
  return membership;
}
