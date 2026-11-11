import { crmEntitlementWhere } from "../subscription-access";
/*
 * Code guide: packages/domain/src/queries/business.ts
 * Database query module for business. Uses the shared Prisma client and business/user predicates; HTTP
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
 * Import connection: ../schemas/business -> packages/domain/src/schemas/business.ts.
 * Type CreateBusinessInput: Type contract used to check callers at compile time; it does not fetch or modify
 * data.
 */
import type { CreateBusinessInput } from "../schemas/business";

/*
 * Reads businesses using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export function listBusinesses(userId: string) {
  return prisma.business.findMany({
    where: {
      ...crmEntitlementWhere(),
      employees: {
        some: {
          user_id: userId,
          is_active: true,
        },
      },
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });
}

/*
 * Reads one business through the supplied user active membership; it is also the API access precheck.
 */
export function getBusinessById(id: string, userId: string) {
  return prisma.business.findFirst({
    where: {
      ...crmEntitlementWhere(),
      id,
      employees: {
        some: {
          user_id: userId,
          is_active: true,
        },
      },
    },
  });
}

/*
 * Older transactional business-plus-owner-membership helper. Current developer onboarding uses
 * provisionBusiness instead.
 */
export async function createBusiness(userId: string, input: CreateBusinessInput) {
  // The owner membership grants access to the new business. Commit both
  // records together so a failed owner write cannot leave an orphan business.
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


