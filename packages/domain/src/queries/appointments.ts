import { crmEntitlementWhere } from "../subscription-access";
/*
 * Code guide: packages/domain/src/queries/appointments.ts
 * Database query module for appointments. Uses the shared Prisma client and business/user predicates; HTTP
 * callers supply session-derived identity and perform route-level access checks. Follow the functions below
 * for the exact membership/role filters used.
 */
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
import { DomainError } from "../errors";
import { acquireBookingLock } from "../booking";
/*
 * Import connection: ../schemas/appointment -> packages/domain/src/schemas/appointment.ts.
 * Type CreateAppointmentInput: Type contract used to check callers at compile time; it does not fetch or
 * modify data.
 */
import type { CreateAppointmentInput } from "../schemas/appointment";

// Reusable relationship predicate connecting this resource to the supplied business and user membership. The
// route may perform additional active-access checks.
const ownedCustomerWhere = (businessId: string, userId: string) => ({
  business_id: businessId,
  business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } },
});

/*
 * Reads appointments using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export function listAppointments(businessId: string, userId: string) {
  return prisma.appointment.findMany({
    where: { customer: ownedCustomerWhere(businessId, userId) },
    include: { customer: true, employee: true, location: true, appointment_services: { include: { service: true } } },
    orderBy: { appointment_date: "desc" },
  });
}

/*
 * Reads appointment using the business/user scope in the query below. Callers handle the absent-resource
 * result.
 */
export function getAppointment(id: string, businessId: string, userId: string) {
  return prisma.appointment.findFirst({
    where: { id, customer: ownedCustomerWhere(businessId, userId) },
    include: { customer: true, employee: true, location: true, appointment_services: { include: { service: true } }, payments: true },
  });
}

/*
 * Business API appointment write: verifies related records and snapshots service prices while creating
 * service lines atomically.
 */
export async function createAppointment(businessId: string, userId: string, input: CreateAppointmentInput) {
  return prisma.$transaction(async (tx) => {
    const [customer, employee, location, services] = await Promise.all([
      tx.customer.findFirst({ where: { id: input.customer_id, ...ownedCustomerWhere(businessId, userId) }, select: { id: true } }),
      tx.employee.findFirst({
        where: { id: input.employee_id, business_id: businessId, business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } } },
        select: { id: true },
      }),
      tx.location.findFirst({
        where: { id: input.location_id, business_id: businessId, business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } } },
        select: { id: true },
      }),
      tx.service.findMany({
        where: {
          id: { in: input.services.map((item) => item.service_id) },
          business_id: businessId,
          business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, is_active: true } } },
        },
        select: { id: true, name: true, duration_minutes: true, base_price: true },
      }),
    ]);

    if (!customer || !employee || !location || services.length !== input.services.length) return null;
    const serviceById = new Map(services.map((service) => [service.id, service]));
    if (input.status !== "CANCELED") {
      await acquireBookingLock(tx, businessId);
      const conflictingAppointment = await tx.appointment.findFirst({
        where: {
          location: { business_id: businessId },
          status: { not: "CANCELED" },
          start_time: { lt: input.end_time },
          end_time: { gt: input.start_time },
        },
        select: { id: true },
      });
      if (conflictingAppointment) throw new DomainError("CONFLICT", "That time is already booked.");
    }

    return tx.appointment.create({
      data: {
        customer_id: customer.id,
        employee_id: employee.id,
        location_id: location.id,
        appointment_date: input.appointment_date,
        start_time: input.start_time,
        end_time: input.end_time,
        status: input.status,
        notes: input.notes,
        appointment_services: {
          create: input.services.map(({ service_id, quantity }) => ({
            service_id,
            quantity,
            price_at_booking: serviceById.get(service_id)!.base_price,
            service_name_at_booking: serviceById.get(service_id)!.name,
            duration_minutes_at_booking: serviceById.get(service_id)!.duration_minutes,
          })),
        },
      },
      include: { customer: true, employee: true, location: true, appointment_services: { include: { service: true } } },
    });
  });
}
