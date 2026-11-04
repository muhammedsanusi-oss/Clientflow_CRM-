import { z } from "zod";
import { prisma, type Prisma } from "@project/db";
import { hashPassword, randomToken } from "@project/auth/password";
import { CreateBusiness } from "./schemas/business";
import { DomainError } from "./errors";
import { WEBSITE_TEMPLATE_KEYS } from "./website-templates";

const email = z.string().trim().toLowerCase().email().max(254);
export const PasswordLogin = z.object({ email, password: z.string().min(1).max(128), accountType: z.enum(["developer", "owner"]).optional() }).strict();
export const ChangePassword = z.object({ password: z.string().min(15, "Use at least 15 characters.").max(128), confirmation: z.string() })
  .refine(value => value.password === value.confirmation, { message: "Passwords must match.", path: ["confirmation"] });
export const ProvisionBusiness = CreateBusiness.extend({
  email, owner_email: email, description: z.string().trim().min(1, "Describe the business.").max(1000),
  website_template: z.enum(WEBSITE_TEMPLATE_KEYS).default("CONTACT"),
  public_address: z.string().trim().max(300).optional(),
  opening_hours: z.string().trim().max(500).optional(),
}).strict();
export type ProvisionBusinessInput = z.input<typeof ProvisionBusiness>;

export async function requireDeveloper(userId: string, tx: Prisma.TransactionClient = prisma) {
  const developer = await tx.user.findFirst({ where: { id: userId, isDeveloper: true, mustChangePassword: false } });
  if (!developer) throw new DomainError("NOT_FOUND", "Resource not found");
  return developer;
}

const ownerSelection = { where: { role: "OWNER" as const, is_active: true }, select: {
  email: true, user_id: true, user: { select: { mustChangePassword: true, temporaryExpiresAt: true } },
} };

export async function listProvisionedBusinesses(userId: string) {
  await requireDeveloper(userId);
  return prisma.business.findMany({ where: { developerAccess: { some: { developerId: userId } } },
    include: { employees: ownerSelection }, orderBy: [{ created_at: "desc" }, { id: "desc" }],
  });
}

export async function getProvisionedBusiness(userId: string, businessId: string) {
  await requireDeveloper(userId);
  const business = await prisma.business.findFirst({ where: { id: businessId, developerAccess: { some: { developerId: userId } } }, include: { employees: ownerSelection } });
  if (!business) throw new DomainError("NOT_FOUND", "Resource not found");
  return business;
}

export async function provisionBusiness(userId: string, input: ProvisionBusinessInput) {
  await requireDeveloper(userId);
  const website = ProvisionBusiness.parse(input);
  input = website;
  const temporaryPassword = randomToken();
  const passwordHash = await hashPassword(temporaryPassword);
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
      passwordHash, mustChangePassword: true, temporaryExpiresAt: expiresAt,
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
  return { business, temporaryPassword, ownerEmail: input.owner_email, expiresAt: expiresAt.toISOString() };
}

export async function regenerateOwnerPassword(userId: string, businessId: string) {
  const business = await getProvisionedBusiness(userId, businessId);
  const owner = business.employees[0];
  if (!owner?.user.mustChangePassword) throw new DomainError("CONFLICT", "An active owner's password cannot be reset here.");
  const temporaryPassword = randomToken();
  const passwordHash = await hashPassword(temporaryPassword);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$transaction(async tx => {
    await requireDeveloper(userId, tx);
    const grant = await tx.developerBusinessAccess.findUnique({ where: { developerId_businessId: { developerId: userId, businessId } } });
    if (!grant) throw new DomainError("NOT_FOUND", "Resource not found");
    const changed = await tx.user.updateMany({ where: { id: owner.user_id, mustChangePassword: true }, data: {
      passwordHash, temporaryExpiresAt: expiresAt, temporaryConsumedAt: null,
    } });
    if (!changed.count) throw new DomainError("CONFLICT", "This account is already active.");
    await tx.session.deleteMany({ where: { userId: owner.user_id } });
  });
  return { business, temporaryPassword, ownerEmail: owner.email, expiresAt: expiresAt.toISOString() };
}
