// Boundary contracts: what the API accepts. If these change, the client and
// the server change together — that's why they live in one shared package.
import { describe, it, expect } from "vitest";
import { CreateBusiness } from "../src/schemas/business";
import { CreateEmployee } from "../src/schemas/employee";
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
        email: "bad-email",
        phone_number: "0987654321",
        role: "MANAGER",
      }).success
    ).toBe(false);

    expect(
      CreateEmployee.safeParse({
        firstName: "Grace",
        lastName: "Hopper",
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
