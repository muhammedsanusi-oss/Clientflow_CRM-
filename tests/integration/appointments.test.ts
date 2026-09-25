import { beforeAll, describe, expect, it } from "vitest";

describe("customer appointment calendar", () => {
  const businessAId = "test-calendar-business-a";
  const businessBId = "test-calendar-business-b";
  const activeUserAId = "test-calendar-user-a";
  const activeUserA2Id = "test-calendar-user-a2";
  const activeUserBId = "test-calendar-user-b";
  const inactiveUserId = "test-calendar-user-inactive";
  const employeeAId = "test-calendar-employee-a";
  const customerAId = "test-calendar-customer-a";
  const customerBId = "test-calendar-customer-b";
  const locationAId = "test-calendar-location-a";
  const locationBId = "test-calendar-location-b";
  const serviceAId = "test-calendar-service-a";
  const serviceBId = "test-calendar-service-b";

  let prisma: (typeof import("@project/db"))["prisma"];
  let appointmentTimeSlots: (
    typeof import("@project/domain")
  )["appointmentTimeSlots"];
  let createAppointmentForUser: (
    typeof import("@project/domain")
  )["createAppointmentForUser"];
  let createAppointmentInputSchema: (
    typeof import("@project/domain")
  )["createAppointmentInputSchema"];
  let getAppointmentFormForUser: (
    typeof import("@project/domain")
  )["getAppointmentFormForUser"];
  let listAppointmentsForUserMonth: (
    typeof import("@project/domain")
  )["listAppointmentsForUserMonth"];

  const validInput = {
    customerId: customerAId,
    locationId: locationAId,
    serviceId: serviceAId,
    date: "2026-10-15",
    startTime: "10:00" as const,
    details: "Customer called to schedule.",
  };

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    const db = await import("@project/db");
    const domain = await import("@project/domain");

    prisma = db.prisma;
    appointmentTimeSlots = domain.appointmentTimeSlots;
    createAppointmentForUser = domain.createAppointmentForUser;
    createAppointmentInputSchema = domain.createAppointmentInputSchema;
    getAppointmentFormForUser = domain.getAppointmentFormForUser;
    listAppointmentsForUserMonth = domain.listAppointmentsForUserMonth;

    await prisma.employee_role.create({
      data: {
        id: "test-calendar-role",
        name: "Calendar role",
        description: "Role for appointment calendar tests",
      },
    });

    await prisma.business.createMany({
      data: [
        {
          id: businessAId,
          name: "Calendar Business A",
          business_type: "OTHER",
          phone_number: "555-5000",
          email: "calendar-a@example.test",
        },
        {
          id: businessBId,
          name: "Calendar Business B",
          business_type: "OTHER",
          phone_number: "555-6000",
          email: "calendar-b@example.test",
        },
      ],
    });

    await prisma.user.createMany({
      data: [activeUserAId, activeUserA2Id, activeUserBId, inactiveUserId].map(
        (id) => ({ id, username: id }),
      ),
    });

    await prisma.employee.createMany({
      data: [
        {
          id: employeeAId,
          business_id: businessAId,
          user_id: activeUserAId,
          role_id: "test-calendar-role",
          first_name: "Scheduler",
          last_name: "One",
          email: "scheduler-one@example.test",
          phone_number: "555-5001",
          is_active: true,
          hire_date: "2026-01-01",
        },
        {
          id: "test-calendar-employee-a2",
          business_id: businessAId,
          user_id: activeUserA2Id,
          role_id: "test-calendar-role",
          first_name: "Scheduler",
          last_name: "Two",
          email: "scheduler-two@example.test",
          phone_number: "555-5002",
          is_active: true,
          hire_date: "2026-01-01",
        },
        {
          id: "test-calendar-employee-b",
          business_id: businessBId,
          user_id: activeUserBId,
          role_id: "test-calendar-role",
          first_name: "Other",
          last_name: "Business",
          email: "scheduler-b@example.test",
          phone_number: "555-6001",
          is_active: true,
          hire_date: "2026-01-01",
        },
        {
          id: "test-calendar-employee-inactive",
          business_id: businessAId,
          user_id: inactiveUserId,
          role_id: "test-calendar-role",
          first_name: "Inactive",
          last_name: "Scheduler",
          email: "inactive-calendar@example.test",
          phone_number: "555-5003",
          is_active: false,
          hire_date: "2026-01-01",
        },
      ],
    });

    await prisma.location.createMany({
      data: [
        {
          id: locationAId,
          business_id: businessAId,
          name: "Active A",
          address: "1 Calendar Street",
          is_active: true,
        },
        {
          id: "test-calendar-location-inactive",
          business_id: businessAId,
          name: "Inactive A",
          address: "2 Calendar Street",
          is_active: false,
        },
        {
          id: locationBId,
          business_id: businessBId,
          name: "Active B",
          address: "3 Calendar Street",
          is_active: true,
        },
      ],
    });

    await prisma.service.createMany({
      data: [
        {
          id: serviceAId,
          business_id: businessAId,
          name: "Service 1",
          category: "Example",
          description: "Active service A",
          duration_minutes: 30,
          base_price: 0,
          is_Active: true,
        },
        {
          id: "test-calendar-service-inactive",
          business_id: businessAId,
          name: "Inactive service",
          category: "Example",
          description: "Inactive service A",
          duration_minutes: 30,
          base_price: 0,
          is_Active: false,
        },
        {
          id: serviceBId,
          business_id: businessBId,
          name: "Service 1",
          category: "Example",
          description: "Active service B",
          duration_minutes: 30,
          base_price: 25,
          is_Active: true,
        },
      ],
    });

    await prisma.customer.createMany({
      data: [
        {
          id: customerAId,
          business_id: businessAId,
          first_name: "Calendar",
          last_name: "Customer A",
          phone_number: "555-5100",
          email: "calendar-customer-a@example.test",
          address: "10 Appointment Road",
          preferred_contact_method: "PHONE",
        },
        {
          id: customerBId,
          business_id: businessBId,
          first_name: "Calendar",
          last_name: "Customer B",
          phone_number: "555-6100",
          email: "calendar-customer-b@example.test",
          address: "20 Appointment Road",
          preferred_contact_method: "EMAIL",
        },
      ],
    });
  }, 30_000);

  it("offers half-hour slots from 7:00 AM through 8:00 PM", () => {
    expect(appointmentTimeSlots[0]).toBe("07:00");
    expect(appointmentTimeSlots.at(-1)).toBe("20:00");
    expect(appointmentTimeSlots).toHaveLength(27);
    expect(appointmentTimeSlots).not.toContain("10:15");
  });

  it("validates appointment input and rejects client-supplied ownership", () => {
    expect(createAppointmentInputSchema.safeParse(validInput).success).toBe(true);
    expect(
      createAppointmentInputSchema.safeParse({
        ...validInput,
        startTime: "10:15",
      }).success,
    ).toBe(false);
    expect(
      createAppointmentInputSchema.safeParse({
        ...validInput,
        date: "2026-02-30",
      }).success,
    ).toBe(false);
    expect(
      createAppointmentInputSchema.safeParse({
        ...validInput,
        details: "x".repeat(1_001),
      }).success,
    ).toBe(false);
    expect(
      createAppointmentInputSchema.safeParse({
        ...validInput,
        employeeId: "another-employee",
      }).success,
    ).toBe(false);
  });

  it("returns only active locations and services from the employee's business", async () => {
    const form = await getAppointmentFormForUser(activeUserAId, customerAId);

    expect(form?.business.locations).toEqual([
      { id: locationAId, name: "Active A" },
    ]);
    expect(form?.business.services).toEqual([
      {
        id: serviceAId,
        name: "Service 1",
        duration_minutes: 30,
      },
    ]);
  });

  it("atomically records the scheduler, service, and calculated end time", async () => {
    const appointment = await createAppointmentForUser(
      activeUserAId,
      validInput,
    );

    expect(appointment).toMatchObject({
      customer_id: customerAId,
      employee_id: employeeAId,
      location_id: locationAId,
      status_id: "SCHEDULED",
      start_time: new Date("2026-10-15T10:00:00.000Z"),
      end_time: new Date("2026-10-15T10:30:00.000Z"),
      appointment_services: [
        expect.objectContaining({
          service_id: serviceAId,
          quantity: 1,
        }),
      ],
    });
  });

  it("shares ordered calendar entries with employees in the same business", async () => {
    await createAppointmentForUser(activeUserAId, {
      ...validInput,
      startTime: "07:00",
      details: "Earlier appointment",
    });

    const appointments = await listAppointmentsForUserMonth(
      activeUserA2Id,
      "2026-10",
    );

    expect(appointments.map((appointment) => appointment.start_time)).toEqual([
      new Date("2026-10-15T07:00:00.000Z"),
      new Date("2026-10-15T10:00:00.000Z"),
    ]);
    expect(appointments[0]).toMatchObject({
      customer: {
        first_name: "Calendar",
        last_name: "Customer A",
      },
      employee: {
        first_name: "Scheduler",
        last_name: "One",
      },
      location: { name: "Active A" },
      appointment_services: [{ service: { name: "Service 1" } }],
    });
  });

  it("does not reveal another business's calendar", async () => {
    await expect(
      listAppointmentsForUserMonth(activeUserBId, "2026-10"),
    ).resolves.toEqual([]);
    await expect(
      getAppointmentFormForUser(activeUserBId, customerAId),
    ).resolves.toBeNull();
  });

  it("rejects foreign customer, location, and service identifiers", async () => {
    const startingCount = await prisma.appointment.count();

    await expect(
      createAppointmentForUser(activeUserAId, {
        ...validInput,
        customerId: customerBId,
      }),
    ).resolves.toBeNull();
    await expect(
      createAppointmentForUser(activeUserAId, {
        ...validInput,
        locationId: locationBId,
      }),
    ).resolves.toBeNull();
    await expect(
      createAppointmentForUser(activeUserAId, {
        ...validInput,
        serviceId: serviceBId,
      }),
    ).resolves.toBeNull();
    expect(await prisma.appointment.count()).toBe(startingCount);
  });

  it("rejects users without an active employee relationship", async () => {
    await expect(
      createAppointmentForUser(inactiveUserId, validInput),
    ).resolves.toBeNull();
    await expect(
      getAppointmentFormForUser(inactiveUserId, customerAId),
    ).resolves.toBeNull();
    await expect(
      listAppointmentsForUserMonth(inactiveUserId, "2026-10"),
    ).resolves.toEqual([]);
  });
});
