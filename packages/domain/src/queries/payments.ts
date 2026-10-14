import { prisma } from "@project/db";
import type { CreatePaymentInput } from "../schemas/payment";

const ownedAppointmentWhere = (businessId: string, userId: string) => ({
  customer: {
    business_id: businessId,
    business: { employees: { some: { user_id: userId } } },
  },
});

export function listPayments(appointmentId: string, businessId: string, userId: string) {
  return prisma.payment.findMany({
    where: { appointment_id: appointmentId, appointment: ownedAppointmentWhere(businessId, userId) },
    orderBy: { payment_date: "desc" },
  });
}

export function getPayment(id: string, appointmentId: string, businessId: string, userId: string) {
  return prisma.payment.findFirst({
    where: {
      id,
      appointment_id: appointmentId,
      appointment: ownedAppointmentWhere(businessId, userId),
    },
  });
}

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
