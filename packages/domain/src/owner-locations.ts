// Owner booking setup reuses Location storage without granting staff or developers owner rights.
import { z } from "zod";
import { domainDatabase as prisma } from "./queries/membership";
import { crmEntitlementWhere } from "./subscription-access";
import { DomainError } from "./errors";

export const OwnerLocationInput = z.object({
  businessId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1, "Enter a location name.").max(100),
  address: z.string().trim().min(1, "Enter the location address.").max(300),
  phone_number: z.string().trim().max(30).default(""),
  email: z.union([z.string().trim().toLowerCase().email().max(254), z.literal("")]).default(""),
}).strict();

export async function createOwnerLocation(userId: string, input: z.input<typeof OwnerLocationInput>) {
  const value = OwnerLocationInput.parse(input);
  return prisma.$transaction(async tx => {
    const business = await tx.business.findFirst({ where: {
      id: value.businessId, ...crmEntitlementWhere(),
      employees: { some: { user_id: userId, is_active: true, role: "OWNER", user: { mustChangePassword: false } } },
    }, select: { id: true } });
    if (!business) throw new DomainError("NOT_FOUND", "Business not found");
    return tx.location.create({ data: {
      business_id: business.id, name: value.name, address: value.address,
      phone_number: value.phone_number || null, email: value.email || null,
    } });
  });
}
