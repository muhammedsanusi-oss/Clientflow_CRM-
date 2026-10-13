import { prisma } from "@project/db";
import type { CreateLocationInput } from "../schemas/location";



export function listLocations(businessId: string, userId: string) {
  return prisma.location.findMany({
    where: {
      business_id: businessId,
      business: { employees: { some: { user_id: userId } } },
    },
    orderBy: { created_at: "desc" },
  });
}

export function getLocationById(id: string, businessId: string, userId: string) {
  return prisma.location.findFirst({
    where: {
      id,
      business_id: businessId,
      business: { employees: { some: { user_id: userId } } },
    },
  });
}

export async function createLocation(businessId: string, userId: string, input: CreateLocationInput) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, employees: { some: { user_id: userId } } },
    select: { id: true },
  });
  if (!business) return null;

  return prisma.location.create({
    data: {
      business_id: businessId,
      ...input,
    },
  });
}
