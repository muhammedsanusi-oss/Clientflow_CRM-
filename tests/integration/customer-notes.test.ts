/*
 * Code guide: tests/integration/customer-notes.test.ts
 * Automated regression tests for customer notes. Assertions document expected behavior and failure cases;
 * inspect beforeAll/mocks for setup. Database suites use disposable PGlite rather than changing the running
 * local project data.
 */
/*
 * Import connection: vitest.
 * Test runner assertions, lifecycle hooks, spies, and mocks. This import is test support, not a production
 * API.
 * beforeAll: Sets up resources once before this test suite runs.
 * describe: Groups related regression scenarios in the test runner.
 * expect: Checks actual values or failures against the expected behavior.
 * it: Defines a scenario whose assertions must pass.
 */
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
  let listBusinessNotesForUser: (
    typeof import("@project/domain")
  )["listBusinessNotesForUser"];

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    // Test import connection: @project/db -> packages/db/src/index.ts. Loads the real module or its configured
    // mock for this scenario.
    const db = await import("@project/db");
    // Test import connection: @project/domain -> packages/domain/src/index.ts. Loads the real module or its
    // configured mock for this scenario.
    const domain = await import("@project/domain");

    prisma = db.prisma;
    createCustomerNoteForUser = domain.createCustomerNoteForUser;
    createCustomerNoteInputSchema = domain.createCustomerNoteInputSchema;
    getCustomerWithNotesForUser = domain.getCustomerWithNotesForUser;
    listBusinessNotesForUser = domain.listBusinessNotesForUser;


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
          role: "STAFF",
          first_name: "Avery",
          last_name: "Adams",
          email: "avery@example.test",
          phone_number: "555-3001",
          is_active: true,
          hire_date: new Date("2026-01-01"),
        },
        {
          id: employeeA2Id,
          business_id: businessAId,
          user_id: activeUserA2Id,
          role: "STAFF",
          first_name: "Blair",
          last_name: "Brown",
          email: "blair@example.test",
          phone_number: "555-3002",
          is_active: true,
          hire_date: new Date("2026-01-01"),
        },
        {
          id: employeeBId,
          business_id: businessBId,
          user_id: activeUserBId,
          role: "STAFF",
          first_name: "Casey",
          last_name: "Clark",
          email: "casey@example.test",
          phone_number: "555-4001",
          is_active: true,
          hire_date: new Date("2026-01-01"),
        },
        {
          id: "test-notes-employee-inactive",
          business_id: businessAId,
          user_id: inactiveUserId,
          role: "STAFF",
          first_name: "Inactive",
          last_name: "Employee",
          email: "inactive-notes@example.test",
          phone_number: "555-3003",
          is_active: false,
          hire_date: new Date("2026-01-01"),
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

    const businessNotes = await listBusinessNotesForUser(
      activeUserAId,
      businessAId,
    );
    expect(
      businessNotes
        .filter((note) => note.content.endsWith("conversation"))
        .map((note) => note.content),
    ).toEqual(["Newer conversation", "Older conversation"]);
    expect(
      businessNotes.find((note) => note.content === "Newer conversation"),
    ).toMatchObject({
      customer: {
        id: customerAId,
        first_name: "Customer",
        last_name: "Alpha",
      },
      employee: { first_name: "Blair", last_name: "Brown" },
    });
  });

  it("lists only notes from the user's active business membership", async () => {
    await createCustomerNoteForUser(activeUserBId, {
      customerId: customerBId,
      content: "Private to business B",
    });

    const notesForA = await listBusinessNotesForUser(
      activeUserAId,
      businessAId,
    );
    expect(notesForA.every((note) => note.customer.id === customerAId)).toBe(
      true,
    );
    expect(notesForA.map((note) => note.content)).not.toContain(
      "Private to business B",
    );
    await expect(
      listBusinessNotesForUser(inactiveUserId, businessAId),
    ).resolves.toEqual([]);
    await expect(
      listBusinessNotesForUser(activeUserBId, businessAId),
    ).resolves.toEqual([]);
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
