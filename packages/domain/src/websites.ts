import { websiteEntitlementWhere } from "./subscription-access";
/*
 * Code guide: packages/domain/src/websites.ts
 * Website read/write boundary for public pages, owner views/inquiries, and developer editing. Public queries
 * use an allowlist; private queries use owner membership or developer grants. Publication
 * locks/version-checks and revision writes are transactional.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";
/*
 * Import connection: node:crypto.
 * Built-in Node cryptography: secure random bytes, password derivation, digests, and timing-safe comparison;
 * no network service is called.
 */
import { createHash } from "node:crypto";
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 * Type Prisma: Generated TypeScript query/transaction types; a type import does not open another connection.
 * Defined in packages/db/src/generated/prisma.
 */
import { prisma, type Prisma } from "@project/db";
/*
 * Import connection: ./errors -> packages/domain/src/errors.ts.
 * DomainError: Deliberate safe domain failure carrying an allowed public code/message.
 */
import { DomainError } from "./errors";
/*
 * Import connection: ./website-editing -> packages/domain/src/website-editing.ts.
 * PublishWebsite: Strict shared publication schema for editable fields, text limits, array limits, and
 * version checks.
 * Type PublishWebsiteInput: Type inferred from the website publication schema; does not perform validation at
 * runtime by itself.
 */
import { PublishWebsite, type PublishWebsiteInput } from "./website-editing";
/*
 * Import connection: ./website-content -> packages/domain/src/website-content.ts.
 * defaultWebsiteContent: Copies the selected template default headings, button text, feature labels, and
 * offerings into an editable content object. Does not read or write the database.
 */
import {
  defaultWebsiteContent,
  WEBSITE_IMAGE_SECTIONS,
  WebsiteContentSchema,
  type WebsiteContent,
  type WebsiteImageSection,
} from "./website-content";
import type { WebsiteTemplateKey } from "./website-templates";
import {
  countWebsiteImages,
  WEBSITE_PLANS,
  WebsiteFeatureRequest as WebsiteFeatureRequestSchema,
} from "./website-plans";
import { notifyBusinessDevelopers } from "./developer-notifications";

// Strict public contact-message schema, including its hidden honeypot field.
export const WebsiteContact = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254),
  phone: z.string().trim().max(30).optional().default(""),
  message: z.string().trim().min(10, "Write at least 10 characters.").max(2000),
  website: z.string().max(200).optional().default(""),
}).strict();

// Explicit public-field allowlist. Only these fields are returned to public website rendering; credentials,
// private CRM data, and revision authors are omitted.
export const publicWebsiteSelection = {
  id: true, name: true, description: true, websiteTemplate: true, email: true,
  phone_number: true, publicAddress: true, openingHours: true,
  websiteContent: { select: {
    eyebrow: true, headline: true, sectionTitle: true, buttonLabel: true,
    features: true, offerings: true, fontFamily: true, textColor: true, textScale: true,
    sectionImages: true, additionalSections: true, aboutText: true, logoImage: true, heroImage: true,
  } },
} satisfies Prisma.BusinessSelect;

export type PublicWebsite = {
  id: string;
  name: string;
  description: string;
  websiteTemplate: WebsiteTemplateKey;
  email: string;
  phone_number: string;
  publicAddress: string;
  openingHours: string;
  websiteContent: WebsiteContent | null;
};
type OwnerWebsite = Omit<PublicWebsite, "websiteContent"> & {
  demoSubscription: { plan: "STANDARD" | "CRM" | "MANAGED"; status: string; periodEnd: Date | null } | null;
  websiteContent: (WebsiteContent & { publishedAt: Date }) | null;
};

function validWebsiteImageReference(businessId: string, section: string, imageRef: string | null) {
  if (!imageRef) return true;
  const uploadedPrefix = `${businessId}/website/${section}-`;
  const legacyPrefix = section === "header" ? `${businessId}/website/logo-`
    : section === "hero" ? `${businessId}/website/hero-` : null;
  const prefix = imageRef.startsWith(uploadedPrefix) ? uploadedPrefix
    : legacyPrefix && imageRef.startsWith(legacyPrefix) ? legacyPrefix : null;
  return prefix !== null
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(imageRef.slice(prefix.length));
}

function validSectionImageReferences(businessId: string, sectionImages: WebsiteContent["sectionImages"], additionalSections: WebsiteContent["additionalSections"]) {
  const standardImages = WEBSITE_IMAGE_SECTIONS.every(section =>
    sectionImages[section].every(imageRef => validWebsiteImageReference(businessId, section, imageRef)));
  const additionalImages = additionalSections.every((section, index) =>
    section.images.every(imageRef => validWebsiteImageReference(businessId, "custom", imageRef)));
  return standardImages && additionalImages;
}

type StoredWebsiteContent = {
  eyebrow: string;
  headline: string;
  sectionTitle: string;
  buttonLabel: string;
  features: string[];
  offerings: string[];
  fontFamily: string;
  textColor: string;
  textScale: string;
  sectionImages: unknown;
  additionalSections: unknown;
  aboutText: string;
  logoImage: string | null;
  heroImage: string | null;
};

function parseStoredWebsiteContent(content: StoredWebsiteContent): WebsiteContent {
  return WebsiteContentSchema.parse({
    eyebrow: content.eyebrow,
    headline: content.headline,
    sectionTitle: content.sectionTitle,
    buttonLabel: content.buttonLabel,
    features: content.features,
    offerings: content.offerings,
    fontFamily: content.fontFamily,
    textColor: content.textColor,
    textScale: content.textScale,
    sectionImages: content.sectionImages,
    additionalSections: content.additionalSections,
    aboutText: content.aboutText,
    logoImage: content.logoImage,
    heroImage: content.heroImage,
  });
}

// Public by deliberate contract: only explicitly configured sites and public fields.
/*
 * Returns only configured sites and explicitly allowlisted public business/content fields. Owner credentials,
 * CRM records, and revision authors are not part of this projection.
 */
export async function getPublicWebsite(businessId: string): Promise<PublicWebsite | null> {
  const site = await prisma.business.findFirst({ where: { id: businessId, websiteTemplate: { not: null } }, select: publicWebsiteSelection });
  if (!site?.websiteTemplate) return null;
  return {
    id: site.id, name: site.name, description: site.description, websiteTemplate: site.websiteTemplate,
    email: site.email, phone_number: site.phone_number, publicAddress: site.publicAddress,
    openingHours: site.openingHours,
    websiteContent: site.websiteContent ? WebsiteContentSchema.parse(site.websiteContent) : null,
  };
}

/*
 * Checks the public site, silently discards honeypot spam, applies the persisted per-business submission
 * limit, and saves the inquiry to that business inbox.
 */
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
    const inquiry = await tx.websiteInquiry.create({ data: {
      businessId: site.id, name: input.name, email: input.email, phone: input.phone, message: input.message,
    } });
    await notifyBusinessDevelopers(tx, site.id, site.name, {
      eventKey: `website-inquiry:${inquiry.id}`,
      type: "WEBSITE_INQUIRY",
      title: "New website inquiry",
      message: `New inquiry from ${input.name}.`,
    });
  });
}

/*
 * Requires an active OWNER membership and loads only that business contact messages. A caller-supplied
 * business ID alone grants no access.
 */
export async function listOwnerInquiries(userId: string, businessId?: string) {
  const business = await prisma.business.findFirst({ where: {
    ...(businessId === undefined ? {} : { id: businessId }),
    employees: { some: { user_id: userId, is_active: true, role: "OWNER" } },
  }, select: { id: true, name: true, websiteTemplate: true, demoSubscription: true }, orderBy: [{ created_at: "desc" }, { id: "desc" }] });
  if (!business) throw new DomainError("NOT_FOUND", "Business not found");
  const inquiries = await prisma.websiteInquiry.findMany({ where: {
    businessId: business.id, business: { employees: { some: { user_id: userId, is_active: true, role: "OWNER" } } },
  }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return { business, inquiries };
}

/*
 * Locks the business and either the developer grant or owner membership before reading editor data.
 * This also serializes competing publications.
 */
async function editableBusiness(tx: Prisma.TransactionClient, userId: string, businessId: string) {
  const business = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT b."id" FROM "Business" b
    WHERE b."id" = ${businessId} AND b."websiteTemplate" IS NOT NULL
    FOR UPDATE OF b`;
  if (!business.length) throw new DomainError("NOT_FOUND", "Website not found");
  const developer = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT g."businessId" AS "id" FROM "DeveloperBusinessAccess" g
    JOIN "User" u ON u."id" = g."developerId"
    WHERE g."businessId" = ${businessId} AND u."id" = ${userId}
      AND u."isDeveloper" = true AND u."mustChangePassword" = false
    FOR SHARE OF g, u`;
  if (developer.length) {
    return { role: "developer" as const, site: await tx.business.findUniqueOrThrow({ where: { id: businessId }, select: {
      ...publicWebsiteSelection, websiteContent: true, websitePlan: true, demoSubscription: true,
    } }) };
  }
  const owner = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT e."id" FROM "Employee" e
    JOIN "User" u ON u."id" = e."user_id"
    WHERE e."business_id" = ${businessId} AND e."user_id" = ${userId}
      AND e."is_active" = true AND e."role_id" = 'OWNER'
      AND u."mustChangePassword" = false
    FOR SHARE OF e, u`;
  if (!owner.length) throw new DomainError("NOT_FOUND", "Website not found");
  const entitled = await tx.business.findFirst({ where: { id: businessId, ...websiteEntitlementWhere() }, select: { id: true } });
  if (!entitled) throw new DomainError("NOT_FOUND", "Website not found");
  return { role: "owner" as const, site: await tx.business.findUniqueOrThrow({ where: { id: businessId }, select: {
    ...publicWebsiteSelection, websiteContent: true, websitePlan: true, demoSubscription: true,
  } }) };
}

/*
 * Confirms active owner membership or explicit developer grant before a website image upload.
 */
export async function assertWebsiteEditorAccess(userId: string, businessId: string) {
  return prisma.$transaction(async tx => (await editableBusiness(tx, userId, businessId)).role);
}

export async function assertWebsiteImageUploadAllowed(userId: string, businessId: string, section: string) {
  return prisma.$transaction(async tx => {
    const { site } = await editableBusiness(tx, userId, businessId);
    if (!site.websitePlan) return;
    const plan = WEBSITE_PLANS[site.websitePlan];
    if (section === "custom" && !plan.canAddSections) {
      throw new DomainError("FORBIDDEN", "Custom sections are available on Plus and Premium plans.");
    }
    const content = site.websiteContent
      ? parseStoredWebsiteContent(site.websiteContent)
      : defaultWebsiteContent(site.websiteTemplate!, site.description);
    if (countWebsiteImages(content) >= plan.maxImages) {
      throw new DomainError("CONFLICT", `This website has reached its ${plan.maxImages}-image plan limit. Remove an image and publish before uploading another.`);
    }
  });
}

export async function submitWebsiteFeatureRequest(userId: string, businessId: string, input: unknown) {
  const request = WebsiteFeatureRequestSchema.parse(input);
  return prisma.$transaction(async tx => {
    const { site, role } = await editableBusiness(tx, userId, businessId);
    if (role !== "owner") throw new DomainError("NOT_FOUND", "Website not found");
    if (!site.websitePlan || site.websitePlan === "FREE") {
      throw new DomainError("FORBIDDEN", "Feature requests are available on Plus and Premium plans.");
    }

    const requestLimit = WEBSITE_PLANS[site.websitePlan].maxFeatureRequests;
    const requestCount = await tx.websiteFeatureRequest.count({ where: { businessId } });
    if (requestLimit !== null && requestCount >= requestLimit) {
      throw new DomainError("CONFLICT", "The Plus plan allows up to five feature requests.");
    }

    const featureRequest = await tx.websiteFeatureRequest.create({ data: {
      businessId,
      submittedById: userId,
      title: request.title,
      description: request.description,
    } });
    await notifyBusinessDevelopers(tx, businessId, site.name, {
      eventKey: `owner-feature-request:${featureRequest.id}`,
      type: "OWNER_FEATURE_REQUEST",
      title: "Owner requested a website change",
      message: request.title,
    });
    return { requestCount: requestCount + 1, requestLimit };
  });
}

/*
 * Returns authorized saved public fields, content defaults for older sites, and the current publication
 * version. Reading the editor does not publish a change.
 */
export async function getWebsiteEditor(userId: string, businessId: string) {
  return prisma.$transaction(async tx => {
    const { site, role } = await editableBusiness(tx, userId, businessId);
    const { websiteContent, websitePlan, ...publicFields } = site;
    const savedContent = websiteContent ? parseStoredWebsiteContent(websiteContent) : null;
    const content = savedContent ?? defaultWebsiteContent(site.websiteTemplate!, site.description);
    const canSubmitFeatureRequests = role === "owner" && websitePlan !== null && websitePlan !== "FREE";
    const featureRequestCount = canSubmitFeatureRequests
      ? await tx.websiteFeatureRequest.count({ where: { businessId } })
      : 0;
    const plan = websitePlan ? WEBSITE_PLANS[websitePlan] : null;
    return {
      ...publicFields, websiteTemplate: site.websiteTemplate!,
      ...content,
      logoImage: content.logoImage ?? "",
      heroImage: content.heroImage ?? "",
      websitePlan,
      maxImages: plan?.maxImages ?? null,
      imageCount: countWebsiteImages(content),
      canAddCustomSections: plan?.canAddSections ?? true,
      canSubmitFeatureRequests,
      featureRequestCount,
      featureRequestLimit: plan?.maxFeatureRequests ?? null,
      canChangeTemplate: role === "developer",
      version: websiteContent?.version ?? 0,
    };
  });
}

/*
 * Rechecks developer access and the submitted version, then atomically writes business fields, content, and
 * before/after revision snapshots. A stale version returns CONFLICT.
 */
export async function publishWebsite(userId: string, businessId: string, input: PublishWebsiteInput) {
  const values = PublishWebsite.parse(input);
  return prisma.$transaction(async tx => {
    const { site, role } = await editableBusiness(tx, userId, businessId);
    if ((site.websiteContent?.version ?? 0) !== values.version) {
      throw new DomainError("CONFLICT", "Another editor published changes. Reload before publishing again; copy any unsaved text first.");
    }
    if (role === "owner" && values.websiteTemplate !== site.websiteTemplate) {
      throw new DomainError("FORBIDDEN", "Only developers can change the website template.");
    }
    const { version, eyebrow, headline, sectionTitle, buttonLabel, features, offerings, aboutText,
      fontFamily, textColor, textScale, sectionImages, additionalSections, logoImage, heroImage, ...businessFields } = values;
    const content = { eyebrow, headline, sectionTitle, buttonLabel, features, offerings, aboutText,
      fontFamily, textColor, textScale, sectionImages, additionalSections,
      logoImage: logoImage || null, heroImage: heroImage || null };
    if (site.websitePlan) {
      const plan = WEBSITE_PLANS[site.websitePlan];
      if (!plan.canAddSections && additionalSections.length > 0) {
        throw new DomainError("FORBIDDEN", "Custom sections are available on Plus and Premium plans.");
      }
      if (countWebsiteImages(content) > plan.maxImages) {
        throw new DomainError("CONFLICT", `This website is limited to ${plan.maxImages} images on its current plan.`);
      }
    }
    if (!validSectionImageReferences(businessId, sectionImages, additionalSections)
      || (content.logoImage && !validWebsiteImageReference(businessId, "header", content.logoImage))
      || (content.heroImage && !validWebsiteImageReference(businessId, "hero", content.heroImage))) {
      throw new DomainError("FORBIDDEN", "Choose images uploaded for this business.");
    }
    const publishedAt = new Date();
    const publication = { ...content, version: version + 1, publishedAt, publishedById: userId };
    const beforeContent = site.websiteContent
      ? parseStoredWebsiteContent(site.websiteContent)
      : defaultWebsiteContent(site.websiteTemplate!, site.description);
    const before = {
      name: site.name, description: site.description, websiteTemplate: site.websiteTemplate,
      email: site.email, phone_number: site.phone_number, publicAddress: site.publicAddress,
      openingHours: site.openingHours,
      eyebrow: beforeContent.eyebrow, headline: beforeContent.headline,
      sectionTitle: beforeContent.sectionTitle, buttonLabel: beforeContent.buttonLabel,
      features: beforeContent.features, offerings: beforeContent.offerings,
      fontFamily: beforeContent.fontFamily, textColor: beforeContent.textColor, textScale: beforeContent.textScale,
      additionalSections: beforeContent.additionalSections,
      aboutText: beforeContent.aboutText,
      logoImage: beforeContent.logoImage, heroImage: beforeContent.heroImage,
    };
    const { websiteTemplate, ...publicBusinessFields } = businessFields;
    await tx.business.update({ where: { id: businessId }, data: {
      ...publicBusinessFields, ...(role === "developer" ? { websiteTemplate } : {}),
    } });
    await tx.businessWebsiteContent.upsert({ where: { businessId },
      create: { businessId, ...publication }, update: publication,
    });
    await tx.businessWebsiteRevision.create({ data: {
      businessId, version: version + 1, publishedById: userId, publishedAt,
      before,       after: { ...publicBusinessFields, ...(role === "developer" ? { websiteTemplate } : {}), ...content },
    } });
    return { version: version + 1, publishedAt: publishedAt.toISOString() };
  });
}

/*
 * Returns an image reference only for the public logo or hero slot of a configured website.
 */
export async function getPublicWebsiteImage(businessId: string, locator: string) {
  const match = /^(header|hero|features|about|offerings|contact|custom-[0-5])-(0|[1-9])$/.exec(locator);
  if (!match) return null;
  const section = match[1]!;
  const index = Number(match[2]);
  const site = await prisma.business.findFirst({
    where: { id: businessId, websiteTemplate: { not: null } },
    select: { websiteContent: { select: {
      sectionImages: true, additionalSections: true, aboutText: true, logoImage: true, heroImage: true,
    } } },
  });
  const content = site?.websiteContent;
  if (!content) return null;
  const sectionImages = WebsiteContentSchema.shape.sectionImages.safeParse(content.sectionImages).success
    ? WebsiteContentSchema.shape.sectionImages.parse(content.sectionImages) : null;
  let imageRef: string | null = null;
  if (section.startsWith("custom-")) {
    const additionalSections = WebsiteContentSchema.shape.additionalSections.safeParse(content.additionalSections);
    if (!additionalSections.success) return null;
    imageRef = additionalSections.data[Number(section.slice("custom-".length))]?.images[index] ?? null;
  } else {
    const imageList = sectionImages?.[section as WebsiteImageSection];
    imageRef = imageList?.[index] ?? null;
  }
  return validWebsiteImageReference(businessId, section.startsWith("custom-") ? "custom" : section, imageRef) ? imageRef : null;
}

/*
 * Reads one configured website only through the current user active OWNER membership, including the
 * publication time needed by the private owner view.
 */
export async function getOwnerWebsite(userId: string, businessId?: string): Promise<OwnerWebsite> {
  const site = await prisma.business.findFirst({ where: {
    ...(businessId === undefined ? {} : { id: businessId }), websiteTemplate: { not: null },
    employees: { some: { user_id: userId, is_active: true, role: "OWNER" } },
  }, select: { ...publicWebsiteSelection, demoSubscription: true, websiteContent: { select: {
    ...publicWebsiteSelection.websiteContent.select, publishedAt: true,
  } } }, orderBy: [{ created_at: "desc" }, { id: "desc" }] });
  if (!site?.websiteTemplate) throw new DomainError("NOT_FOUND", "Website not found");
  const publicFields = {
    id: site.id, name: site.name, description: site.description, websiteTemplate: site.websiteTemplate,
    email: site.email, phone_number: site.phone_number, publicAddress: site.publicAddress,
    openingHours: site.openingHours, demoSubscription: site.demoSubscription,
  };
  if (!site.websiteContent) return { ...publicFields, websiteContent: null };
  const { publishedAt, ...content } = site.websiteContent;
  return { ...publicFields, websiteContent: { ...WebsiteContentSchema.parse(content), publishedAt } };
}

/*
 * Returns only configured businesses for which the current user has an active OWNER membership; used for the
 * owner website switch links.
 */
export function listOwnerWebsites(userId: string) {
  return prisma.business.findMany({ where: {
    websiteTemplate: { not: null },
    employees: { some: { user_id: userId, is_active: true, role: "OWNER" } },
  }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
}

/*
 * Returns the signed-in owner's active business workspaces for the owner dashboard.
 */
export function listOwnerDashboardBusinesses(userId: string) {
  return prisma.business.findMany({
    where: {
      employees: { some: { user_id: userId, is_active: true, role: "OWNER" } },
    },
    select: { id: true, name: true, description: true, websiteTemplate: true, demoSubscription: true },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });
}
