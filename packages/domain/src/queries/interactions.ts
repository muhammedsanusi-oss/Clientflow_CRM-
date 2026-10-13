import { prisma } from "@project/db";
import type { CreateInteractionInput } from "../schemas/interaction";

const ownedCustomerWhere = (businessId: string, userId: string) => ({
  business_id: businessId,
  business: { employees: { some: { user_id: userId } } },
});

export function listInteractions(customerId: string, businessId: string, userId: string) {
  return prisma.interaction.findMany({
    where: { customer_id: customerId, customer: ownedCustomerWhere(businessId, userId) },
    include: { employee: true },
    orderBy: { interaction_date: "desc" },
  });
}

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
