import { prisma } from "@project/db";
import type { CreateBusinessInput } from "../schemas/business";

export function listBusinesses(userId: string) {
  return prisma.business.findMany({
    where: {
      employees: {
        some: {
          user_id: userId,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });
}

export function getBusinessById(id: string, userId: string) {
  return prisma.business.findFirst({
    where: {
      id,
      employees: {
        some: {
          user_id: userId,
        },
      },
    },
  });
}

export async function createBusiness(userId: string, input: CreateBusinessInput) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: input.name, 
        email: input.email,
        phone_number: input.phone_number,
        business_type: input.business_type,
      },
    });

    const employee = await tx.employee.create({
      data: {
        business_id: business.id,
        user_id: userId,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone_number: input.phone_number,
        role: "OWNER",
        hire_date: new Date(),
      },
    });

    return { business, employee };
  });
}


