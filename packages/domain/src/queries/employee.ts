import { prisma } from "@project/db";
import type { CreateEmployeeInput } from "../schemas/employee";
import { DomainError } from "../errors";
import { requireMembership } from "./membership";

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
