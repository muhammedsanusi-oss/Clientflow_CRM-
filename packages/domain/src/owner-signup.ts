/*
 * Local-only owner signup for the website onboarding demo. Signup is deliberately
 * unavailable outside development until email verification is implemented.
 */
import { z } from "zod";
import { prisma } from "@project/db";
import { hashPassword } from "@project/auth/password";
import { DomainError } from "./errors";
import { CreateBusiness } from "./schemas/business";
import { WEBSITE_TEMPLATE_KEYS } from "./website-templates";
import { WebsitePlanSchema } from "./website-plans";
import { createPendingDemoSubscription } from "./demo-subscriptions";

const email = z.string().trim().toLowerCase().email().max(254);

export const OwnerSignup = CreateBusiness.extend({
  email,
  owner_email: email,
  password: z.string().min(15, "Use at least 15 characters.").max(128),
  password_confirmation: z.string(),
  description: z.string().trim().min(1, "Describe the business.").max(1000),
  website_template: z.enum(WEBSITE_TEMPLATE_KEYS).default("CONTACT"),
  website_plan: WebsitePlanSchema,
  public_address: z.string().trim().max(300).optional(),
  opening_hours: z.string().trim().max(500).optional(),
  billing_street: z.string().trim().min(1, "Street is required.").max(200),
  billing_apt_suite: z.string().trim().max(100).optional(),
  billing_city: z.string().trim().min(1, "City is required.").max(100),
  billing_state: z.string().trim().min(1, "State is required.").max(100),
  billing_zip: z.string().trim().min(1, "ZIP code is required.").max(20),
}).strict().refine(value => value.password === value.password_confirmation, {
  message: "Passwords must match.",
  path: ["password_confirmation"],
});

export type OwnerSignupInput = z.input<typeof OwnerSignup>;
export type ParsedOwnerSignup = z.output<typeof OwnerSignup>;

export function isLocalOwnerSignupEnabled() {
  return process.env.NODE_ENV === "development";
}

/*
 * Creates a local-demo owner and one private business atomically. The email is
 * stored as the login identity; membership is the authorization boundary.
 */
export async function createLocalOwnerSignup(input: OwnerSignupInput) {
  if (!isLocalOwnerSignupEnabled()) throw new DomainError("NOT_FOUND", "Resource not found");
  const signup = OwnerSignup.parse(input);
  const passwordHash = await hashPassword(signup.password);
  const ownerEmail = signup.owner_email;

  return prisma.$transaction(async tx => {
    const existing = await tx.user.findFirst({ where: { OR: [
      { email: { equals: ownerEmail, mode: "insensitive" } },
      { username: { equals: ownerEmail, mode: "insensitive" } },
      { employees: { some: { email: { equals: ownerEmail, mode: "insensitive" } } } },
    ] } });
    if (existing) throw new DomainError("CONFLICT", "An account already uses this email. Sign in instead.");

    const owner = await tx.user.create({ data: {
      email: ownerEmail,
      name: `${signup.first_name} ${signup.last_name}`,
      passwordHash,
    } });
    const business = await tx.business.create({ data: {
      name: signup.name,
      description: signup.description,
      email: signup.email,
      phone_number: signup.phone_number,
      business_type: signup.business_type,
      websiteTemplate: signup.website_template,
      websitePlan: signup.website_plan,
      publicAddress: signup.public_address ?? "",
      openingHours: signup.opening_hours ?? "",
      billingAddress: { create: {
        street: signup.billing_street,
        apartmentSuite: signup.billing_apt_suite ?? "",
        city: signup.billing_city,
        state: signup.billing_state,
        zipCode: signup.billing_zip,
      } },
      employees: { create: {
        user_id: owner.id,
        first_name: signup.first_name,
        last_name: signup.last_name,
        email: ownerEmail,
        phone_number: signup.phone_number,
        role: "OWNER",
        hire_date: new Date(),
      } },
    } });

    const developers = await tx.user.findMany({ where: { isDeveloper: true }, select: { id: true } });
    await createPendingDemoSubscription(tx, business.id, owner.id,
      ({ FREE: "STANDARD", PLUS: "CRM", PREMIUM: "MANAGED" } as const)[signup.website_plan]);
    if (developers.length) {
      await tx.developerBusinessAccess.createMany({
        data: developers.map(developer => ({ developerId: developer.id, businessId: business.id })),
      });
    }

    return { business, ownerId: owner.id, ownerEmail };
  });
}
