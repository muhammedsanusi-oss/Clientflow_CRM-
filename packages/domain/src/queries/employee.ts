/*
 * Code guide: packages/domain/src/queries/employee.ts
 * Database query module for employee. Uses the shared Prisma client and business/user predicates; HTTP
 * callers supply session-derived identity and perform route-level access checks. Follow the functions below
 * for the exact membership/role filters used.
 */
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
/*
 * Import connection: ../schemas/employee -> packages/domain/src/schemas/employee.ts.
 * Type CreateEmployeeInput: Type contract used to check callers at compile time; it does not fetch or modify
 * data.
 */
import type { CreateEmployeeInput } from "../schemas/employee";
/*
 * Import connection: ../errors -> packages/domain/src/errors.ts.
 * DomainError: Deliberate safe domain failure carrying an allowed public code/message.
 */
import { DomainError } from "../errors";
/*
 * Import connection: ./membership -> packages/domain/src/queries/membership.ts.
 * requireMembership: Checks an active user membership in the selected business within the supplied
 * transaction and returns it, or raises NOT_FOUND.
 */
import { requireMembership } from "./membership";

/*
 * Reads employees using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export async function listEmployees(businessId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await requireMembership(tx, businessId, userId);
    return tx.employee.findMany({
      where: { business_id: businessId, is_active: true },
      orderBy: { created_at: "desc" },
    });
  });
}

/*
 * Reads employee using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export async function getEmployee(id: string, businessId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await requireMembership(tx, businessId, userId);
    return tx.employee.findFirst({
      where: { id, business_id: businessId, is_active: true },
    });
  });
}

/*
 * Checks owner/manager authority, creates or reuses a legacy username account for the staff email, and
 * inserts its business membership. It does not issue a login password.
 */
export function createEmployee(businessId: string, userId: string, input: CreateEmployeeInput) {
  return prisma.$transaction(async (tx) => {
    const membership = await requireMembership(tx, businessId, userId);
    // Check tenancy before role so outsiders cannot discover a business.
    if (membership.role === "STAFF") throw new DomainError("FORBIDDEN", "Only owners and managers can add employees");
    // Validation normalizes this email. Reuse the employee's account across
    // businesses; the caller's account must never become the new employee.
    // Keeping the upsert inside the transaction prevents orphan accounts
    // when a duplicate membership makes the employee insert fail.
    const employeeUser = await tx.user.upsert({
      where: { username: input.email }, update: {}, create: { username: input.email },
    });
    return tx.employee.create({
      data: {
        business_id: businessId,
        user_id: employeeUser.id,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone_number: input.phone_number,
        role: input.role,
        hire_date: new Date(),
      },
    });
  });
}
