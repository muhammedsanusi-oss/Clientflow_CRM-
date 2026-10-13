import { describe, expect, it } from "vitest";
import { CreateAppointment } from "../src/schemas/appointment";
import { CreateInteraction } from "../src/schemas/interaction";
import { CreateNote } from "../src/schemas/note";
import { CreatePayment } from "../src/schemas/payment";
import { CreateService } from "../src/schemas/service";
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
