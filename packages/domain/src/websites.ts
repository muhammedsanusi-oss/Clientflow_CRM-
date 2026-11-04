import { z } from "zod";
import { createHash } from "node:crypto";
import { prisma } from "@project/db";
import { DomainError } from "./errors";

export const WebsiteContact = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254),
  phone: z.string().trim().max(30).optional().default(""),
  message: z.string().trim().min(10, "Write at least 10 characters.").max(2000),
  website: z.string().max(200).optional().default(""),
}).strict();

// Public by deliberate contract: only explicitly configured sites and public fields.
export function getPublicWebsite(businessId: string) {
  return prisma.business.findFirst({ where: { id: businessId, websiteTemplate: { not: null } }, select: {
    id: true, name: true, description: true, websiteTemplate: true, email: true,
    phone_number: true, publicAddress: true, openingHours: true,
  } });
}

export async function submitWebsiteInquiry(businessId: string, input: z.infer<typeof WebsiteContact>) {
  const site = await getPublicWebsite(businessId);
  if (!site) throw new DomainError("NOT_FOUND", "Website not found");
  if (input.website) return; // Honeypot deliberately gets the same success response.
  await prisma.$transaction(async tx => {
    const key = createHash("sha256").update(`website-contact:${site.id}`).digest("hex");
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const now = new Date();
    const attempts = await tx.$queryRaw<Array<{ attempts: number }>>`
      INSERT INTO "AuthThrottle" ("key", "attempts", "windowStart") VALUES (${key}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN 1 ELSE "AuthThrottle"."attempts" + 1 END,
        "windowStart" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN ${now} ELSE "AuthThrottle"."windowStart" END
      RETURNING "attempts"`;
    if (attempts[0].attempts > 10) throw new DomainError("RATE_LIMITED", "Too many messages. Please try again in 15 minutes.");
    await tx.websiteInquiry.create({ data: { businessId: site.id, name: input.name, email: input.email, phone: input.phone, message: input.message } });
  });
}

export async function listOwnerInquiries(userId: string, businessId?: string) {
  const business = await prisma.business.findFirst({ where: {
    ...(businessId === undefined ? {} : { id: businessId }),
    employees: { some: { user_id: userId, is_active: true, role: "OWNER" } },
  }, select: { id: true, name: true, websiteTemplate: true }, orderBy: [{ created_at: "desc" }, { id: "desc" }] });
  if (!business) throw new DomainError("NOT_FOUND", "Business not found");
  const inquiries = await prisma.websiteInquiry.findMany({ where: {
    businessId: business.id, business: { employees: { some: { user_id: userId, is_active: true, role: "OWNER" } } },
  }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return { business, inquiries };
}
