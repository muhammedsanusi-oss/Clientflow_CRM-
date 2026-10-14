// Customer queries use a business scope. There are no customer HTTP routes
// yet; future callers must verify session-derived membership before use.
import { prisma } from "@project/db";
import type { CreateCustomerInput } from "../schemas/customer";

export function listCustomers(business_id: string, userId: string) {
  return prisma.customer.findMany({
    where: { business_id, business: { employees: { some: { user_id: userId } } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getCustomer(id: string, business_id: string, userId: string) {
  return prisma.customer.findFirst({
    where: { id, business_id, business: { employees: { some: { user_id: userId } } } },
  });
}

export async function createCustomer(business_id: string, userId: string, input: CreateCustomerInput) {
  const business = await prisma.business.findFirst({
    where: { id: business_id, employees: { some: { user_id: userId } } },
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
