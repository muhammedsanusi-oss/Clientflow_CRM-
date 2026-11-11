/*
 * Code guide: packages/domain/src/provisioning.ts
 * Business-owner onboarding used by developer forms and APIs. Validation, developer checks, duplicate-email
 * rejection, owner creation, membership creation, and explicit grants live together so onboarding is
 * transactional.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 * Type Prisma: Generated TypeScript query/transaction types; a type import does not open another connection.
 * Defined in packages/db/src/generated/prisma.
 */
import { prisma, type Prisma } from "@project/db";
/*
 * Import connection: @project/auth/password -> packages/auth/src/password.ts.
 * hashPassword: Creates a random salt and derives a scrypt key. Returns a stored hash format, never the
 * plaintext password.
 * randomToken: Generates a cryptographically random base64url ticket or temporary credential.
 */
import { hashPassword, randomToken, tokenHash } from "@project/auth/password";
/*
 * Import connection: ./schemas/business -> packages/domain/src/schemas/business.ts.
 * CreateBusiness: Zod contract for validating the resource request before its domain write.
 */
import { CreateBusiness } from "./schemas/business";
/*
 * Import connection: ./errors -> packages/domain/src/errors.ts.
 * DomainError: Deliberate safe domain failure carrying an allowed public code/message.
 */
import { DomainError } from "./errors";
/*
 * Import connection: ./website-templates -> packages/domain/src/website-templates.ts.
 * WEBSITE_TEMPLATE_KEYS: Allowlist of the four accepted website template keys.
 */
import { WEBSITE_TEMPLATE_KEYS } from "./website-templates";

const email = z.string().trim().toLowerCase().email().max(254);
// Shared email/password/account-choice validator used by the login API.
export const PasswordLogin = z.object({ email, password: z.string().min(1).max(128), accountType: z.enum(["developer", "owner"]).optional() }).strict();
// Shared new-password and confirmation validator for the activation API.
export const ChangePassword = z.object({ password: z.string().min(15, "Use at least 15 characters.").max(128), confirmation: z.string() })
  .refine(value => value.password === value.confirmation, { message: "Passwords must match.", path: ["confirmation"] });
// Shared business/owner/website validator used before transactional provisioning.
export const ProvisionBusiness = CreateBusiness.extend({
  email, owner_email: email, description: z.string().trim().min(1, "Describe the business.").max(1000),
  website_template: z.enum(WEBSITE_TEMPLATE_KEYS).default("CONTACT"),
  public_address: z.string().trim().max(300).optional(),
  opening_hours: z.string().trim().max(500).optional(),
}).strict();
// Type contract: ProvisionBusinessInput. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type ProvisionBusinessInput = z.input<typeof ProvisionBusiness>;

/*
 * Checks the persisted developer role and completed password setup. Being a developer is separate from
 * holding a grant for a particular business.
 */
export async function requireDeveloper(userId: string, tx: Prisma.TransactionClient = prisma) {
  const developer = await tx.user.findFirst({ where: { id: userId, isDeveloper: true, mustChangePassword: false } });
  if (!developer) throw new DomainError("NOT_FOUND", "Resource not found");
  return developer;
}

const ownerSelection = { where: { role: "OWNER" as const, is_active: true }, select: {
  email: true, user_id: true, user: { select: { mustChangePassword: true, temporaryExpiresAt: true } },
} };

/*
 * Lists configured Clientflow websites through this developer's explicit business grants.
 * This powers dashboard cards and totals, not owner CRM membership.
 */
export async function listProvisionedBusinesses(userId: string) {
  await requireDeveloper(userId);
  return prisma.business.findMany({ where: { websiteTemplate: { not: null }, developerAccess: { some: { developerId: userId } } },
    include: { employees: ownerSelection, demoSubscription: true }, orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });
}

/*
 * Loads one business only when this developer has its explicit grant. Missing and foreign IDs produce the
 * same not-found domain error.
 */
export async function getProvisionedBusiness(userId: string, businessId: string) {
  await requireDeveloper(userId);
  const business = await prisma.business.findFirst({ where: { id: businessId, developerAccess: { some: { developerId: userId } } }, include: { employees: ownerSelection } });
  if (!business) throw new DomainError("NOT_FOUND", "Resource not found");
  return business;
}

/*
 * Creates business, owner login, owner membership, website selection, and developer grants in one
 * transaction. Returns a generated temporary credential for the one-time handoff.
 */
export async function provisionBusiness(userId: string, input: ProvisionBusinessInput, activation: "password" | "link" = "password") {
  await requireDeveloper(userId);
  const website = ProvisionBusiness.parse(input);
  input = website;
  const temporaryPassword = randomToken();
  const passwordHash = await hashPassword(temporaryPassword);
  const setupToken = activation === "link" ? randomToken() : null;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const business = await prisma.$transaction(async tx => {
    await requireDeveloper(userId, tx);
    const existing = await tx.user.findFirst({ where: { OR: [
      { email: { equals: input.owner_email, mode: "insensitive" } },
      { username: { equals: input.owner_email, mode: "insensitive" } },
      { employees: { some: { email: { equals: input.owner_email, mode: "insensitive" } } } },
    ] } });
    if (existing) throw new DomainError("CONFLICT", "This owner email is already associated with an account. No account has been changed.");
    const owner = await tx.user.create({ data: { email: input.owner_email, name: `${input.first_name} ${input.last_name}`,
      passwordHash: setupToken ? null : passwordHash, setupTokenHash: setupToken ? tokenHash(setupToken) : null,
      mustChangePassword: true, temporaryExpiresAt: expiresAt,
    } });
    const result = await tx.business.create({ data: { name: input.name, description: input.description, email: input.email,
      phone_number: input.phone_number, business_type: input.business_type,
      websiteTemplate: website.website_template, publicAddress: website.public_address ?? "", openingHours: website.opening_hours ?? "",
      employees: { create: { user_id: owner.id, first_name: input.first_name, last_name: input.last_name,
        email: input.owner_email, phone_number: input.phone_number, role: "OWNER", hire_date: new Date() } },
    } });
    const developers = await tx.user.findMany({ where: { isDeveloper: true }, select: { id: true } });
    await tx.developerBusinessAccess.createMany({ data: developers.map(developer => ({ developerId: developer.id, businessId: result.id })) });
    return result;
  });
  return { business, temporaryPassword: setupToken ? "" : temporaryPassword,
    setupPath: setupToken ? `/setup-password#token=${setupToken}` : undefined,
    ownerEmail: input.owner_email, expiresAt: expiresAt.toISOString() };
}

/*
 * Replaces an unconsumed pending-owner credential and revokes its tickets after rechecking developer access.
 * Refuses an active owner password reset.
 */
export async function regenerateOwnerPassword(userId: string, businessId: string, activation: "password" | "link" = "password") {
  const business = await getProvisionedBusiness(userId, businessId);
  const owner = business.employees[0];
  if (!owner?.user.mustChangePassword) throw new DomainError("CONFLICT", "An active owner's password cannot be reset here.");
  const temporaryPassword = randomToken();
  const passwordHash = await hashPassword(temporaryPassword);
  const setupToken = activation === "link" ? randomToken() : null;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$transaction(async tx => {
    await requireDeveloper(userId, tx);
    const grant = await tx.developerBusinessAccess.findUnique({ where: { developerId_businessId: { developerId: userId, businessId } } });
    if (!grant) throw new DomainError("NOT_FOUND", "Resource not found");
    const changed = await tx.user.updateMany({ where: { id: owner.user_id, mustChangePassword: true }, data: {
      passwordHash: setupToken ? null : passwordHash, setupTokenHash: setupToken ? tokenHash(setupToken) : null,
      temporaryExpiresAt: expiresAt, temporaryConsumedAt: null,
    } });
    if (!changed.count) throw new DomainError("CONFLICT", "This account is already active.");
    await tx.session.deleteMany({ where: { userId: owner.user_id } });
  });
  return { business, temporaryPassword: setupToken ? "" : temporaryPassword,
    setupPath: setupToken ? `/setup-password#token=${setupToken}` : undefined,
    ownerEmail: owner.email, expiresAt: expiresAt.toISOString() };
}
