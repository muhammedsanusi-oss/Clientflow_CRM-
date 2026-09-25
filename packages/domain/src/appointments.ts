import { prisma } from "@project/db";
import { z } from "zod";

export const appointmentTimeSlots = Array.from({ length: 27 }, (_, index) => {
  const totalMinutes = 7 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}) as [string, ...string[]];

function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const calendarMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Enter a valid month");

export const createAppointmentInputSchema = z
  .object({
    customerId: z.string().trim().min(1).max(100),
    locationId: z.string().trim().min(1, "Choose a location").max(100),
    serviceId: z.string().trim().min(1, "Choose a service").max(100),
    date: z
      .string()
      .refine(isValidDate, "Enter a valid appointment date"),
    startTime: z.enum(appointmentTimeSlots, {
      errorMap: () => ({ message: "Choose an available time" }),
    }),
    details: z
      .string()
      .trim()
      .max(1_000, "Details must be 1,000 characters or fewer"),
  })
  .strict();

export type CreateAppointmentInput = z.infer<
  typeof createAppointmentInputSchema
>;

function wallClockDate(date: string, time: string) {
  return new Date(`${date}T${time}:00.000Z`);
}

export async function getAppointmentFormForUser(
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
      first_name: true,
      last_name: true,
      business: {
        select: {
          locations: {
            where: { is_active: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          },
          services: {
            where: { is_Active: true },
            select: {
              id: true,
              name: true,
              duration_minutes: true,
            },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });
}

export async function createAppointmentForUser(
  userId: string,
  input: CreateAppointmentInput,
) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findFirst({
      where: {
        user_id: userId,
        is_active: true,
      },
      select: {
        id: true,
        business_id: true,
      },
    });

    if (!employee) {
      return null;
    }

    const [customer, location, service] = await Promise.all([
      tx.customer.findFirst({
        where: {
          id: input.customerId,
          business_id: employee.business_id,
        },
        select: { id: true },
      }),
      tx.location.findFirst({
        where: {
          id: input.locationId,
          business_id: employee.business_id,
          is_active: true,
        },
        select: { id: true },
      }),
      tx.service.findFirst({
        where: {
          id: input.serviceId,
          business_id: employee.business_id,
          is_Active: true,
        },
        select: {
          id: true,
          duration_minutes: true,
          base_price: true,
        },
      }),
    ]);

    if (!customer || !location || !service) {
      return null;
    }

    const startTime = wallClockDate(input.date, input.startTime);
    const endTime = new Date(
      startTime.getTime() + service.duration_minutes * 60_000,
    );

    return tx.appointment.create({
      data: {
        customer_id: customer.id,
        employee_id: employee.id,
        location_id: location.id,
        appointment_date: wallClockDate(input.date, "00:00"),
        start_time: startTime,
        end_time: endTime,
        status_id: "SCHEDULED",
        notes: input.details,
        appointment_services: {
          create: {
            service_id: service.id,
            quantity: 1,
            price_at_booking: service.base_price,
          },
        },
      },
      select: {
        id: true,
        customer_id: true,
        employee_id: true,
        location_id: true,
        start_time: true,
        end_time: true,
        status_id: true,
        appointment_services: {
          select: {
            service_id: true,
            quantity: true,
            price_at_booking: true,
          },
        },
      },
    });
  });
}

export async function listAppointmentsForUserMonth(
  userId: string,
  month: string,
) {
  const parsedMonth = calendarMonthSchema.parse(month);
  const [year, monthNumber] = parsedMonth.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 1));
  const activeEmployeeInBusiness = {
    employees: {
      some: {
        user_id: userId,
        is_active: true,
      },
    },
  };

  return prisma.appointment.findMany({
    where: {
      start_time: {
        gte: monthStart,
        lt: monthEnd,
      },
      customer: { business: activeEmployeeInBusiness },
      employee: { business: activeEmployeeInBusiness },
      location: { business: activeEmployeeInBusiness },
      appointment_services: {
        some: {
          service: { business: activeEmployeeInBusiness },
        },
      },
    },
    select: {
      id: true,
      start_time: true,
      end_time: true,
      status_id: true,
      customer: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
      employee: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
      location: {
        select: { name: true },
      },
      appointment_services: {
        where: {
          service: { business: activeEmployeeInBusiness },
        },
        select: {
          service: {
            select: { name: true },
          },
        },
        take: 1,
      },
    },
    orderBy: [{ start_time: "asc" }, { id: "asc" }],
  });
}
