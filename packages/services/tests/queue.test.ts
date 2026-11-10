/*
 * Code guide: packages/services/tests/queue.test.ts
 * Automated regression tests for encodeJobMessage / decodeJobMessage. Assertions document expected behavior
 * and failure cases; inspect beforeAll/mocks for setup. Database suites use disposable PGlite rather than
 * changing the running local project data.
 */
// Round-trip contract for Azure Storage Queue messages. Verifies that
// encodeJobMessage produces base64 and that decodeJobMessage reverses it,
// locking in the contract between the producer (web app) and consumer (worker).
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
 * Import connection: ../src/queue -> packages/services/src/queue.ts.
 * encodeJobMessage: Serializes a job object as base64 JSON for Azure Queue Storage.
 * decodeJobMessage: Decodes base64 JSON and checks that the result is an object with a string job type before
 * a worker uses it.
 */
import { encodeJobMessage, decodeJobMessage } from "../src/queue";

describe("encodeJobMessage / decodeJobMessage", () => {
  it("produces a base64 string", () => {
    const encoded = encodeJobMessage({ type: "test.event", id: "abc" });
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });

  it("round-trips a generic message", () => {
    const msg = { type: "test.event" as const, id: "id-1", value: "hello" };
    const encoded = encodeJobMessage(msg);
    const decoded = decodeJobMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it("round-trips unicode and non-ASCII characters", () => {
    const msg = { type: "test.event" as const, id: "id-2", label: "Résumé 📄" };
    const encoded = encodeJobMessage(msg);
    const decoded = decodeJobMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it("pins the wire format (base64-of-JSON)", () => {
    const msg = { type: "test.event", id: "abc" };
    const expected = Buffer.from(JSON.stringify(msg)).toString("base64");
    expect(encodeJobMessage(msg)).toBe(expected);
  });

  it("throws on invalid base64 input", () => {
    expect(() => decodeJobMessage("not base64!")).toThrow();
  });

  it("throws on valid base64 but invalid JSON", () => {
    const garbage = Buffer.from("this is not json").toString("base64");
    expect(() => decodeJobMessage(garbage)).toThrow();
  });

  it("throws on empty input", () => {
    expect(() => decodeJobMessage("")).toThrow();
  });

  it("throws on decoded JSON that is not an object", () => {
    const encoded = Buffer.from(JSON.stringify("just a string")).toString("base64");
    expect(() => decodeJobMessage(encoded)).toThrow("not an object");
  });

  it("throws on missing type field", () => {
    const encoded = Buffer.from(JSON.stringify({ id: "x" })).toString("base64");
    expect(() => decodeJobMessage(encoded)).toThrow("has no type field");
  });
});