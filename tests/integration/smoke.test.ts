import { describe, it, expect, beforeAll, afterAll } from "vitest";

// All reads use a database built by the actual SQL migrations.

type PrismaClient = import("@project/db").PrismaClient;
let prisma: PrismaClient;

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  // Boot PGlite WASM before the test runs so the test is instant
  const db = await import("@project/db");
  prisma = db.prisma;
}, 30000);
afterAll(async () => { await prisma?.$disconnect(); });

describe("prisma client (PGlite door)", () => {
  it("connects to an in-memory PGlite instance", async () => {
    const result = await prisma.$queryRaw<[{ "?column?": number }]>`SELECT 1`;
    expect(result[0]["?column?"]).toBe(1);
  });

  it("reads every modeled table through the generated client", async () => {
    await expect(Promise.all([
      prisma.customer.findMany(), prisma.task.findMany(), prisma.note.findMany(),
      prisma.employee.findMany(), prisma.appointment.findMany(), prisma.appointment_Service.findMany(),
      prisma.service.findMany(), prisma.interaction.findMany(), prisma.payment.findMany(),
      prisma.business.findMany(), prisma.location.findMany(), prisma.user.findMany(),
    ])).resolves.toHaveLength(12);
  });

  it("writes the complete CRM relationship graph with the schema's types and defaults", async () => {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { username: "graph-owner" } });
      const business = await tx.business.create({ data: { name: "Graph business", business_type: "SPA", phone_number: "1234567890", email: "owner@example.com" } });
      const employee = await tx.employee.create({ data: { business_id: business.id, user_id: user.id, first_name: "Ada", last_name: "Owner", email: "owner@example.com", phone_number: "1234567890", hire_date: new Date("2025-01-01") } });
      const location = await tx.location.create({ data: { business_id: business.id, name: "Main", address: "Main Street" } });
      const customer = await tx.customer.create({ data: { business_id: business.id, first_name: "Grace", last_name: "Customer", phone_number: "0987654321", email: "customer@example.com", address: "Main Street", preferred_contact_method: "EMAIL" } });
      const task = await tx.task.create({ data: { customer_id: customer.id, employee_id: employee.id, title: "Follow up", description: "Call", due_date: new Date() } });
      const note = await tx.note.create({ data: { customer_id: customer.id, employee_id: employee.id, content: "First note" } });
      const appointment = await tx.appointment.create({ data: { customer_id: customer.id, employee_id: employee.id, location_id: location.id, appointment_date: new Date(), start_time: new Date(), end_time: new Date(), notes: "Booking" } });
      const service = await tx.service.create({ data: { business_id: business.id, name: "Massage", category: "SPA", description: "Massage", duration_minutes: 60, base_price: 50 } });
      const booking = await tx.appointment_Service.create({ data: { appointment_id: appointment.id, service_id: service.id, quantity: 1, price_at_booking: 50 } });
      const interaction = await tx.interaction.create({ data: { customer_id: customer.id, employee_id: employee.id, type: "CALL", subject: "Booking", content: "Confirmed" } });
      const payment = await tx.payment.create({ data: { appointment_id: appointment.id, payment_method: "CARD", status: "COMPLETED" } });
      const updatedNote = await tx.note.update({ where: { id: note.id }, data: { content: "Updated note" } });
      return { employee, task, updatedNote, appointment, booking, interaction, payment };
    });
    expect(result.employee).toMatchObject({ role: "STAFF", is_active: true, hire_date: new Date("2025-01-01") });
    expect(result.task.status).toBe("PENDING");
    expect(result.updatedNote.content).toBe("Updated note");
    expect(result.updatedNote.updated_at).toBeInstanceOf(Date);
    expect(result.appointment.status).toBe("SCHEDULED");
    expect(result.booking.price_at_booking.toString()).toBe("50");
    expect(result.interaction.type).toBe("CALL");
    expect(result.payment.status).toBe("COMPLETED");
  });
});
