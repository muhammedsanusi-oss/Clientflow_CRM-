import { prisma } from "@project/db";
import type { CreateEmployeeInput } from "../schemas/employee";

export function listEmployees(businessId: string, userId: string) {
  return prisma.employee.findMany({
    where: {
      business_id: businessId,
      business: { employees: { some: { user_id: userId } } },
    },
    orderBy: { created_at: "desc" },
  });
}

export function getEmployee(id: string, businessId: string, userId: string) {
  return prisma.employee.findFirst({
    where: {
      id,
      business_id: businessId,
      business: { employees: { some: { user_id: userId } } },
    },
  });
}

export async function createEmployee(businessId: string, userId: string, input: CreateEmployeeInput) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, employees: { some: { user_id: userId } } },
    select: { id: true },
  });
  if (!business) return null;

  const targetUser = await prisma.user.findUnique({
    where: { username: input.username },
    select: { id: true },
  });
  if (!targetUser) return null;

  return prisma.employee.create({
    data: {
      business_id: businessId,
      user_id: targetUser.id,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone_number: input.phone_number,
      role: input.role,
      hire_date: new Date(),
    },
  });
}
