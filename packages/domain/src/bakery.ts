import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { domainDatabase as db, type Prisma } from "./queries/membership";
import { DomainError, apiError } from "./errors";
import { websiteImageUrl } from "./website-content";
import { crmEntitlementWhere } from "./subscription-access";

const id = z.string().trim().min(1).max(100);
const cents = z.number().int().min(1).max(1_000_000);
export const BakeryProductInput = z.object({
  id: id.optional(), name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000), priceCents: cents,
  stock: z.number().int().min(0).max(100000), active: z.boolean(),
  displayOrder: z.number().int().min(0).max(100000), photoRef: z.string().max(500),
}).strict();
export const BakeryDeliveryInput = z.object({
  preparationMinutes: z.number().int().min(0).max(240), speedMph: z.number().int().min(5).max(60),
  zones: z.array(z.object({
    label: z.string().trim().min(1).max(100),
    zipCodes: z.array(z.string().regex(/^\d{5}$/)).min(1).max(100),
    miles: z.number().min(0).max(50), feeCents: z.number().int().min(0).max(10000), active: z.boolean(),
  }).strict()).max(30),
}).strict().superRefine((v, ctx) => {
  const codes = v.zones.filter(x => x.active).flatMap(x => x.zipCodes);
  if (new Set(codes).size !== codes.length) ctx.addIssue({ code: "custom", message: "Each ZIP code can belong to only one active delivery zone." });
});
export const BakeryCartInput = z.array(z.object({ productId: id, quantity: z.number().int().min(1).max(99), priceCents: cents }).strict()).min(1).max(30)
  .refine(items => new Set(items.map(x => x.productId)).size === items.length, "Choose each product once.");
export const BakeryCheckoutInput = z.object({
  attemptKey: z.string().uuid(), trackingToken: z.string().regex(/^[a-f0-9]{64}$/),
  items: BakeryCartInput, expectedDeliveryFeeCents: z.number().int().min(0).max(10000),
  payment: z.enum(["SUCCESS", "DECLINED"]),
  customer: z.object({
    name: z.string().trim().min(1).max(120), email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().min(7).max(30), street: z.string().trim().min(1).max(250),
    city: z.string().trim().min(1).max(100), state: z.string().trim().regex(/^[A-Za-z]{2}$/), zip: z.string().regex(/^\d{5}$/),
  }).strict(),
}).strict();
export const BakeryStatusInput = z.object({
  orderId: id, version: z.number().int().min(0), status: z.enum(["RECEIVED", "WORKING_ON_IT", "OUT_FOR_DELIVERY"]),
}).strict();
export type BakeryDeliveryData = z.infer<typeof BakeryDeliveryInput>;
export type BakeryCheckoutData = z.infer<typeof BakeryCheckoutInput>;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const missing = () => new DomainError("NOT_FOUND", "Business or resource not found.");
export function bakeryApiError(error: unknown) {
  if (error instanceof z.ZodError) return { code: "VALIDATION", message: error.issues[0]?.message ?? "Check your entries.", status: 400 };
  return apiError(error);
}

async function owner(tx: Prisma.TransactionClient, userId: string, businessId: string) {
  const business = await tx.business.findFirst({ where: { id: businessId, websiteTemplate: "BAKERY",
    employees: { some: { user_id: userId, role: "OWNER", is_active: true, user: { mustChangePassword: false } } },
  }, select: { id: true, name: true, websiteTemplate: true } });
  if (!business) throw missing();
  return business;
}
async function lock(tx: Prisma.TransactionClient, businessId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`bakery:${businessId}`}))::text AS locked`;
}
async function photos(tx: Prisma.TransactionClient, businessId: string) {
  const content = await tx.businessWebsiteContent.findUnique({ where: { businessId } });
  const result: { ref: string; url: string; label: string }[] = [];
  const add = (section: string, refs: unknown) => {
    if (!Array.isArray(refs)) return;
    refs.forEach((ref, index) => { if (typeof ref === "string") result.push({ ref, url: websiteImageUrl(businessId, section, index, ref), label: `${section} photo ${index + 1}` }); });
  };
  if (content) {
    Object.entries(content.sectionImages as Record<string, unknown>).forEach(([section, refs]) => add(section, refs));
    if (Array.isArray(content.additionalSections)) content.additionalSections.forEach((section, index) => {
      if (section && typeof section === "object" && "images" in section) add(`custom-${index}`, section.images);
    });
  }
  return result;
}
export async function getBakeryOwner(userId: string, businessId: string) {
  return db.$transaction(async tx => {
    const business = await owner(tx, userId, businessId);
    return { business, products: await tx.bakeryProduct.findMany({ where: { businessId }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] }),
      photos: await photos(tx, businessId), delivery: await tx.bakeryDelivery.findUnique({ where: { businessId } }) };
  });
}
export async function saveBakeryProduct(userId: string, businessId: string, input: unknown) {
  const value = BakeryProductInput.parse(input);
  return db.$transaction(async tx => {
    await lock(tx, businessId); await owner(tx, userId, businessId);
    if (value.photoRef && !(await photos(tx, businessId)).some(x => x.ref === value.photoRef)) throw new DomainError("CONFLICT", "Choose a photo already published on this website.");
    const { id: productId, ...data } = value;
    if (productId) {
      if (!await tx.bakeryProduct.findFirst({ where: { id: productId, businessId } })) throw missing();
      return tx.bakeryProduct.update({ where: { id: productId, businessId }, data });
    }
    return tx.bakeryProduct.create({ data: { ...data, businessId } });
  });
}
export async function saveBakeryDelivery(userId: string, businessId: string, input: unknown) {
  const value = BakeryDeliveryInput.parse(input);
  return db.$transaction(async tx => {
    await lock(tx, businessId); await owner(tx, userId, businessId);
    return tx.bakeryDelivery.upsert({ where: { businessId }, create: { businessId, ...value }, update: value });
  });
}
export async function getBakeryCatalog(businessId: string) {
  return db.$transaction(async tx => {
    const business = await tx.business.findFirst({ where: { id: businessId, websiteTemplate: "BAKERY" }, select: { name: true } });
    if (!business) throw missing();
    const images = await photos(tx, businessId);
    const products = await tx.bakeryProduct.findMany({ where: { businessId, active: true }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
    const settings = await tx.bakeryDelivery.findUnique({ where: { businessId } });
    return { name: business.name, products: products.map(p => ({ id: p.id, name: p.name, description: p.description, priceCents: p.priceCents, stock: p.stock, imageUrl: images.find(x => x.ref === p.photoRef)?.url ?? null })),
      deliveryAvailable: !!settings && settingsValue(settings).zones.some(z => z.active) };
  });
}
function settingsValue(settings: { preparationMinutes: number; speedMph: number; zones: unknown }) {
  return BakeryDeliveryInput.parse({ preparationMinutes: settings.preparationMinutes, speedMph: settings.speedMph, zones: settings.zones });
}
async function quote(tx: Prisma.TransactionClient, businessId: string, zip: string) {
  const settings = await tx.bakeryDelivery.findUnique({ where: { businessId } });
  if (!settings) throw new DomainError("CONFLICT", "This bakery has not enabled delivery yet.");
  const config = settingsValue(settings);
  const zone = config.zones.find(z => z.active && z.zipCodes.includes(zip));
  if (!zone) throw new DomainError("CONFLICT", "Delivery is unavailable for this ZIP code.");
  const minutes = config.preparationMinutes + Math.ceil(zone.miles / config.speedMph * 60);
  return { label: zone.label, miles: zone.miles, feeCents: zone.feeCents, preparationMinutes: config.preparationMinutes, speedMph: config.speedMph, minutesFrom: minutes, minutesTo: minutes + 15 };
}
export async function getBakeryQuote(businessId: string, zip: string) {
  z.string().regex(/^\d{5}$/).parse(zip);
  return db.$transaction(async tx => {
    if (!await tx.business.findFirst({ where: { id: businessId, websiteTemplate: "BAKERY" }, select: { id: true } })) throw missing();
    return quote(tx, businessId, zip);
  });
}
async function throttle(businessId: string, email: string) {
  const key = hash(`bakery-checkout:${businessId}:${email}`), now = new Date(), cutoff = new Date(Date.now() - 900000);
  const rows = await db.$queryRaw<{ attempts: number }[]>`INSERT INTO "AuthThrottle" ("key", "attempts", "windowStart") VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET "attempts" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN 1 ELSE "AuthThrottle"."attempts" + 1 END,
    "windowStart" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN ${now} ELSE "AuthThrottle"."windowStart" END RETURNING "attempts"`;
  if (rows[0].attempts > 10) throw new DomainError("RATE_LIMITED", "Too many checkout attempts. Try again in 15 minutes.");
}
export async function checkoutBakery(businessId: string, input: unknown) {
  const value = BakeryCheckoutInput.parse(input), requestHash = hash(JSON.stringify(value));
  await throttle(businessId, value.customer.email);
  return db.$transaction(async tx => {
    await lock(tx, businessId);
    if (!await tx.business.findFirst({ where: { id: businessId, websiteTemplate: "BAKERY" }, select: { id: true } })) throw missing();
    const prior = await tx.bakeryOrder.findUnique({ where: { businessId_attemptKey: { businessId, attemptKey: value.attemptKey } } });
    if (prior) {
      if (prior.requestHash !== requestHash) throw new DomainError("CONFLICT", "This checkout attempt has already been used. Review your cart.");
      return { orderId: prior.id, orderNumber: prior.orderNumber, trackingToken: value.trackingToken };
    }
    const delivery = await quote(tx, businessId, value.customer.zip);
    if (delivery.feeCents !== value.expectedDeliveryFeeCents) throw new DomainError("CONFLICT", "Delivery pricing changed. Request a new quote before checkout.");
    const products = await tx.bakeryProduct.findMany({ where: { businessId, active: true, id: { in: value.items.map(x => x.productId) } } });
    const items = value.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity || product.priceCents !== item.priceCents) throw new DomainError("CONFLICT", "Products, prices, or stock changed. Review your cart before retrying.");
      return { productId: product.id, name: product.name, priceCents: product.priceCents, quantity: item.quantity };
    });
    if (value.payment === "DECLINED") throw new DomainError("CONFLICT", "Demo payment declined. Your cart is unchanged; no charge was made.");
    const subtotalCents = items.reduce((sum, item) => sum + item.quantity * item.priceCents, 0), now = Date.now();
    if (subtotalCents + delivery.feeCents > 2_000_000_000) throw new DomainError("CONFLICT", "This demo order exceeds the $20,000,000 total limit. Reduce your cart.");
    const order = await tx.bakeryOrder.create({ data: {
      businessId, attemptKey: value.attemptKey, requestHash, tokenHash: hash(value.trackingToken), customer: value.customer, delivery,
      orderNumber: `BK-${randomBytes(16).toString("hex").toUpperCase()}`,
      subtotalCents, deliveryFeeCents: delivery.feeCents, totalCents: subtotalCents + delivery.feeCents,
      arrivalFrom: new Date(now + delivery.minutesFrom * 60000), arrivalTo: new Date(now + delivery.minutesTo * 60000),
      items: { create: items }, events: { create: { status: "RECEIVED" } },
    } });
    for (const item of items) await tx.bakeryProduct.update({ where: { id: item.productId, businessId }, data: { stock: { decrement: item.quantity } } });
    return { orderId: order.id, orderNumber: order.orderNumber, trackingToken: value.trackingToken };
  });
}
export async function listBakeryOrders(userId: string, businessId: string, status?: string) {
  if (status) BakeryStatusInput.shape.status.parse(status);
  return db.$transaction(async tx => {
    const business = await owner(tx, userId, businessId);
    const orders = await tx.bakeryOrder.findMany({ where: { businessId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, include: { items: true, events: { orderBy: { createdAt: "asc" } } } });
    return { business, orders: orders.map(({ tokenHash: _token, requestHash: _request, attemptKey: _attempt, ...order }) => order) };
  });
}
export async function updateBakeryStatus(userId: string, businessId: string, input: unknown) {
  const value = BakeryStatusInput.parse(input);
  return db.$transaction(async tx => {
    await lock(tx, businessId); await owner(tx, userId, businessId);
    const order = await tx.bakeryOrder.findFirst({ where: { id: value.orderId, businessId } });
    if (!order) throw missing();
    if (order.status === value.status) return { ok: true };
    const next: Record<string, string> = { RECEIVED: "WORKING_ON_IT", WORKING_ON_IT: "OUT_FOR_DELIVERY" };
    if (order.version !== value.version || next[order.status] !== value.status) throw new DomainError("CONFLICT", "Order progress changed or this step is unavailable. Refresh and try again.");
    await tx.bakeryOrder.update({ where: { id: order.id, businessId, version: value.version }, data: { status: value.status, version: { increment: 1 }, events: { create: { status: value.status, actorId: userId } } } });
    return { ok: true };
  });
}
export async function trackBakeryOrder(businessId: string, token: string, orderNumber?: string) {
  const number = orderNumber?.trim().toUpperCase();
  if (number !== undefined ? !/^BK-[A-F0-9]{32}$/.test(number) : !/^[a-f0-9]{64}$/.test(token)) throw missing();
  const order = await db.bakeryOrder.findFirst({ where: { businessId,
    ...(number !== undefined ? { orderNumber: number } : { tokenHash: hash(token) }),
    business: { websiteTemplate: "BAKERY" },
  }, select: {
    id: true, orderNumber: true, status: true, totalCents: true, subtotalCents: true, deliveryFeeCents: true, createdAt: true, arrivalFrom: true, arrivalTo: true,
    items: { select: { name: true, quantity: true, priceCents: true } }, events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
  } });
  if (!order) throw missing();
  return order;
}
export async function upcomingOwnerAppointments(userId: string, businessId: string) {
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return db.appointment.findMany({ where: { appointment_date: { gte: today }, status: { not: "CANCELED" },
    customer: { business_id: businessId, business: { ...crmEntitlementWhere(), employees: { some: { user_id: userId, role: "OWNER", is_active: true, user: { mustChangePassword: false } } } } },
  }, orderBy: [{ appointment_date: "asc" }, { start_time: "asc" }], take: 5,
    include: { customer: { select: { first_name: true, last_name: true } }, location: { select: { name: true } }, appointment_services: { include: { service: { select: { name: true } } } } } });
}
