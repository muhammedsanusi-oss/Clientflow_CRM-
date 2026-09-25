import { beforeAll, describe, expect, it } from "vitest";

  let createCustomerInputSchema: {
    safeParse(value: unknown): { success: boolean };
  };

  const validInput = {
    firstName: "Jordan",
    lastName: "Lee",
    phoneNumber: "555-0300",
    email: "jordan@example.test",
    address: "10 River Street",
    preferredContactMethod: "EMAIL",
  };

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    const domain = await import("@project/domain");
    createCustomerInputSchema = domain.createCustomerInputSchema;
  }, 30_000);

  describe("createCustomerInputSchema", () => {
    it("accepts valid customer input", () => {
      expect(createCustomerInputSchema.safeParse(validInput).success).toBe(true);
    });

    it("rejects invalid customer input", () => {
      expect(
        createCustomerInputSchema.safeParse({
          ...validInput,
          firstName: " ",
          email: "not-an-email",
        }).success,
      ).toBe(false);
    });

    it("rejects a client-supplied business ID", () => {
      expect(
        createCustomerInputSchema.safeParse({
          ...validInput,
          businessId: "another-business",
        }).success,
      ).toBe(false);
    });
  });

  describe("createCustomerForUser", () => {
    const activeUserId = "test-add-customer-active-user";
    const inactiveUserId = "test-add-customer-inactive-user";
    const businessAId = "test-add-customer-business-a";
    const businessBId = "test-add-customer-business-b";
    const roleId = "test-add-customer-role";

    let prisma: (typeof import("@project/db"))["prisma"];
    let createCustomerForUser: (
      typeof import("@project/domain")
    )["createCustomerForUser"];

    beforeAll(async () => {
      const db = await import("@project/db");
      const domain = await import("@project/domain");

      prisma = db.prisma;
      createCustomerForUser = domain.createCustomerForUser;

      await prisma.employee_role.create({
        data: {
          id: roleId,
          name: "Test role",
          description: "Role for add-customer tests",
        },
      });

      await prisma.business.create({
        data: {
          id: businessAId,
          name: "Test Business A",
          business_type: "OTHER",
          phone_number: "555-1000",
          email: "business-a@example.test",
        },
      });

      await prisma.business.create({
        data: {
          id: businessBId,
          name: "Test Business B",
          business_type: "OTHER",
          phone_number: "555-2000",
          email: "business-b@example.test",
        },
      });

      await prisma.user.create({
        data: {
          id: activeUserId,
          username: activeUserId,
        },
      });

      await prisma.user.create({
        data: {
          id: inactiveUserId,
          username: inactiveUserId,
        },
      });

      await prisma.employee.create({
        data: {
          id: "test-add-customer-active-employee",
          business_id: businessAId,
          user_id: activeUserId,
          role_id: roleId,
          first_name: "Active",
          last_name: "Employee",
          email: "active@example.test",
          phone_number: "555-1001",
          is_active: true,
          hire_date: "2026-01-01",
        },
      });

      await prisma.employee.create({
        data: {
          id: "test-add-customer-inactive-employee",
          business_id: businessAId,
          user_id: inactiveUserId,
          role_id: roleId,
          first_name: "Inactive",
          last_name: "Employee",
          email: "inactive@example.test",
          phone_number: "555-1002",
          is_active: false,
          hire_date: "2026-01-01",
        },
      });

      await prisma.customer.create({
        data: {
          id: "test-add-customer-existing-other-business",
          business_id: businessBId,
          first_name: "Existing",
          last_name: "Customer",
          phone_number: validInput.phoneNumber,
          email: validInput.email,
          address: "20 Other Street",
          preferred_contact_method: "EMAIL",
        },
      });
    }, 30_000);

    it("creates the customer under the active employee's business", async () => {
      const created = await createCustomerForUser(activeUserId, {
        ...validInput,
        preferredContactMethod: "EMAIL" as const,
      });

      expect(created).toMatchObject({
        business_id: businessAId,
        email: validInput.email,
        phone_number: validInput.phoneNumber,
      });
    });

    it("allows the same email and phone in an unrelated business", async () => {
      const customers = await prisma.customer.findMany({
        where: {
          email: validInput.email,
          phone_number: validInput.phoneNumber,
        },
        select: {
          business_id: true,
        },
        orderBy: {
          business_id: "asc",
        },
      });

      expect(customers).toEqual([
        { business_id: businessAId },
        { business_id: businessBId },
      ]);
    });

    it("does not create a customer for an inactive employee", async () => {
      const email = "blocked@example.test";

      const created = await createCustomerForUser(inactiveUserId, {
        ...validInput,
        email,
        phoneNumber: "555-0301",
        preferredContactMethod: "EMAIL" as const,
      });

      expect(created).toBeNull();
      expect(
        await prisma.customer.count({
          where: { email },
        }),
      ).toBe(0);
    });
  });