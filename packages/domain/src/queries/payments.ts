/*
 * Code guide: packages/domain/src/queries/payments.ts
 * Database query module for payments. Uses the shared Prisma client and business/user predicates; HTTP
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
 * Import connection: ../schemas/payment -> packages/domain/src/schemas/payment.ts.
 * Type CreatePaymentInput: Type contract used to check callers at compile time; it does not fetch or modify
 * data.
 */
import type { CreatePaymentInput } from "../schemas/payment";

// Reusable relationship predicate connecting this resource to the supplied business and user membership. The
// route may perform additional active-access checks.
const ownedAppointmentWhere = (businessId: string, userId: string) => ({
  customer: {
    business_id: businessId,
    business: { employees: { some: { user_id: userId } } },
  },
});

/*
 * Reads payments using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export function listPayments(appointmentId: string, businessId: string, userId: string) {
  return prisma.payment.findMany({
    where: { appointment_id: appointmentId, appointment: ownedAppointmentWhere(businessId, userId) },
    orderBy: { payment_date: "desc" },
  });
}

/*
 * Reads payment using the business/user scope in the query below. Callers handle the absent-resource result.
 */
export function getPayment(id: string, appointmentId: string, businessId: string, userId: string) {
  return prisma.payment.findFirst({
    where: {
      id,
      appointment_id: appointmentId,
      appointment: ownedAppointmentWhere(businessId, userId),
    },
  });
}

/*
 * Records method/status/reference under an authorized appointment. This helper does not contact a payment
 * processor.
 */
export async function createPayment(appointmentId: string, businessId: string, userId: string, input: CreatePaymentInput) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, ...ownedAppointmentWhere(businessId, userId) },
    select: { id: true },
  });
  if (!appointment) return null;

  return prisma.payment.create({
    data: {
      appointment_id: appointment.id,
      payment_method: input.payment_method,
      status: input.status,
      transaction_reference: input.transaction_reference,
    },
  });
}
