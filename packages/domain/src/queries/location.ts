import { prisma } from "@project/db";
import type { CreateLocationInput } from "../schemas/location";
import { requireMembership } from "./membership";

export function listLocations(businessId: string, userId: string) {
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
