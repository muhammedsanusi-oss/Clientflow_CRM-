import { prisma } from "@project/db";
import type { CreateServiceInput } from "../schemas/service";

export function listServices(businessId: string, userId: string) {
  return prisma.service.findMany({
    where: { business_id: businessId, business: { employees: { some: { user_id: userId } } } },
    orderBy: { name: "asc" },
  });
}

export function getService(id: string, businessId: string, userId: string) {
  return prisma.service.findFirst({
    where: { id, business_id: businessId, business: { employees: { some: { user_id: userId } } } },
  });
}

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
