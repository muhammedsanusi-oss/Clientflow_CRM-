import { prisma } from "@project/db";
import type { CreateLocationInput } from "../schemas/location";



export function listLocations(businessId: string) {
  return prisma.location.findMany({
    where: {
      business_id: businessId,
    },
    orderBy: { created_at: "desc" },
  });
}

export function getLocationById(id: string, businessId: string) {
  return prisma.location.findFirst({
    where: {
      id,
      business_id: businessId,
    },
  });
}

export async function createLocation(businessId: string, input: CreateLocationInput) {
  return prisma.location.create({
    data: {
      business_id: businessId,
      ...input,
    },
  });
}
