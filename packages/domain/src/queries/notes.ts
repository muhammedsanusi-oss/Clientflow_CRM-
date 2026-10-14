import { prisma } from "@project/db";
import type { CreateNoteInput } from "../schemas/note";

const ownedCustomerWhere = (businessId: string, userId: string) => ({
  business_id: businessId,
  business: { employees: { some: { user_id: userId } } },
});

export function listNotes(customerId: string, businessId: string, userId: string) {
  return prisma.note.findMany({
    where: { customer_id: customerId, customer: ownedCustomerWhere(businessId, userId) },
    include: { employee: true },
    orderBy: { note_date: "desc" },
  });
}

export function getNote(id: string, customerId: string, businessId: string, userId: string) {
  return prisma.note.findFirst({
    where: {
      id,
      customer_id: customerId,
      customer: ownedCustomerWhere(businessId, userId),
    },
    include: { employee: true },
  });
}

export async function createNote(customerId: string, businessId: string, userId: string, input: CreateNoteInput) {
  const [customer, employee] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, ...ownedCustomerWhere(businessId, userId) }, select: { id: true } }),
    prisma.employee.findFirst({
      where: { business_id: businessId, user_id: userId },
      select: { id: true },
    }),
  ]);
  if (!customer || !employee) return null;

  return prisma.note.create({
    data: {
      customer_id: customer.id,
      employee_id: employee.id,
      content: input.content,
      ...(input.note_date ? { note_date: input.note_date } : {}),
    },
    include: { employee: true },
  });
}
