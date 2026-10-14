import { prisma } from "@project/db";
import type { CreateTaskInput } from "../schemas/task";

const ownedCustomerWhere = (businessId: string, userId: string) => ({
  business_id: businessId,
  business: { employees: { some: { user_id: userId } } },
});

export function listTasks(businessId: string, userId: string) {
  return prisma.task.findMany({
    where: { customer: ownedCustomerWhere(businessId, userId) },
    include: { customer: true, employee: true },
    orderBy: { due_date: "asc" },
  });
}

export function getTask(id: string, businessId: string, userId: string) {
  return prisma.task.findFirst({
    where: { id, customer: ownedCustomerWhere(businessId, userId) },
    include: { customer: true, employee: true },
  });
}

export async function createTask(businessId: string, userId: string, input: CreateTaskInput) {
  const [customer, employee] = await Promise.all([
    prisma.customer.findFirst({ where: { id: input.customer_id, ...ownedCustomerWhere(businessId, userId) }, select: { id: true } }),
    prisma.employee.findFirst({
      where: { id: input.employee_id, business_id: businessId, business: { employees: { some: { user_id: userId } } } },
      select: { id: true },
    }),
  ]);
  if (!customer || !employee) return null;

  return prisma.task.create({
    data: { ...input, customer_id: customer.id, employee_id: employee.id },
    include: { customer: true, employee: true },
  });
}
