import { beforeAll, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  userId: "test-customer-api-user-a",
}));

vi.mock("../../packages/auth/src/index.ts", () => ({
  currentUserId: vi.fn(async () => authState.userId),
}));

const businessAId = "test-customer-api-business-a";
const businessBId = "test-customer-api-business-b";
const activeUserAId = "test-customer-api-user-a";
const activeUserBId = "test-customer-api-user-b";
const inactiveUserId = "test-customer-api-user-inactive";

const validCustomer = {
  firstName: "Jordan",
  lastName: "Lee",
  phoneNumber: "555-7300",
  email: "jordan-api@example.test",
  address: "30 API Street",
  preferredContactMethod: "EMAIL",
};

describe("customer JSON API", () => {
  let prisma: (typeof import("@project/db"))["prisma"];
  let GET: (typeof import("../../apps/web/app/api/customers/route"))["GET"];
  let POST: (typeof import("../../apps/web/app/api/customers/route"))["POST"];

  beforeAll(async () => {
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.DATABASE_URL;

    const db = await import("@project/db");
    const route = await import("../../apps/web/app/api/customers/route");

    prisma = db.prisma;
    GET = route.GET;
    POST = route.POST;

    await prisma.employee_role.create({
      data: {
        id: "test-customer-api-role",
        name: "Customer API role",
        description: "Role for customer API tests",
      },
    });

    await prisma.business.createMany({
      data: [
        {
          id: businessAId,
          name: "Customer API Business A",
          business_type: "OTHER",
          phone_number: "555-7000",
          email: "customer-api-a@example.test",
        },
        {
          id: businessBId,
          name: "Customer API Business B",
          business_type: "OTHER",
          phone_number: "555-8000",
          email: "customer-api-b@example.test",
        },
      ],
    });

    await prisma.user.createMany({
      data: [activeUserAId, activeUserBId, inactiveUserId].map((id) => ({
        id,
        username: id,
      })),
    });

    await prisma.employee.createMany({
      data: [
        {
          id: "test-customer-api-employee-a",
          business_id: businessAId,
          user_id: activeUserAId,
          role_id: "test-customer-api-role",
          first_name: "Active",
          last_name: "Employee A",
          email: "customer-api-employee-a@example.test",
          phone_number: "555-7001",
          is_active: true,
          hire_date: "2026-01-01",
        },
        {
          id: "test-customer-api-employee-b",
          business_id: businessBId,
          user_id: activeUserBId,
          role_id: "test-customer-api-role",
          first_name: "Active",
          last_name: "Employee B",
          email: "customer-api-employee-b@example.test",
          phone_number: "555-8001",
          is_active: true,
          hire_date: "2026-01-01",
        },
        {
          id: "test-customer-api-employee-inactive",
          business_id: businessAId,
          user_id: inactiveUserId,
          role_id: "test-customer-api-role",
          first_name: "Inactive",
          last_name: "Employee",
          email: "customer-api-inactive@example.test",
          phone_number: "555-7002",
          is_active: false,
          hire_date: "2026-01-01",
        },
      ],
    });

    await prisma.customer.createMany({
      data: [
        {
          id: "test-customer-api-a-zulu",
          business_id: businessAId,
          first_name: "Zara",
          last_name: "Zulu",
          phone_number: "555-7100",
          email: "zara-api@example.test",
          address: "10 API Street",
          preferred_contact_method: "PHONE",
        },
        {
          id: "test-customer-api-a-alpha",
          business_id: businessAId,
          first_name: "Alex",
          last_name: "Alpha",
          phone_number: "555-7200",
          email: "alex-api@example.test",
          address: "20 API Street",
          preferred_contact_method: "TEXT",
        },
        {
          id: "test-customer-api-b-private",
          business_id: businessBId,
          first_name: "Private",
          last_name: "Customer",
          phone_number: validCustomer.phoneNumber,
          email: validCustomer.email,
          address: "40 API Street",
          preferred_contact_method: "EMAIL",
        },
      ],
    });
  }, 30_000);

  it("lists only the current business customers in the documented shape", async () => {
    authState.userId = activeUserAId;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        customers: [
          {
            id: "test-customer-api-a-alpha",
            firstName: "Alex",
            lastName: "Alpha",
            phoneNumber: "555-7200",
            email: "alex-api@example.test",
            address: "20 API Street",
            preferredContactMethod: "TEXT",
          },
          {
            id: "test-customer-api-a-zulu",
            firstName: "Zara",
            lastName: "Zulu",
            phoneNumber: "555-7100",
            email: "zara-api@example.test",
            address: "10 API Street",
            preferredContactMethod: "PHONE",
          },
        ],
      },
    });
    expect(JSON.stringify(body)).not.toContain(businessBId);
    expect(JSON.stringify(body)).not.toContain("test-customer-api-b-private");

    authState.userId = activeUserBId;
    const otherBusinessResponse = await GET();

    expect(otherBusinessResponse.status).toBe(200);
    await expect(otherBusinessResponse.json()).resolves.toEqual({
      data: {
        customers: [
          {
            id: "test-customer-api-b-private",
            firstName: "Private",
            lastName: "Customer",
            phoneNumber: validCustomer.phoneNumber,
            email: validCustomer.email,
            address: "40 API Street",
            preferredContactMethod: "EMAIL",
          },
        ],
      },
    });
  });

  it("returns not found for an inactive employee", async () => {
    authState.userId = inactiveUserId;

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Your business could not be found.",
      },
    });
  });

  it("creates a customer under the derived business without exposing ownership", async () => {
    authState.userId = activeUserAId;

    const response = await POST(jsonRequest(validCustomer));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      data: {
        customer: validCustomer,
      },
    });
    expect(body.data.customer.id).toEqual(expect.any(String));
    expect(body.data.customer).not.toHaveProperty("businessId");
    expect(body.data.customer).not.toHaveProperty("business_id");

    await expect(
      prisma.customer.findUnique({
        where: { id: body.data.customer.id },
        select: { business_id: true },
      }),
    ).resolves.toEqual({ business_id: businessAId });
  });

  it("rejects malformed JSON and client-supplied ownership without writing", async () => {
    authState.userId = activeUserAId;
    const startingCount = await prisma.customer.count();

    const malformedResponse = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    const ownershipResponse = await POST(
      jsonRequest({
        ...validCustomer,
        email: "ownership-api@example.test",
        phoneNumber: "555-7301",
        businessId: businessBId,
      }),
    );

    expect(malformedResponse.status).toBe(400);
    await expect(malformedResponse.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(ownershipResponse.status).toBe(400);
    await expect(ownershipResponse.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(await prisma.customer.count()).toBe(startingCount);
  });

  it("reports a conflict for an email that already exists in the business", async () => {
    authState.userId = activeUserAId;

    const duplicateResponse = await POST(
      jsonRequest({
        ...validCustomer,
        email: "zara-api@example.test",
        phoneNumber: "555-7399",
      }),
    );

    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toEqual({
      error: {
        code: "CONFLICT",
        message: "A customer with this email or phone number already exists.",
      },
    });
  });

  it("does not create customers for an inactive employee", async () => {
    authState.userId = inactiveUserId;
    const email = "inactive-create-api@example.test";

    const response = await POST(
      jsonRequest({
        ...validCustomer,
        email,
        phoneNumber: "555-7302",
      }),
    );

    expect(response.status).toBe(404);
    expect(await prisma.customer.count({ where: { email } })).toBe(0);
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
