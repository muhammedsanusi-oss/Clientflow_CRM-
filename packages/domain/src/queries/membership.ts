import type { Prisma } from "@project/db";
import { DomainError } from "../errors";

export async function requireMembership(tx: Prisma.TransactionClient, businessId: string, userId: string) {
  // A URL business ID is only a lookup key; an active session-derived
  // membership is the authority. Foreign and unknown IDs share one error.
  const membership = await tx.employee.findFirst({
    where: { business_id: businessId, user_id: userId, is_active: true },
  });
  if (!membership) throw new DomainError("NOT_FOUND", "Business not found");
  return membership;
}
