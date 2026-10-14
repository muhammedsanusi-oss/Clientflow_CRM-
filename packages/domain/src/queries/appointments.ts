import { prisma } from "@project/db";
import type { CreateAppointmentInput } from "../schemas/appointment";

const ownedCustomerWhere = (businessId: string, userId: string) => ({
  business_id: businessId,
  business: { employees: { some: { user_id: userId } } },
});

export function listAppointments(businessId: string, userId: string) {
  return prisma.appointment.findMany({
    where: { customer: ownedCustomerWhere(businessId, userId) },
    include: { customer: true, employee: true, location: true, appointment_services: { include: { service: true } } },
    orderBy: { appointment_date: "desc" },
  });
}

export function getAppointment(id: string, businessId: string, userId: string) {
  return prisma.appointment.findFirst({
    where: { id, customer: ownedCustomerWhere(businessId, userId) },
    include: { customer: true, employee: true, location: true, appointment_services: { include: { service: true } }, payments: true },
  });
}

export async function createAppointment(businessId: string, userId: string, input: CreateAppointmentInput) {
  return prisma.$transaction(async (tx) => {
    const [customer, employee, location, services] = await Promise.all([
      tx.customer.findFirst({ where: { id: input.customer_id, ...ownedCustomerWhere(businessId, userId) }, select: { id: true } }),
      tx.employee.findFirst({
        where: { id: input.employee_id, business_id: businessId, business: { employees: { some: { user_id: userId } } } },
        select: { id: true },
      }),
      tx.location.findFirst({
        where: { id: input.location_id, business_id: businessId, business: { employees: { some: { user_id: userId } } } },
        select: { id: true },
      }),
      tx.service.findMany({
        where: {
          id: { in: input.services.map((item) => item.service_id) },
          business_id: businessId,
          business: { employees: { some: { user_id: userId } } },
        },
        select: { id: true, base_price: true },
      }),
    ]);

    if (!customer || !employee || !location || services.length !== input.services.length) return null;
    const prices = new Map(services.map((service) => [service.id, service.base_price]));

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
            price_at_booking: prices.get(service_id)!,
          })),
        },
      },
      include: { customer: true, employee: true, location: true, appointment_services: { include: { service: true } } },
    });
  });
}
