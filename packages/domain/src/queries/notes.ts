/*
 * Code guide: packages/domain/src/queries/notes.ts
 * Database query module for notes. Uses the shared Prisma client and business/user predicates; HTTP callers
 * supply session-derived identity and perform route-level access checks. Follow the functions below for the
 * exact membership/role filters used.
 */
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
/*
 * Import connection: ../schemas/note -> packages/domain/src/schemas/note.ts.
 * Type CreateNoteInput: Type contract used to check callers at compile time; it does not fetch or modify
 * data.
 */
import type { CreateNoteInput } from "../schemas/note";

// Reusable relationship predicate connecting this resource to the supplied business and user membership. The
// route may perform additional active-access checks.
const ownedCustomerWhere = (businessId: string, userId: string) => ({
  business_id: businessId,
  business: { employees: { some: { user_id: userId } } },
});

/*
 * Reads notes using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export function listNotes(customerId: string, businessId: string, userId: string) {
  return prisma.note.findMany({
    where: { customer_id: customerId, customer: ownedCustomerWhere(businessId, userId) },
    include: { employee: true },
    orderBy: { note_date: "desc" },
  });
}

/*
 * Lists notes and their customer/author display fields only when the user has an active membership in the
 * requested business.
 */
export function listBusinessNotesForUser(userId: string, businessId: string) {
  return prisma.note.findMany({
    where: {
      customer: {
        business_id: businessId,
        business: {
          employees: { some: { user_id: userId, is_active: true } },
        },
      },
    },
    select: {
      id: true,
      content: true,
      note_date: true,
      customer: {
        select: { id: true, first_name: true, last_name: true },
      },
      employee: {
        select: { first_name: true, last_name: true },
      },
    },
    orderBy: [{ note_date: "desc" }, { id: "desc" }],
  });
}

/*
 * Reads note using the business/user scope in the query below. Callers handle the absent-resource result.
 */
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

/*
 * Creates an API note only after finding the customer and the signed-in user membership; the server chooses
 * the author.
 */
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
