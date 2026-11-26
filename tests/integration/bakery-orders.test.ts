import { randomBytes, randomUUID, createHash } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { defaultWebsiteContent } from "../../packages/domain/src/website-content";
let db: typeof import("../../packages/db/src/index"), api: typeof import("../../packages/domain/src/index");
beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://"; delete process.env.DATABASE_URL;
  db = await import("../../packages/db/src/index"); api = await import("../../packages/domain/src/index");
  await db.prisma.user.createMany({ data: [{ id: "bakery-owner" }, { id: "bakery-stranger" }, { id: "bakery-staff" }, { id: "bakery-activation", mustChangePassword: true }] });
}, 30000);
afterAll(async () => { await db?.prisma.$disconnect(); });
const productInput = { name: "Bread", description: "Fresh demo bread", priceCents: 500, stock: 3, active: true, displayOrder: 0, photoRef: "" };
const deliveryInput = { preparationMinutes: 20, speedMph: 20, zones: [{ label: "Local", zipCodes: ["10001"], miles: 4, feeCents: 300, active: true }] };
async function fixture() {
  const id = randomUUID();
  await db.prisma.business.create({ data: { id, name: "Demo bakery", description: "Test", business_type: "BAKERY", websiteTemplate: "BAKERY", phone_number: "2125550100", email: `${id}@example.test`,
    demoSubscription: { create: { plan: "STANDARD", status: "CANCELED" } },
    employees: { create: ["bakery-owner", "bakery-staff", "bakery-activation"].map(user => ({ user_id: user, role: user === "bakery-staff" ? "STAFF" : "OWNER", first_name: "Demo", last_name: "Owner", email: `${user}@example.test`, phone_number: "2125550100", hire_date: new Date() })) },
  } });
  const product = await api.saveBakeryProduct("bakery-owner", id, productInput);
  await api.saveBakeryDelivery("bakery-owner", id, deliveryInput);
  const payload = { attemptKey: randomUUID(), trackingToken: randomBytes(32).toString("hex"), items: [{ productId: product.id, quantity: 2, priceCents: 500 }], expectedDeliveryFeeCents: 300, payment: "SUCCESS", customer: { name: "Customer", email: `${randomUUID()}@example.test`, phone: "2125550111", street: "1 Example Street", city: "Demo City", state: "NY", zip: "10001" } };
  return { id, product, payload };
}
describe("bakery orders", () => {
  it("allows owners on inactive subscriptions to maintain the catalog and returns only public product fields", async () => {
    const { id, product } = await fixture();
    const catalog = await api.getBakeryCatalog(id);
    expect(catalog).toMatchObject({ name: "Demo bakery", deliveryAvailable: true, products: [{ id: product.id, priceCents: 500, stock: 3, imageUrl: null }] });
    expect(JSON.stringify(catalog)).not.toMatch(/photoRef|employees|customer|Subscription/);
    await api.saveBakeryProduct("bakery-owner", id, { ...productInput, id: product.id, active: false });
    expect((await api.getBakeryCatalog(id)).products).toHaveLength(0);
  });
  it("rejects foreign/staff/activation users and foreign product IDs without writes", async () => {
    const { id, product, payload } = await fixture(), other = await fixture();
    for (const user of ["bakery-stranger", "bakery-staff", "bakery-activation"]) {
      await expect(api.getBakeryOwner(user, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(api.saveBakeryProduct(user, id, { ...productInput, id: product.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(api.saveBakeryDelivery(user, id, deliveryInput)).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(api.listBakeryOrders(user, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(api.saveBakeryProduct("bakery-owner", other.id, { ...productInput, id: product.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const order = await api.checkoutBakery(id, payload);
    await expect(api.updateBakeryStatus("bakery-stranger", id, { orderId: order.orderId, version: 0, status: "WORKING_ON_IT" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.updateBakeryStatus("bakery-owner", other.id, { orderId: order.orderId, version: 0, status: "WORKING_ON_IT" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it.each([{ priceCents: 0 }, { priceCents: 1000001 }, { stock: -1 }, { stock: 1.5 }, { name: " " }, { active: "true" }])("rejects invalid product %j", async patch => {
    const { id } = await fixture();
    await expect(api.saveBakeryProduct("bakery-owner", id, { ...productInput, ...patch })).rejects.toThrow();
    expect(await db.prisma.bakeryProduct.count({ where: { businessId: id } })).toBe(1);
  });
  it("accepts only this business's published photos and falls back when a placement is removed", async () => {
    const { id, product } = await fixture();
    await expect(api.saveBakeryProduct("bakery-owner", id, { ...productInput, id: product.id, photoRef: "arbitrary/blob.png" })).rejects.toMatchObject({ code: "CONFLICT" });
    const content = defaultWebsiteContent("BAKERY");
    const ref = `websites/${id}/offerings/${randomUUID()}.png`;
    // Publication storage is exercised separately by the real browser upload drill.
    await db.prisma.businessWebsiteContent.create({ data: { ...content, businessId: id, sectionImages: { ...content.sectionImages, offerings: [ref] }, version: 1, publishedById: "bakery-owner" } });
    await api.saveBakeryProduct("bakery-owner", id, { ...productInput, id: product.id, photoRef: ref });
    expect((await api.getBakeryCatalog(id)).products[0].imageUrl).toContain("offerings-0");
    const other = await fixture();
    await expect(api.saveBakeryProduct("bakery-owner", other.id, { ...productInput, photoRef: ref })).rejects.toMatchObject({ code: "CONFLICT" });
    await db.prisma.businessWebsiteContent.update({ where: { businessId: id }, data: { sectionImages: content.sectionImages } });
    expect((await api.getBakeryCatalog(id)).products[0].imageUrl).toBeNull();
  });
  it("quotes distance-based estimates and rejects unsupported or duplicate ZIPs", async () => {
    const { id } = await fixture();
    expect(await api.getBakeryQuote(id, "10001")).toMatchObject({ miles: 4, feeCents: 300, minutesFrom: 32, minutesTo: 47 });
    await expect(api.getBakeryQuote(id, "99999")).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(api.saveBakeryDelivery("bakery-owner", id, { ...deliveryInput, zones: [...deliveryInput.zones, ...deliveryInput.zones] })).rejects.toThrow();
  });
  it("creates one paid-demo receipt with snapshots and a minimal token-protected timeline", async () => {
    const { id, product, payload } = await fixture();
    const result = await api.checkoutBakery(id, payload), repeat = await api.checkoutBakery(id, payload);
    expect(repeat).toEqual(result);
    const order = await db.prisma.bakeryOrder.findFirstOrThrow({ where: { businessId: id }, include: { items: true, events: true } });
    expect(order).toMatchObject({ status: "RECEIVED", totalCents: 1300, subtotalCents: 1000, paymentResult: "SIMULATED_SUCCESS", tokenHash: createHash("sha256").update(payload.trackingToken).digest("hex"), items: [{ name: "Bread", priceCents: 500, quantity: 2 }], events: [{ status: "RECEIVED", actorId: null }] });
    expect(order.arrivalTo.getTime() - order.arrivalFrom.getTime()).toBe(900000);
    expect((await db.prisma.bakeryProduct.findFirstOrThrow({ where: { id: product.id, businessId: id } })).stock).toBe(1);
    expect(await db.prisma.bakeryOrder.count({ where: { businessId: id } })).toBe(1);
    const publicOrder = await api.trackBakeryOrder(id, payload.trackingToken);
    expect(JSON.stringify(publicOrder)).not.toMatch(/customer|email|street|tokenHash|actorId|attemptKey/);
    await api.saveBakeryProduct("bakery-owner", id, { ...productInput, id: product.id, name: "Changed", priceCents: 800 });
    await api.saveBakeryDelivery("bakery-owner", id, { ...deliveryInput, preparationMinutes: 80 });
    expect((await api.trackBakeryOrder(id, payload.trackingToken)).items[0]).toMatchObject({ name: "Bread", priceCents: 500 });
    expect((await api.trackBakeryOrder(id, payload.trackingToken)).arrivalFrom).toEqual(order.arrivalFrom);
    await expect(api.checkoutBakery(id, { ...payload, items: [{ ...payload.items[0], quantity: 1 }] })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(api.trackBakeryOrder("unknown", payload.trackingToken)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.trackBakeryOrder(id, randomBytes(32).toString("hex"))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("finds a minimal receipt by its unguessable order number and preserves the number on retry", async () => {
    const { id, payload } = await fixture();
    const result = await api.checkoutBakery(id, payload);
    expect(result.orderNumber).toMatch(/^BK-[A-F0-9]{32}$/);
    expect(await api.checkoutBakery(id, payload)).toEqual(result);
    const number = result.orderNumber!;
    const receipt = await api.trackBakeryOrder(id, "", `  ${number.toLowerCase()}  `);
    expect(receipt).toMatchObject({ orderNumber: number, status: "RECEIVED", totalCents: 1300, items: [{ name: "Bread", quantity: 2, priceCents: 500 }] });
    expect(JSON.stringify(receipt)).not.toMatch(/customer|email|street|phone|tokenHash|requestHash|actorId|attemptKey/);
    await api.updateBakeryStatus("bakery-owner", id, { orderId: result.orderId, version: 0, status: "WORKING_ON_IT" });
    expect((await api.trackBakeryOrder(id, "", number)).status).toBe("WORKING_ON_IT");
    await api.updateBakeryStatus("bakery-owner", id, { orderId: result.orderId, version: 1, status: "OUT_FOR_DELIVERY" });
    expect((await api.trackBakeryOrder(id, "", number)).events.map(e => e.status)).toEqual(["RECEIVED", "WORKING_ON_IT", "OUT_FOR_DELIVERY"]);
    const other = await fixture();
    await expect(api.trackBakeryOrder(other.id, "", number)).rejects.toMatchObject({ code: "NOT_FOUND" });
    for (const invalid of ["", result.orderId, "BK-123", `BK-${"0".repeat(32)}`]) {
      await expect(api.trackBakeryOrder(id, "", invalid)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect((await api.listBakeryOrders("bakery-owner", id)).orders[0].orderNumber).toBe(number);
    expect((await api.trackBakeryOrder(id, payload.trackingToken)).orderNumber).toBe(number);
  });
  it("keeps existing orders without an order number accessible by their private link", async () => {
    const { id, payload } = await fixture();
    const result = await api.checkoutBakery(id, payload);
    await db.prisma.bakeryOrder.update({ where: { id: result.orderId }, data: { orderNumber: null } });
    expect(await api.trackBakeryOrder(id, payload.trackingToken)).toMatchObject({ id: result.orderId, orderNumber: null });
  });
  it.each(["declined", "price", "stock", "foreign", "delivery", "duplicate", "quantity"])("rejects %s checkout without an order, history, or stock decrement", async kind => {
    const { id, product, payload } = await fixture();
    if (kind === "declined") payload.payment = "DECLINED";
    if (kind === "price") payload.items[0].priceCents = 1;
    if (kind === "stock") payload.items[0].quantity = 4;
    if (kind === "foreign") payload.items[0].productId = (await fixture()).product.id;
    if (kind === "delivery") payload.expectedDeliveryFeeCents = 0;
    if (kind === "duplicate") payload.items.push({ ...payload.items[0] });
    if (kind === "quantity") payload.items[0].quantity = 0;
    await expect(api.checkoutBakery(id, payload)).rejects.toThrow();
    expect(await db.prisma.bakeryOrder.count({ where: { businessId: id } })).toBe(0);
    expect((await db.prisma.bakeryProduct.findFirstOrThrow({ where: { id: product.id, businessId: id } })).stock).toBe(3);
  });
  it("does not oversell the last item under concurrent checkout", async () => {
    const { id, product, payload } = await fixture();
    await api.saveBakeryProduct("bakery-owner", id, { ...productInput, id: product.id, stock: 1 });
    const attempts = [0, 1].map(() => api.checkoutBakery(id, { ...payload, attemptKey: randomUUID(), trackingToken: randomBytes(32).toString("hex"), items: [{ ...payload.items[0], quantity: 1 }] }));
    const results = await Promise.allSettled(attempts);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.prisma.bakeryOrder.count({ where: { businessId: id } })).toBe(1);
    expect((await db.prisma.bakeryProduct.findFirstOrThrow({ where: { id: product.id, businessId: id } })).stock).toBe(0);
  });
  it("advances status in order with transactional history, stale rejection, and repeat no-op", async () => {
    const { id, payload } = await fixture(), result = await api.checkoutBakery(id, payload);
    await expect(api.updateBakeryStatus("bakery-owner", id, { orderId: result.orderId, version: 0, status: "OUT_FOR_DELIVERY" })).rejects.toMatchObject({ code: "CONFLICT" });
    await api.updateBakeryStatus("bakery-owner", id, { orderId: result.orderId, version: 0, status: "WORKING_ON_IT" });
    await api.updateBakeryStatus("bakery-owner", id, { orderId: result.orderId, version: 0, status: "WORKING_ON_IT" });
    await expect(api.updateBakeryStatus("bakery-owner", id, { orderId: result.orderId, version: 0, status: "OUT_FOR_DELIVERY" })).rejects.toMatchObject({ code: "CONFLICT" });
    await api.updateBakeryStatus("bakery-owner", id, { orderId: result.orderId, version: 1, status: "OUT_FOR_DELIVERY" });
    const tracking = await api.trackBakeryOrder(id, payload.trackingToken);
    expect(tracking.status).toBe("OUT_FOR_DELIVERY"); expect(tracking.events.map(x => x.status)).toEqual(["RECEIVED", "WORKING_ON_IT", "OUT_FOR_DELIVERY"]);
    expect((await api.listBakeryOrders("bakery-owner", id, "OUT_FOR_DELIVERY")).orders).toHaveLength(1);
    expect((await api.listBakeryOrders("bakery-owner", id, "RECEIVED")).orders).toHaveLength(0);
    expect((await db.prisma.bakeryOrderEvent.findMany({ where: { orderId: result.orderId, actorId: "bakery-owner" } }))).toHaveLength(2);
  });
  it("shows a genuine public booking in only its owner's upcoming appointments", async () => {
    const { id } = await fixture();
    await db.prisma.business.update({ where: { id }, data: { websiteTemplate: "SALON", business_type: "SALON" } });
    await db.prisma.demoSubscription.update({ where: { businessId: id }, data: { plan: "CRM", status: "ACTIVE", periodEnd: new Date(Date.now() + 86400000) } });
    const location = await api.createOwnerLocation("bakery-owner", { businessId: id, name: "Studio", address: "1 Demo Street" });
    await api.saveOwnerService("bakery-owner", { businessId: id, name: "Haircut", description: "Demo", durationMinutes: 30 });
    const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10), day = new Date(`${date}T00:00:00Z`).getUTCDay();
    await api.addBusinessHoursInterval("bakery-owner", { businessId: id, dayOfWeek: day, startTime: "09:00", endTime: "17:00" });
    const options = await api.getPublicBookingOptions(id);
    const service = await db.prisma.service.findFirstOrThrow({ where: { business_id: id } });
    await api.createPublicBooking(id, { serviceId: service.id, locationId: location.id, staffId: "", date, startTime: "10:00", firstName: "Salon", lastName: "Visitor", email: "salon@example.test", phone: "2125550199", website: "" });
    expect(options).not.toBeNull();
    const upcoming = await api.upcomingOwnerAppointments("bakery-owner", id);
    expect(upcoming).toHaveLength(1); expect(upcoming[0].customer.first_name).toBe("Salon");
    expect(await api.upcomingOwnerAppointments("bakery-stranger", id)).toHaveLength(0);
    await db.prisma.appointment.update({ where: { id: upcoming[0].id }, data: { status: "CANCELED" } });
    expect(await api.upcomingOwnerAppointments("bakery-owner", id)).toHaveLength(0);
  });
});
