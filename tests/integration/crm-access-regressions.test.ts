import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: "access-owner" }));
vi.mock("@project/auth", () => ({ currentUserId: async () => session.userId }));

let prisma: (typeof import("@project/db"))["prisma"];
let domain: typeof import("@project/domain");
const params = {
  id: "access-business", customerId: "access-customer", appointmentId: "access-appointment",
  taskId: "access-task", noteId: "access-note", interactionId: "access-interaction",
  paymentId: "access-payment", serviceId: "access-service",
};

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  prisma = (await import("@project/db")).prisma;
  domain = await import("@project/domain");
  await prisma.user.create({ data: { id: session.userId, username: session.userId } });
  await prisma.business.create({ data: {
    id: params.id, name: "Access business", business_type: "OTHER", phone_number: "1234567890", email: "access@example.test",
  } });
  await prisma.employee.create({ data: {
    id: "access-employee", user_id: session.userId, business_id: params.id, role: "OWNER",
    first_name: "Test", last_name: "Owner", email: "access@example.test", phone_number: "1234567890", hire_date: new Date(),
  } });
  await prisma.customer.create({ data: {
    id: params.customerId, business_id: params.id, first_name: "Test", last_name: "Customer",
    email: "customer@example.test", phone_number: "1234567890", address: "Main Street", preferred_contact_method: "EMAIL",
  } });
  await prisma.location.create({ data: { id: "access-location", business_id: params.id, name: "Main", address: "Main Street" } });
  await prisma.service.create({ data: {
    id: params.serviceId, business_id: params.id, name: "Service", category: "General", description: "Service", duration_minutes: 60, base_price: 50,
  } });
  await prisma.appointment.create({ data: {
    id: params.appointmentId, customer_id: params.customerId, employee_id: "access-employee", location_id: "access-location",
    appointment_date: new Date("2026-12-01"), start_time: new Date("2026-12-01T10:00:00Z"), end_time: new Date("2026-12-01T11:00:00Z"), notes: "Private",
  } });
  await prisma.task.create({ data: { id: params.taskId, customer_id: params.customerId, employee_id: "access-employee", title: "Private", description: "Task", due_date: new Date() } });
  await prisma.note.create({ data: { id: params.noteId, customer_id: params.customerId, employee_id: "access-employee", content: "Private" } });
  await prisma.interaction.create({ data: { id: params.interactionId, customer_id: params.customerId, employee_id: "access-employee", type: "CALL", subject: "Private", content: "Private" } });
  await prisma.payment.create({ data: { id: params.paymentId, appointment_id: params.appointmentId, payment_method: "CARD", status: "COMPLETED" } });
}, 30_000);
afterAll(async () => { await prisma?.$disconnect(); });

describe.sequential("CRM access and appointment regressions", () => {
  it("returns 409 for an overlapping appointment without writing records", async () => {
    const { POST } = await import("../../apps/web/app/api/Business/[id]/appointments/route");
    const response = await POST(new Request("http://localhost/api", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        customer_id: params.customerId, employee_id: "access-employee", location_id: "access-location",
        appointment_date: "2026-12-01", start_time: "2026-12-01T10:30:00Z", end_time: "2026-12-01T11:30:00Z",
        services: [{ service_id: params.serviceId, quantity: 1 }],
      }),
    }), { params: Promise.resolve({ id: params.id }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "CONFLICT", message: "That time is already booked." } });
    expect(await prisma.appointment.count()).toBe(1);
    expect(await prisma.appointment_Service.count()).toBe(0);
  });

  it("revokes known item reads and direct domain collection reads on deactivation", async () => {
    const routes = await Promise.all([
      import("../../apps/web/app/api/Business/[id]/customers/[customerId]/route"),
      import("../../apps/web/app/api/Business/[id]/appointments/[appointmentId]/route"),
      import("../../apps/web/app/api/Business/[id]/tasks/[taskId]/route"),
      import("../../apps/web/app/api/Business/[id]/services/[serviceId]/route"),
      import("../../apps/web/app/api/Business/[id]/customers/[customerId]/notes/[noteId]/route"),
      import("../../apps/web/app/api/Business/[id]/customers/[customerId]/interactions/[interactionId]/route"),
      import("../../apps/web/app/api/Business/[id]/appointments/[appointmentId]/payments/[paymentId]/route"),
    ]);
    const readItems = () => Promise.all(routes.map(route => route.GET(new Request("http://localhost/api"), { params: Promise.resolve(params) })));
    for (const response of await readItems()) expect(response.status).toBe(200);
    const collections = () => Promise.all([
      domain.listCustomers(params.id, session.userId), domain.listAppointments(params.id, session.userId),
      domain.listTasks(params.id, session.userId), domain.listServices(params.id, session.userId),
      domain.listNotes(params.customerId, params.id, session.userId),
      domain.listInteractions(params.customerId, params.id, session.userId),
      domain.listPayments(params.appointmentId, params.id, session.userId),
    ]);
    for (const rows of await collections()) expect(rows).toHaveLength(1);
    await prisma.employee.update({ where: { id: "access-employee" }, data: { is_active: false } });
    for (const response of await readItems()) {
      expect(response.status).toBe(404);
      expect((await response.json()).error.code).toBe("NOT_FOUND");
    }
    for (const rows of await collections()) expect(rows).toEqual([]);
  });
});
