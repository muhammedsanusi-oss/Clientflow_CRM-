import { prisma } from "@project/db";
import type { CreateLocationInput } from "../schemas/location";
import { requireMembership } from "./membership";

export function listLocations(businessId: string, userId: string) {
  // A membership check distinguishes an empty owned business from a foreign
  // business, which must return 404 rather than an empty successful list.
  return prisma.$transaction(async (tx) => {
    await requireMembership(tx, businessId, userId);
    return tx.location.findMany({
      where: {
        business_id: businessId,
        business: { employees: { some: { user_id: userId, is_active: true } } },
      },
      orderBy: { created_at: "desc" },
    });
  });
}

export function getLocationById(id: string, businessId: string, userId: string) {
  return prisma.location.findFirst({
    where: {
      id,
      business_id: businessId,
      business: { employees: { some: { user_id: userId, is_active: true } } },
    },
  });
}

export async function createLocation(businessId: string, userId: string, input: CreateLocationInput) {
  // Keep authorization and the write in the same database transaction.
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
