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

export const customerSearchInputSchema = z.string().trim().max(100).default("");

export const createCustomerNoteInputSchema = z
  .object({
    customerId: z.string().trim().min(1).max(100),
    content: z
      .string()
      .trim()
      .min(1, "Note is required")
      .max(2_000, "Note must be 2,000 characters or fewer"),
  })
  .strict();

export type CreateCustomerNoteInput = z.infer<
  typeof createCustomerNoteInputSchema
>;

export async function getCustomerBusinessForUser(userId: string, businessId?: string) {
  return prisma.business.findFirst({
    where: {
      ...(businessId !== undefined ? { id: businessId } : {}),
      employees: { some: { user_id: userId, is_active: true } },
    },
    select: { id: true, name: true },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });
}

export async function getCustomerCollectionForUser(userId: string, businessId?: string, query = "") {
  const search = customerSearchInputSchema.parse(query);
  // Starting at the active employee relation makes business tenancy part of
  // the database query instead of an application-side filtering step.
  const business = await getCustomerBusinessForUser(userId, businessId);
  if (!business) return null;
  const employee = await prisma.employee.findFirst({
    where: {
      user_id: userId,
      is_active: true,
      business_id: business.id,
    },
    select: {
      business: {
        select: {
          customers: {
            where: {
              AND: search.split(/\s+/).filter(Boolean).map((term) => ({
                OR: ["first_name", "last_name", "email", "phone_number"].map((field) => ({
                  [field]: { contains: term.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" as const },
                })),
              })),
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
            orderBy: [{ last_name: "asc" }, { first_name: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  return employee?.business.customers ?? null;
}

export async function listCustomersForUser(userId: string, businessId?: string, query = "") {
  return (await getCustomerCollectionForUser(userId, businessId, query)) ?? [];
}

export async function updateCustomerForUser(userId: string, customerId: string, input: CreateCustomerInput) {
  const values = createCustomerInputSchema.parse(input);
  // Membership is part of the UPDATE predicate, including when it changes
  // after the edit page was loaded. No ownership field is ever writable.
  const result = await prisma.customer.updateMany({
    where: {
      id: customerId,
      business: { employees: { some: { user_id: userId, is_active: true } } },
    },
    data: {
      first_name: values.firstName,
      last_name: values.lastName,
      phone_number: values.phoneNumber,
      email: values.email,
      address: values.address,
      preferred_contact_method: values.preferredContactMethod,
    },
  });
  return result.count === 1;
}

export async function createCustomerForUser(
  userId: string,
  input: CreateCustomerInput,
  businessId?: string,
) {
  // A selected business is only a hint; the session user's active membership
  // must authorize it before it becomes the new customer's business link.
  const business = await getCustomerBusinessForUser(userId, businessId);

  if (!business) {
    return null;
  }

  return prisma.customer.create({
    data: {
      business_id: business.id,
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

export async function getCustomerWithNotesForUser(
  userId: string,
  customerId: string,
) {
  return prisma.customer.findFirst({
    where: {
      id: customerId,
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
      business_id: true,
      business: { select: { name: true } },
      first_name: true,
      last_name: true,
      phone_number: true,
      email: true,
      address: true,
      preferred_contact_method: true,
      notes: {
        where: {
          employee: {
            business: {
              employees: {
                some: {
                  user_id: userId,
                  is_active: true,
                },
              },
            },
          },
        },
        select: {
          id: true,
          content: true,
          note_date: true,
          employee: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: [{ note_date: "desc" }, { id: "desc" }],
      },
    },
  });
}

export async function createCustomerNoteForUser(
  userId: string,
  input: CreateCustomerNoteInput,
) {
  // Resolve the author, verify customer tenancy, and write the note in one
  // transaction so none of those decisions can become stale between queries.
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        business: { customers: { some: { id: input.customerId } } },
      },
      select: {
        id: true,
        business_id: true,
      },
    });

    if (!employee) {
      return null;
    }

    const customer = await tx.customer.findFirst({
      where: {
        id: input.customerId,
        business_id: employee.business_id,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      return null;
    }

    return tx.note.create({
      data: {
        customer_id: customer.id,
        employee_id: employee.id,
        content: input.content,
      },
      select: {
        id: true,
        customer_id: true,
        employee_id: true,
        content: true,
        note_date: true,
      },
    });
  });
}
