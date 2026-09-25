import { prisma } from "@project/db";
import { z } from "zod";

export const createCustomerInputSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    phoneNumber: z.string().trim().min(1, "Phone number is required").max(30),
    email: z.string().trim().email("Enter a valid email").max(254),
    address: z.string().trim().min(1, "Address is required").max(500),
    preferredContactMethod: z.enum(["PHONE", "EMAIL", "TEXT"]),
  })
  .strict();

export type CreateCustomerInput = z.infer<
  typeof createCustomerInputSchema
>;
export async function listCustomersForUser(userId: string) {
  return prisma.customer.findMany({
    where: {
      business: {
        employees: {
          some: {
            user_id: userId,
            is_active: true,
          },
        },
      },
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      email: true,
      address: true,
      preferred_contact_method: true,
    },
    orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
  });
}

export async function createCustomerForUser(
  userId: string,
  input: CreateCustomerInput,
) {
  const employee = await prisma.employee.findFirst({
    where: {
      user_id: userId,
      is_active: true,
    },
    select: {
      business_id: true,
    },
  });

  if (!employee) {
    return null;
  }

  return prisma.customer.create({
    data: {
      business_id: employee.business_id,
      first_name: input.firstName,
      last_name: input.lastName,
      phone_number: input.phoneNumber,
      email: input.email,
      address: input.address,
      preferred_contact_method: input.preferredContactMethod,
    },
    select: {
      id: true,
      business_id: true,
      first_name: true,
      last_name: true,
      phone_number: true,
      email: true,
      address: true,
      preferred_contact_method: true,
    },
  });
}