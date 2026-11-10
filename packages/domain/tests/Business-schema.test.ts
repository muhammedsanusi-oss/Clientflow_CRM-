/*
 * Code guide: packages/domain/tests/Business-schema.test.ts
 * Automated regression tests for CreateBusiness schema. Assertions document expected behavior and failure
 * cases; inspect beforeAll/mocks for setup. Database suites use disposable PGlite rather than changing the
 * running local project data.
 */
// Boundary contracts: what the API accepts. If these change, the client and
// the server change together — that's why they live in one shared package.
/*
 * Import connection: vitest.
 * Test runner assertions, lifecycle hooks, spies, and mocks. This import is test support, not a production
 * API.
 * describe: Groups related regression scenarios in the test runner.
 * it: Defines a scenario whose assertions must pass.
 * expect: Checks actual values or failures against the expected behavior.
 */
import { describe, it, expect } from "vitest";
/*
 * Import connection: ../src/schemas/business -> packages/domain/src/schemas/business.ts.
 * CreateBusiness: Zod contract for validating the resource request before its domain write.
 */
import { CreateBusiness } from "../src/schemas/business";
/*
 * Import connection: ../src/schemas/employee -> packages/domain/src/schemas/employee.ts.
 * CreateEmployee: Zod contract for validating the resource request before its domain write.
 */
import { CreateEmployee } from "../src/schemas/employee";
/*
 * Import connection: ../src/schemas/location -> packages/domain/src/schemas/location.ts.
 * CreateLocation: Zod contract for validating the resource request before its domain write.
 */
import { CreateLocation } from "../src/schemas/location";

describe("CreateBusiness schema", () => {
  it("accepts valid business input", () => {
    const result = CreateBusiness.safeParse({
      name: "Acme Spa",
      first_name: "Ada",
      last_name: "Lovelace",
      email: "owner@acmespa.com",
      phone_number: "1234567890",
      business_type: "SPA",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid enum values and empty required fields", () => {
    expect(
      CreateBusiness.safeParse({
        name: "Acme Spa",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "owner@acmespa.com",
        phone_number: "1234567890",
        business_type: "RETAIL",
      }).success
    ).toBe(false);

    expect(
      CreateBusiness.safeParse({
        name: "",
        first_name: "Ada",
        last_name: "Lovelace",
        email: "owner@acmespa.com",
        phone_number: "1234567890",
        business_type: "SPA",
      }).success
    ).toBe(false);
  });
});

describe("CreateEmployee schema", () => {
  it("accepts valid employee input", () => {
    const result = CreateEmployee.safeParse({
      firstName: "Grace",
      lastName: "Hopper",
      username: "grace-hopper",
      email: "grace@company.com",
      phone_number: "0987654321",
      role: "MANAGER",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email and role values", () => {
    expect(
      CreateEmployee.safeParse({
        firstName: "Grace",
        lastName: "Hopper",
        username: "grace-hopper",
        email: "bad-email",
        phone_number: "0987654321",
        role: "MANAGER",
      }).success
    ).toBe(false);

    expect(
      CreateEmployee.safeParse({
        firstName: "Grace",
        lastName: "Hopper",
        username: "grace-hopper",
        email: "grace@company.com",
        phone_number: "0987654321",
        role: "EXECUTIVE",
      }).success
    ).toBe(false);
  });
});

describe("CreateLocation schema", () => {
  it("accepts valid location input", () => {
    const result = CreateLocation.safeParse({
      name: "Downtown Studio",
      phone_number: "5551234567",
      email: "studio@acmespa.com",
      address: "123 Main St",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing fields and invalid email", () => {
    expect(
      CreateLocation.safeParse({
        name: "Downtown Studio",
        phone_number: "5551234567",
        email: "not-an-email",
        address: "123 Main St",
      }).success
    ).toBe(false);

    expect(
      CreateLocation.safeParse({
        name: "",
        phone_number: "5551234567",
        email: "studio@acmespa.com",
        address: "123 Main St",
      }).success
    ).toBe(false);
  });
});
