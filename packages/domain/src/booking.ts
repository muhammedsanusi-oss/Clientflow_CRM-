import { crmEntitlementWhere } from "./subscription-access";
import { createHash } from "node:crypto";
import { prisma, type Prisma } from "@project/db";
import { z } from "zod";
import { DomainError } from "./errors";

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const bookingDateSchema = z.string().refine((value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");

const hoursIntervalFields = {
  businessId: z.string().trim().min(1).max(100),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: clockTimeSchema,
  endTime: clockTimeSchema,
};

const validateInterval = <T extends { startTime: string; endTime: string }>(schema: z.ZodType<T>) =>
  schema.refine((value) => value.startTime < value.endTime, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

export const hoursIntervalInputSchema = validateInterval(z.object(hoursIntervalFields).strict());

export const staffNameInputSchema = z.object({
  businessId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
}).strict();

export const staffHoursIntervalInputSchema = validateInterval(z.object({
  ...hoursIntervalFields,
  staffId: z.string().trim().min(1).max(100),
}).strict());

export const ownerServiceInputSchema = z.object({
  businessId: z.string().trim().min(1).max(100),
  serviceId: z.string().trim().max(100).optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(""),
  durationMinutes: z.coerce.number().int().min(15).max(720),
}).strict();

export const publicBookingInputSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(1).max(30),
  serviceId: z.string().trim().min(1).max(100),
  locationId: z.string().trim().min(1).max(100),
  staffId: z.string().trim().max(100).optional().default(""),
  date: bookingDateSchema,
  startTime: clockTimeSchema,
  website: z.string().max(200).optional().default(""),
}).strict();

export type PublicBookingInput = z.infer<typeof publicBookingInputSchema>;

const ownerMembership = (userId: string) => ({
  ...crmEntitlementWhere(),
  employees: { some: { user_id: userId, is_active: true, role: "OWNER" as const } },
});

function intervalsOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}

export async function acquireBookingLock(tx: Prisma.TransactionClient, businessId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking:${businessId}`}))::text AS locked`;
}

async function assertOwnerBusiness(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ...ownerMembership(userId) },
    select: { id: true },
  });
  if (!business) throw new DomainError("NOT_FOUND", "Business not found");
  return business;
}

export async function getOwnerBookingSettings(userId: string, businessId: string) {
  return prisma.business.findFirst({
    where: { id: businessId, ...ownerMembership(userId) },
    select: {
      id: true,
      name: true,
      websiteTemplate: true,
      demoSubscription: true,
      hoursIntervals: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
      },
      bookingStaff: {
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          isActive: true,
          hours: {
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
          },
        },
      },
      services: {
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          duration_minutes: true,
          base_price: true,
          is_Active: true,
        },
      },
    },
  });
}

export async function addBusinessHoursInterval(userId: string, input: z.infer<typeof hoursIntervalInputSchema>) {
  await assertOwnerBusiness(userId, input.businessId);
  return prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, input.businessId);
    const intervals = await tx.businessHoursInterval.findMany({
      where: { businessId: input.businessId, dayOfWeek: input.dayOfWeek },
      select: { startTime: true, endTime: true },
    });
    if (intervals.some((interval) => intervalsOverlap(input.startTime, input.endTime, interval.startTime, interval.endTime))) {
      throw new DomainError("CONFLICT", "Business hours cannot overlap.");
    }
    return tx.businessHoursInterval.create({
      data: {
        businessId: input.businessId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });
  });
}

export async function deleteBusinessHoursInterval(userId: string, businessId: string, intervalId: string) {
  await assertOwnerBusiness(userId, businessId);
  const result = await prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, businessId);
    return tx.businessHoursInterval.deleteMany({ where: { id: intervalId, businessId } });
  });
  if (!result.count) throw new DomainError("NOT_FOUND", "Business hours not found");
}

export async function addBookingStaff(userId: string, input: z.infer<typeof staffNameInputSchema>) {
  await assertOwnerBusiness(userId, input.businessId);
  return prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, input.businessId);
    return tx.bookingStaff.create({ data: { businessId: input.businessId, name: input.name } });
  });
}

export async function updateBookingStaff(userId: string, businessId: string, staffId: string, name: string, isActive: boolean) {
  await assertOwnerBusiness(userId, businessId);
  const result = await prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, businessId);
    return tx.bookingStaff.updateMany({ where: { id: staffId, businessId }, data: { name, isActive } });
  });
  if (!result.count) throw new DomainError("NOT_FOUND", "Staff member not found");
}

export async function addBookingStaffHours(userId: string, input: z.infer<typeof staffHoursIntervalInputSchema>) {
  await assertOwnerBusiness(userId, input.businessId);
  return prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, input.businessId);
    const [staff, businessIntervals, staffIntervals] = await Promise.all([
      tx.bookingStaff.findFirst({
        where: { id: input.staffId, businessId: input.businessId, isActive: true },
        select: { id: true },
      }),
      tx.businessHoursInterval.findMany({
        where: { businessId: input.businessId, dayOfWeek: input.dayOfWeek },
        select: { startTime: true, endTime: true },
      }),
      tx.bookingStaffHours.findMany({
        where: { bookingStaffId: input.staffId, dayOfWeek: input.dayOfWeek },
        select: { startTime: true, endTime: true },
      }),
    ]);
    if (!staff) throw new DomainError("NOT_FOUND", "Staff member not found");
    if (!businessIntervals.some((interval) => interval.startTime <= input.startTime && interval.endTime >= input.endTime)) {
      throw new DomainError("CONFLICT", "Staff availability must fit within business hours.");
    }
    if (staffIntervals.some((interval) => intervalsOverlap(input.startTime, input.endTime, interval.startTime, interval.endTime))) {
      throw new DomainError("CONFLICT", "Staff availability cannot overlap.");
    }
    return tx.bookingStaffHours.create({
      data: {
        bookingStaffId: input.staffId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });
  });
}

export async function deleteBookingStaffHours(userId: string, businessId: string, staffId: string, intervalId: string) {
  await assertOwnerBusiness(userId, businessId);
  const result = await prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, businessId);
    return tx.bookingStaffHours.deleteMany({
      where: { id: intervalId, bookingStaffId: staffId, bookingStaff: { businessId } },
    });
  });
  if (!result.count) throw new DomainError("NOT_FOUND", "Staff availability not found");
}

export async function saveOwnerService(userId: string, input: z.infer<typeof ownerServiceInputSchema>) {
  await assertOwnerBusiness(userId, input.businessId);
  const data = {
    name: input.name,
    description: input.description,
    duration_minutes: input.durationMinutes,
  };
  if (input.serviceId) {
    const result = await prisma.$transaction(async (tx) => {
      await acquireBookingLock(tx, input.businessId);
      return tx.service.updateMany({
        where: { id: input.serviceId, business_id: input.businessId },
        data,
      });
    });
    if (!result.count) throw new DomainError("NOT_FOUND", "Service not found");
    return;
  }
  return prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, input.businessId);
    return tx.service.create({
      data: {
        ...data,
        business_id: input.businessId,
        category: "General",
        base_price: 0,
        is_Active: true,
      },
    });
  });
}

export async function setOwnerServiceActive(userId: string, businessId: string, serviceId: string, isActive: boolean) {
  await assertOwnerBusiness(userId, businessId);
  const result = await prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, businessId);
    return tx.service.updateMany({
      where: { id: serviceId, business_id: businessId },
      data: { is_Active: isActive },
    });
  });
  if (!result.count) throw new DomainError("NOT_FOUND", "Service not found");
}

export async function getPublicBookingOptions(businessId: string) {
  const business = await prisma.business.findFirst({
    where: { ...crmEntitlementWhere(), id: businessId, websiteTemplate: { not: null } },
    select: {
      id: true,
      name: true,
      phone_number: true,
      email: true,
      publicAddress: true,
      websiteTemplate: true,
      services: {
        where: { is_Active: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { id: true, name: true, description: true, duration_minutes: true },
      },
      locations: {
        where: { is_active: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { id: true, name: true, address: true },
      },
      bookingStaff: {
        where: { isActive: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { id: true, name: true },
      },
    },
  });
  if (!business) return null;
  return business;
}

type BookingReader = Pick<typeof prisma, "businessHoursInterval" | "bookingStaff" | "service" | "location" | "appointment">;

async function availableSlots(
  reader: BookingReader,
  businessId: string,
  date: string,
  serviceId: string,
  locationId: string,
  requestedStaffId: string,
) {
  const business = await reader.businessHoursInterval.findMany({
    where: { businessId, dayOfWeek: new Date(`${date}T00:00:00.000Z`).getUTCDay() },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });
  const service = await reader.service.findFirst({
    where: { id: serviceId, business_id: businessId, is_Active: true },
    select: { id: true, duration_minutes: true },
  });
  const location = await reader.location.findFirst({
    where: { id: locationId, business_id: businessId, is_active: true },
    select: { id: true },
  });
  const staff = await reader.bookingStaff.findMany({
    where: {
      businessId,
      isActive: true,
      ...(requestedStaffId ? { id: requestedStaffId } : {}),
    },
    select: {
      id: true,
      hours: {
        where: { dayOfWeek: new Date(`${date}T00:00:00.000Z`).getUTCDay() },
        select: { startTime: true, endTime: true },
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  if (!service || !location || business.length === 0 || (requestedStaffId && staff.length === 0)) return [];

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const appointments = await reader.appointment.findMany({
    where: {
      location: { business_id: businessId },
      start_time: { lt: dayEnd },
      end_time: { gt: dayStart },
      status: { not: "CANCELED" },
    },
    select: { start_time: true, end_time: true, bookingStaffId: true },
  });
  const intervalHours = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const slots = new Set<string>();

  for (const interval of business) {
    const startMinutes = intervalHours(interval.startTime);
    const endMinutes = intervalHours(interval.endTime);
    for (let start = Math.ceil(startMinutes / 30) * 30; start + service.duration_minutes <= endMinutes; start += 30) {
      const startTime = `${Math.floor(start / 60).toString().padStart(2, "0")}:${(start % 60).toString().padStart(2, "0")}`;
      const proposedStart = new Date(`${date}T${startTime}:00.000Z`);
      const proposedEnd = new Date(proposedStart.getTime() + service.duration_minutes * 60_000);
      const candidates = staff.length
        ? staff.filter((member) => member.hours.some((hours) => hours.startTime <= startTime
          && intervalHours(hours.endTime) >= start + service.duration_minutes))
        : [null];
      if (candidates.some((member) => appointments.every((appointment) =>
        appointment.end_time <= proposedStart
        || appointment.start_time >= proposedEnd
        || (member !== null && appointment.bookingStaffId !== null && appointment.bookingStaffId !== member.id),
      ))) slots.add(startTime);
    }
  }
  return [...slots].sort();
}

export async function getPublicBookingAvailability(
  businessId: string,
  date: string,
  serviceId: string,
  locationId: string,
  staffId = "",
) {
  const parsedDate = bookingDateSchema.safeParse(date);
  if (!parsedDate.success || date < new Date().toISOString().slice(0, 10)) return [];
  if (!await getPublicBookingOptions(businessId)) return null;
  const slots = await availableSlots(prisma, businessId, date, serviceId, locationId, staffId);
  if (date === new Date().toISOString().slice(0, 10)) {
    const nowMinutes = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
    return slots.filter((time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) > nowMinutes);
  }
  return slots;
}

export async function listAppointmentsForOwnerBusinessMonth(
  userId: string,
  businessId: string,
  month: string,
) {
  await assertOwnerBusiness(userId, businessId);
  const parsedMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(month);
  const [year, monthNumber] = parsedMonth.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 1));
  return prisma.appointment.findMany({
    where: {
      start_time: { gte: monthStart, lt: monthEnd },
      location: { business_id: businessId },
      customer: { business_id: businessId },
      appointment_services: { some: { service: { business_id: businessId } } },
    },
    select: {
      id: true,
      start_time: true,
      end_time: true,
      status: true,
      customer: { select: { id: true, first_name: true, last_name: true } },
      employee: { select: { first_name: true, last_name: true } },
      bookingStaff: { select: { name: true } },
      location: { select: { name: true } },
      appointment_services: {
        where: { service: { business_id: businessId } },
        select: {
          service_name_at_booking: true,
          duration_minutes_at_booking: true,
          service: { select: { name: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ start_time: "asc" }, { id: "asc" }],
  });
}

function wallClock(date: string, time: string) {
  return new Date(`${date}T${time}:00.000Z`);
}

export async function createPublicBooking(businessId: string, input: PublicBookingInput) {
  const options = await getPublicBookingOptions(businessId);
  if (!options) throw new DomainError("NOT_FOUND", "Booking page not found");
  if (input.website) return { accepted: true as const };

  const throttleKey = createHash("sha256")
    .update(`public-booking:${businessId}:${input.email}`)
    .digest("hex");

  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 60 * 1000);
  const attempts = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthThrottle" ("key", "attempts", "windowStart")
    VALUES (${throttleKey}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN 1 ELSE "AuthThrottle"."attempts" + 1 END,
      "windowStart" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN ${now} ELSE "AuthThrottle"."windowStart" END
    RETURNING "attempts"`;
  if (attempts[0].attempts > 10) throw new DomainError("RATE_LIMITED", "Too many booking attempts. Try again later.");

  return prisma.$transaction(async (tx) => {
    await acquireBookingLock(tx, businessId);

    const [service, location, matchingCustomers] = await Promise.all([
      tx.service.findFirst({
        where: { id: input.serviceId, business_id: businessId, is_Active: true },
        select: { id: true, name: true, duration_minutes: true, base_price: true },
      }),
      tx.location.findFirst({
        where: { id: input.locationId, business_id: businessId, is_active: true },
        select: { id: true },
      }),
      tx.customer.findMany({
        where: {
          business_id: businessId,
          OR: [
            { email: { equals: input.email, mode: "insensitive" } },
            { phone_number: input.phone },
          ],
        },
        select: { id: true },
        take: 2,
      }),
    ]);
    if (!service || !location) throw new DomainError("NOT_FOUND", "Booking choices are no longer available.");
    if (matchingCustomers.length > 1) {
      throw new DomainError("CONFLICT", "The contact details match different customer records.");
    }
    if (input.date < new Date().toISOString().slice(0, 10)) throw new DomainError("CONFLICT", "Choose a future date.");
    if (input.date === new Date().toISOString().slice(0, 10)) {
      const currentTime = new Date();
      const startMinutes = Number(input.startTime.slice(0, 2)) * 60 + Number(input.startTime.slice(3, 5));
      if (startMinutes <= currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes()) {
        throw new DomainError("CONFLICT", "Choose a future time.");
      }
    }

    const dateSlots = await availableSlots(
      tx,
      businessId,
      input.date,
      input.serviceId,
      input.locationId,
      input.staffId,
    );
    if (!dateSlots.includes(input.startTime)) throw new DomainError("CONFLICT", "That time is no longer available.");

    const dayOfWeek = new Date(`${input.date}T00:00:00.000Z`).getUTCDay();
    const hasStaff = await tx.bookingStaff.count({ where: { businessId, isActive: true } });
    let assignedStaffId: string | null = null;
    if (hasStaff) {
      const candidates = await tx.bookingStaff.findMany({
        where: {
          businessId,
          isActive: true,
          ...(input.staffId ? { id: input.staffId } : {}),
        },
        select: {
          id: true,
          hours: {
            where: { dayOfWeek },
            select: { startTime: true, endTime: true },
          },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });
      const startMinutes = Number(input.startTime.slice(0, 2)) * 60 + Number(input.startTime.slice(3, 5));
      const endMinutes = startMinutes + service.duration_minutes;
      const startsAt = wallClock(input.date, input.startTime);
      const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);
      for (const candidate of candidates) {
        if (!candidate.hours.some((hours) => hours.startTime <= input.startTime
          && Number(hours.endTime.slice(0, 2)) * 60 + Number(hours.endTime.slice(3, 5)) >= endMinutes)) {
          continue;
        }
        const conflict = await tx.appointment.findFirst({
          where: {
            bookingStaffId: candidate.id,
            location: { business_id: businessId },
            status: { not: "CANCELED" },
            start_time: { lt: endsAt },
            end_time: { gt: startsAt },
          },
          select: { id: true },
        });
        if (!conflict) {
          assignedStaffId = candidate.id;
          break;
        }
      }
      if (!assignedStaffId) throw new DomainError("CONFLICT", "That time is no longer available.");
    }

    const customer = matchingCustomers[0] ?? await tx.customer.create({
      data: {
        business_id: businessId,
        first_name: input.firstName,
        last_name: input.lastName,
        phone_number: input.phone,
        email: input.email,
        address: "",
        preferred_contact_method: "EMAIL",
      },
      select: { id: true },
    });
    const startTime = wallClock(input.date, input.startTime);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60_000);
    const appointment = await tx.appointment.create({
      data: {
        customer_id: customer.id,
        employee_id: null,
        bookingStaffId: assignedStaffId,
        location_id: location.id,
        appointment_date: wallClock(input.date, "00:00"),
        start_time: startTime,
        end_time: endTime,
        status: "CONFIRMED",
        source: "PUBLIC",
        notes: "",
        appointment_services: {
          create: {
            service_id: service.id,
            quantity: 1,
            price_at_booking: service.base_price,
            service_name_at_booking: service.name,
            duration_minutes_at_booking: service.duration_minutes,
          },
        },
      },
      select: { id: true, start_time: true, end_time: true },
    });
    return { accepted: true as const, appointment };
  });
}
