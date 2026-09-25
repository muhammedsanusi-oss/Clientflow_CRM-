import { beforeAll, describe, expect, it } from "vitest";

const businessAId = "test-notes-business-a";
const businessBId = "test-notes-business-b";
const employeeAId = "test-notes-employee-a";
const employeeA2Id = "test-notes-employee-a2";
const employeeBId = "test-notes-employee-b";
const activeUserAId = "test-notes-user-a";
const activeUserA2Id = "test-notes-user-a2";
const activeUserBId = "test-notes-user-b";
const inactiveUserId = "test-notes-user-inactive";
const customerAId = "test-notes-customer-a";
const customerBId = "test-notes-customer-b";

describe("customer notes", () => {
  let prisma: (typeof import("@project/db"))["prisma"];
  let createCustomerNoteForUser: (
    typeof import("@project/domain")
  )["createCustomerNoteForUser"];
  let createCustomerNoteInputSchema: (
    typeof import("@project/domain")
  )["createCustomerNoteInputSchema"];
  let getCustomerWithNotesForUser: (
    typeof import("@project/domain")
  )["getCustomerWithNotesForUser"];

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    const db = await import("@project/db");
    const domain = await import("@project/domain");

    prisma = db.prisma;
    createCustomerNoteForUser = domain.createCustomerNoteForUser;
    createCustomerNoteInputSchema = domain.createCustomerNoteInputSchema;
    getCustomerWithNotesForUser = domain.getCustomerWithNotesForUser;

    await prisma.employee_role.create({
      data: {
        id: "test-notes-role",
        name: "Notes role",
        description: "Role for customer note tests",
      },
    });

    await prisma.business.createMany({
      data: [
        {
          id: businessAId,
          name: "Notes Business A",
          business_type: "OTHER",
          phone_number: "555-3000",
          email: "notes-a@example.test",
        },
        {
          id: businessBId,
          name: "Notes Business B",
          business_type: "OTHER",
          phone_number: "555-4000",
          email: "notes-b@example.test",
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
          role_id: "test-notes-role",
          first_name: "Avery",
          last_name: "Adams",
          email: "avery@example.test",
          phone_number: "555-3001",
          is_active: true,
          hire_date: "2026-01-01",
        },
        {
          id: employeeA2Id,
          business_id: businessAId,
          user_id: activeUserA2Id,
          role_id: "test-notes-role",
          first_name: "Blair",
          last_name: "Brown",
          email: "blair@example.test",
          phone_number: "555-3002",
          is_active: true,
          hire_date: "2026-01-01",
        },
        {
          id: employeeBId,
          business_id: businessBId,
          user_id: activeUserBId,
          role_id: "test-notes-role",
          first_name: "Casey",
          last_name: "Clark",
          email: "casey@example.test",
          phone_number: "555-4001",
          is_active: true,
          hire_date: "2026-01-01",
        },
        {
          id: "test-notes-employee-inactive",
          business_id: businessAId,
          user_id: inactiveUserId,
          role_id: "test-notes-role",
          first_name: "Inactive",
          last_name: "Employee",
          email: "inactive-notes@example.test",
          phone_number: "555-3003",
          is_active: false,
          hire_date: "2026-01-01",
        },
      ],
    });

    await prisma.customer.createMany({
      data: [
        {
          id: customerAId,
          business_id: businessAId,
          first_name: "Customer",
          last_name: "Alpha",
          phone_number: "555-3100",
          email: "customer-a@example.test",
          address: "1 Alpha Street",
          preferred_contact_method: "PHONE",
        },
        {
          id: customerBId,
          business_id: businessBId,
          first_name: "Customer",
          last_name: "Beta",
          phone_number: "555-4100",
          email: "customer-b@example.test",
          address: "2 Beta Street",
          preferred_contact_method: "EMAIL",
        },
      ],
    });
  }, 30_000);

  it("validates content and rejects client-supplied authorship", () => {
    expect(
      createCustomerNoteInputSchema.safeParse({
        customerId: customerAId,
        content: "  Follow up next week.  ",
      }),
    ).toMatchObject({
      success: true,
      data: { content: "Follow up next week." },
    });

    expect(
      createCustomerNoteInputSchema.safeParse({
        customerId: customerAId,
        content: " ",
      }).success,
    ).toBe(false);

    expect(
      createCustomerNoteInputSchema.safeParse({
        customerId: customerAId,
        content: "x".repeat(2_001),
      }).success,
    ).toBe(false);

    expect(
      createCustomerNoteInputSchema.safeParse({
        customerId: customerAId,
        content: "Valid note",
        employeeId: employeeBId,
      }).success,
    ).toBe(false);
  });

  it("records the current employee as the author", async () => {
    const created = await createCustomerNoteForUser(activeUserAId, {
      customerId: customerAId,
      content: "Avery spoke with this customer.",
    });

    expect(created).toMatchObject({
      customer_id: customerAId,
      employee_id: employeeAId,
      content: "Avery spoke with this customer.",
    });
  });

  it("shares notes and author names with another active employee in the business", async () => {
    const customer = await getCustomerWithNotesForUser(
      activeUserA2Id,
      customerAId,
    );

    expect(customer?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "Avery spoke with this customer.",
          employee: {
            first_name: "Avery",
            last_name: "Adams",
          },
        }),
      ]),
    );
  });

  it("lists the newest note first", async () => {
    const older = await createCustomerNoteForUser(activeUserAId, {
      customerId: customerAId,
      content: "Older conversation",
    });
    const newer = await createCustomerNoteForUser(activeUserA2Id, {
      customerId: customerAId,
      content: "Newer conversation",
    });

    await prisma.note.update({
      where: { id: older!.id },
      data: { note_date: new Date("2026-01-01T09:00:00.000Z") },
    });
    await prisma.note.update({
      where: { id: newer!.id },
      data: { note_date: new Date("2026-01-01T10:00:00.000Z") },
    });

    const customer = await getCustomerWithNotesForUser(
      activeUserAId,
      customerAId,
    );
    const orderedConversationNotes = customer?.notes.filter((note) =>
      note.content.endsWith("conversation"),
    );

    expect(orderedConversationNotes?.map((note) => note.content)).toEqual([
      "Newer conversation",
      "Older conversation",
    ]);
  });

  it("does not reveal or write notes across businesses", async () => {
    await expect(
      getCustomerWithNotesForUser(activeUserBId, customerAId),
    ).resolves.toBeNull();
    await expect(
      createCustomerNoteForUser(activeUserBId, {
        customerId: customerAId,
        content: "Must not be written",
      }),
    ).resolves.toBeNull();
    expect(
      await prisma.note.count({
        where: { content: "Must not be written" },
      }),
    ).toBe(0);
  });

  it("does not reveal or write notes for an inactive employee", async () => {
    await expect(
      getCustomerWithNotesForUser(inactiveUserId, customerAId),
    ).resolves.toBeNull();
    await expect(
      createCustomerNoteForUser(inactiveUserId, {
        customerId: customerAId,
        content: "Inactive write",
      }),
    ).resolves.toBeNull();
  });

  it("returns the same not-found result for unknown customers", async () => {
    await expect(
      getCustomerWithNotesForUser(activeUserAId, "unknown-customer"),
    ).resolves.toBeNull();
    await expect(
      createCustomerNoteForUser(activeUserAId, {
        customerId: "unknown-customer",
        content: "Unknown customer write",
      }),
    ).resolves.toBeNull();
  });
});
