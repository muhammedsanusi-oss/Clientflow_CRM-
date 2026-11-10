import { beforeAll, describe, expect, it } from "vitest";

describe("public customer booking", () => {
  const businessAId = "public-booking-business-a";
  const businessBId = "public-booking-business-b";
  const ownerAId = "public-booking-owner-a";
  const ownerBId = "public-booking-owner-b";
  const locationAId = "public-booking-location-a";
  const locationBId = "public-booking-location-b";
  const serviceAId = "public-booking-service-a";
  const serviceBId = "public-booking-service-b";
  const staffAId = "public-booking-staff-a";
  const date = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();

  let prisma: (typeof import("@project/db"))["prisma"];
  let api: typeof import("@project/domain");
  let bookingRoute: typeof import("../../apps/web/app/api/sites/[businessId]/booking/route");

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;
    prisma = (await import("@project/db")).prisma;
    api = await import("@project/domain");
    bookingRoute = await import("../../apps/web/app/api/sites/[businessId]/booking/route");

    await prisma.business.createMany({
      data: [
        {
          id: businessAId,
          name: "Public Booking A",
          business_type: "OTHER",
          phone_number: "555-8100",
          email: "public-a@example.test",
          websiteTemplate: "SALON",
        },
        {
          id: businessBId,
          name: "Public Booking B",
          business_type: "OTHER",
          phone_number: "555-8200",
          email: "public-b@example.test",
          websiteTemplate: "SALON",
        },
      ],
    });
    await prisma.user.createMany({
      data: [
        { id: ownerAId, username: ownerAId },
        { id: ownerBId, username: ownerBId },
      ],
    });
    await prisma.employee.createMany({
      data: [
        {
          id: "public-booking-employee-a",
          business_id: businessAId,
          user_id: ownerAId,
          role: "OWNER",
          first_name: "Owner",
          last_name: "A",
          email: "owner-a@example.test",
          phone_number: "555-8101",
          hire_date: new Date("2025-01-01"),
        },
        {
          id: "public-booking-employee-b",
          business_id: businessBId,
          user_id: ownerBId,
          role: "OWNER",
          first_name: "Owner",
          last_name: "B",
          email: "owner-b@example.test",
          phone_number: "555-8201",
          hire_date: new Date("2025-01-01"),
        },
      ],
    });
    await prisma.location.createMany({
      data: [
        { id: locationAId, business_id: businessAId, name: "A Main", address: "1 A Street" },
        { id: locationBId, business_id: businessBId, name: "B Main", address: "1 B Street" },
      ],
    });
    await prisma.service.createMany({
      data: [
        {
          id: serviceAId,
          business_id: businessAId,
          name: "A Service",
          category: "General",
          description: "Public service A",
          duration_minutes: 60,
          base_price: 50,
          is_Active: true,
        },
        {
          id: serviceBId,
          business_id: businessBId,
          name: "B Service",
          category: "General",
          description: "Private to B",
          duration_minutes: 30,
          base_price: 25,
          is_Active: true,
        },
      ],
    });
    await prisma.businessHoursInterval.createMany({
      data: [
        { businessId: businessAId, dayOfWeek, startTime: "09:00", endTime: "12:00" },
        { businessId: businessBId, dayOfWeek, startTime: "13:00", endTime: "15:00" },
      ],
    });
    await prisma.bookingStaff.create({
      data: {
        id: staffAId,
        businessId: businessAId,
        name: "Schedulable A",
        hours: { create: { dayOfWeek, startTime: "09:00", endTime: "12:00" } },
      },
    });
  }, 30_000);

  const bookingInput = (overrides: Record<string, string> = {}) => api.publicBookingInputSchema.parse({
    firstName: "Public",
    lastName: "Customer",
    email: "visitor@example.test",
    phone: "555-8199",
    serviceId: serviceAId,
    locationId: locationAId,
    date,
    startTime: "10:00",
    ...overrides,
  });

  it("only exposes configured public choices and times that fit opening, staff, and service duration", async () => {
    const options = await api.getPublicBookingOptions(businessAId);
    expect(options?.services).toEqual([
      expect.objectContaining({ id: serviceAId, name: "A Service", duration_minutes: 60 }),
    ]);
    expect(options?.locations).toEqual([
      expect.objectContaining({ id: locationAId, name: "A Main" }),
    ]);
    expect(options?.bookingStaff).toEqual([{ id: staffAId, name: "Schedulable A" }]);
    expect(options).not.toHaveProperty("customers");
    expect(await api.getPublicBookingAvailability(businessAId, date, serviceAId, locationAId))
      .toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("serves public availability and enforces same-origin booking writes with non-revealing errors", async () => {
    const getResponse = await bookingRoute.GET(
      new Request(`http://localhost:3000/api/sites/${businessAId}/booking?date=${date}&serviceId=${serviceAId}&locationId=${locationAId}&staffId=`),
      { params: Promise.resolve({ businessId: businessAId }) },
    );
    expect(getResponse.status).toBe(200);
    expect((await getResponse.json()).times).toContain("10:00");

    const crossOriginResponse = await bookingRoute.POST(
      new Request(`http://localhost:3000/api/sites/${businessAId}/booking`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://attacker.example" },
        body: JSON.stringify(bookingInput()),
      }),
      { params: Promise.resolve({ businessId: businessAId }) },
    );
    expect(crossOriginResponse.status).toBe(403);

    const foreignChoiceResponse = await bookingRoute.POST(
      new Request(`http://localhost:3000/api/sites/${businessAId}/booking`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify(bookingInput({ serviceId: serviceBId })),
      }),
      { params: Promise.resolve({ businessId: businessAId }) },
    );
    expect(foreignChoiceResponse.status).toBe(404);
    expect(await foreignChoiceResponse.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Booking choices are unavailable." },
    });
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("confirms a booking and stores service and duration snapshots without overwriting an existing customer", async () => {
    const createdCustomer = await prisma.customer.create({
      data: {
        business_id: businessAId,
        first_name: "Existing",
        last_name: "Record",
        phone_number: "555-8198",
        email: "existing@example.test",
        address: "Existing address",
        preferred_contact_method: "PHONE",
      },
    });
    const booking = await api.createPublicBooking(businessAId, bookingInput({
      firstName: "Updated",
      lastName: "Name",
      email: "EXISTING@example.test",
      phone: "555-8198",
    }));
    expect(booking.accepted).toBe(true);
    expect(booking.appointment).toMatchObject({
      start_time: new Date(`${date}T10:00:00.000Z`),
      end_time: new Date(`${date}T11:00:00.000Z`),
    });

    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: booking.appointment.id },
      include: { customer: true, bookingStaff: true, appointment_services: true },
    });
    expect(appointment).toMatchObject({
      source: "PUBLIC",
      status: "CONFIRMED",
      employee_id: null,
      bookingStaffId: staffAId,
      customer_id: createdCustomer.id,
      customer: {
        first_name: "Existing",
        last_name: "Record",
        address: "Existing address",
      },
      appointment_services: [{
        service_name_at_booking: "A Service",
        duration_minutes_at_booking: 60,
      }],
    });
    const ownerCalendar = await api.listAppointmentsForOwnerBusinessMonth(ownerAId, businessAId, date.slice(0, 7));
    expect(ownerCalendar).toMatchObject([{
      id: booking.appointment.id,
      employee: null,
      bookingStaff: { name: "Schedulable A" },
      appointment_services: [{
        service_name_at_booking: "A Service",
        duration_minutes_at_booking: 60,
      }],
    }]);
    await api.saveOwnerService(ownerAId, {
      businessId: businessAId,
      serviceId: serviceAId,
      name: "Updated service",
      description: "Changed after booking",
      durationMinutes: 90,
    });
    expect(await prisma.appointment_Service.findFirstOrThrow({
      where: { appointment_id: booking.appointment.id },
    })).toMatchObject({
      service_name_at_booking: "A Service",
      duration_minutes_at_booking: 60,
    });
    await api.saveOwnerService(ownerAId, {
      businessId: businessAId,
      serviceId: serviceAId,
      name: "A Service",
      description: "Public service A",
      durationMinutes: 60,
    });
    expect(await api.getPublicBookingAvailability(businessAId, date, serviceAId, locationAId))
      .toEqual(["09:00", "11:00"]);
  });

  it("rejects foreign choices, overlapping schedules, and non-owner settings changes", async () => {
    const countBefore = await prisma.appointment.count();
    await prisma.customer.createMany({
      data: [
        {
          business_id: businessAId,
          first_name: "Email",
          last_name: "Match",
          phone_number: "555-8131",
          email: "email-match@example.test",
          address: "",
          preferred_contact_method: "EMAIL",
        },
        {
          business_id: businessAId,
          first_name: "Phone",
          last_name: "Match",
          phone_number: "555-8132",
          email: "phone-match@example.test",
          address: "",
          preferred_contact_method: "EMAIL",
        },
      ],
    });
    await expect(api.createPublicBooking(businessAId, bookingInput({ serviceId: serviceBId })))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.createPublicBooking(businessAId, bookingInput({
      email: "email-match@example.test",
      phone: "555-8132",
      startTime: "11:00",
    }))).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(api.addBusinessHoursInterval(ownerBId, {
      businessId: businessAId,
      dayOfWeek,
      startTime: "12:00",
      endTime: "14:00",
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.addBusinessHoursInterval(ownerAId, {
      businessId: businessAId,
      dayOfWeek,
      startTime: "11:00",
      endTime: "13:00",
    })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(api.addBookingStaffHours(ownerAId, {
      businessId: businessAId,
      staffId: staffAId,
      dayOfWeek,
      startTime: "08:00",
      endTime: "09:00",
    })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.appointment.count()).toBe(countBefore);
    expect(await prisma.businessHoursInterval.count({ where: { businessId: businessAId } })).toBe(1);
  });

  it("counts failed booking attempts toward the public rate limit", async () => {
    const invalidSlot = bookingInput({
      email: "repeated-attempts@example.test",
      phone: "555-8188",
      startTime: "08:00",
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await expect(api.createPublicBooking(businessAId, invalidSlot))
        .rejects.toMatchObject({ code: "CONFLICT" });
    }
    await expect(api.createPublicBooking(businessAId, invalidSlot))
      .rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("serializes concurrent claims for a staff member and for a shared business schedule", async () => {
    const competingStaffBookings = await Promise.allSettled([
      api.createPublicBooking(businessAId, bookingInput({
        firstName: "First",
        email: "first@example.test",
        phone: "555-8111",
        startTime: "09:00",
      })),
      api.createPublicBooking(businessAId, bookingInput({
        firstName: "Second",
        email: "second@example.test",
        phone: "555-8112",
        startTime: "09:00",
      })),
    ]);
    expect(competingStaffBookings.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(competingStaffBookings.filter((result) => result.status === "rejected")).toHaveLength(1);

    const sharedScheduleBookings = await Promise.allSettled([
      api.createPublicBooking(businessBId, bookingInput({
        firstName: "Third",
        email: "third@example.test",
        phone: "555-8211",
        serviceId: serviceBId,
        locationId: locationBId,
        startTime: "13:00",
      })),
      api.createPublicBooking(businessBId, bookingInput({
        firstName: "Fourth",
        email: "fourth@example.test",
        phone: "555-8212",
        serviceId: serviceBId,
        locationId: locationBId,
        startTime: "13:00",
      })),
    ]);
    expect(sharedScheduleBookings.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(sharedScheduleBookings.filter((result) => result.status === "rejected")).toHaveLength(1);
  });
});
