import { describe, it, expect } from "vitest";
import { apiError, DomainError } from "../src/errors";

describe("API error contract", () => {
  it("maps foreign resources and known-business permission failures separately", () => {
    expect(apiError(new DomainError("NOT_FOUND", "Business not found"))).toEqual({ status: 404, code: "NOT_FOUND", message: "Business not found" });
    expect(apiError(new DomainError("FORBIDDEN", "Cannot add employees"))).toEqual({ status: 403, code: "FORBIDDEN", message: "Cannot add employees" });
  });
  it("maps Prisma and PGlite adapter constraint codes without exposing details", () => {
    for (const error of [{ code: "P2002" }, { cause: { code: "23505", detail: "Private data" } }]) {
      expect(apiError(error)).toEqual({ status: 409, code: "CONFLICT", message: "A record with these details already exists" });
    }
    for (const error of [{ code: "P2025" }, { code: "P2003" }, { cause: { code: "23503" } }]) {
      expect(apiError(error)).toEqual({ status: 404, code: "NOT_FOUND", message: "Resource not found" });
    }
  });
  it("does not mistake unexpected database failures for client errors", () => {
    for (const error of [new Error("Secret connection string"), { code: "P2022" }, null]) {
      expect(apiError(error)).toEqual({ status: 500, code: "INTERNAL_ERROR", message: "Something went wrong" });
    }
  });
});
