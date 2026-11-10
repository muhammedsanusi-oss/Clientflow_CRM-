/*
 * Code guide: packages/domain/tests/crm-schemas.test.ts
 * Automated regression tests for CRM schemas. Assertions document expected behavior and failure cases;
 * inspect beforeAll/mocks for setup. Database suites use disposable PGlite rather than changing the running
 * local project data.
 */
/*
 * Import connection: vitest.
 * Test runner assertions, lifecycle hooks, spies, and mocks. This import is test support, not a production
 * API.
 * describe: Groups related regression scenarios in the test runner.
 * expect: Checks actual values or failures against the expected behavior.
 * it: Defines a scenario whose assertions must pass.
 */
import { describe, expect, it } from "vitest";
/*
 * Import connection: ../src/schemas/appointment -> packages/domain/src/schemas/appointment.ts.
 * CreateAppointment: Zod contract for validating the resource request before its domain write.
 */
import { CreateAppointment } from "../src/schemas/appointment";
/*
 * Import connection: ../src/schemas/interaction -> packages/domain/src/schemas/interaction.ts.
 * CreateInteraction: Zod contract for validating the resource request before its domain write.
 */
import { CreateInteraction } from "../src/schemas/interaction";
/*
 * Import connection: ../src/schemas/note -> packages/domain/src/schemas/note.ts.
 * CreateNote: Zod contract for validating the resource request before its domain write.
 */
import { CreateNote } from "../src/schemas/note";
/*
 * Import connection: ../src/schemas/payment -> packages/domain/src/schemas/payment.ts.
 * CreatePayment: Zod contract for validating the resource request before its domain write.
 */
import { CreatePayment } from "../src/schemas/payment";
/*
 * Import connection: ../src/schemas/service -> packages/domain/src/schemas/service.ts.
 * CreateService: Zod contract for validating the resource request before its domain write.
 */
import { CreateService } from "../src/schemas/service";
/*
 * Import connection: ../src/schemas/task -> packages/domain/src/schemas/task.ts.
 * CreateTask: Zod contract for validating the resource request before its domain write.
 */
import { CreateTask } from "../src/schemas/task";

describe("CRM schemas", () => {
  it("validates service fields and defaults", () => {
    expect(CreateService.parse({
      name: "Haircut",
      category: "Hair",
      duration_minutes: 30,
      base_price: 25,
    })).toMatchObject({ description: "", is_active: true });
    expect(CreateService.safeParse({ name: "", category: "Hair", duration_minutes: -1, base_price: -2 }).success).toBe(false);
  });

  it("requires a valid appointment window and unique services", () => {
    const valid = {
      customer_id: "customer",
      employee_id: "employee",
      location_id: "location",
      appointment_date: "2026-10-08T00:00:00.000Z",
      start_time: "2026-10-08T10:00:00.000Z",
      end_time: "2026-10-08T11:00:00.000Z",
      services: [{ service_id: "service", quantity: 1 }],
    };
    expect(CreateAppointment.safeParse(valid).success).toBe(true);
    expect(CreateAppointment.safeParse({ ...valid, end_time: valid.start_time }).success).toBe(false);
    expect(CreateAppointment.safeParse({
      ...valid,
      services: [...valid.services, ...valid.services],
    }).success).toBe(false);
  });

  it("validates tasks and customer activity inputs", () => {
    expect(CreateTask.safeParse({
      customer_id: "customer",
      employee_id: "employee",
      title: "Call customer",
      due_date: "2026-10-09",
    }).success).toBe(true);
    expect(CreateTask.safeParse({
      customer_id: "customer",
      employee_id: "employee",
      title: "",
      due_date: "not-a-date",
    }).success).toBe(false);
    expect(CreateNote.safeParse({ content: "Follow up next week" }).success).toBe(true);
    expect(CreateNote.safeParse({ content: "  " }).success).toBe(false);
    expect(CreateInteraction.safeParse({
      type: "EMAIL",
      subject: "Appointment reminder",
      content: "Sent the customer a reminder",
    }).success).toBe(true);
    expect(CreateInteraction.safeParse({ type: "OTHER", subject: "", content: "" }).success).toBe(false);
  });

  it("validates payment method, status, and optional reference", () => {
    expect(CreatePayment.safeParse({ payment_method: "CARD", status: "COMPLETED" }).success).toBe(true);
    expect(CreatePayment.safeParse({ payment_method: "CRYPTO", status: "COMPLETED" }).success).toBe(false);
  });
});
