/*
 * Code guide: packages/domain/src/schemas/business.ts
 * Validates the shared business contact/type and initial owner-name fields. provisioning.ts extends this
 * contract with the private owner login email and website configuration.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

// Validates the shared business contact/type and initial owner-name fields. provisioning.ts extends this
// contract with the private owner login email and website configuration.
export const CreateBusiness = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  first_name: z.string().trim().min(1, "First name is required").max(50, "First name must be at most 50 characters"),
  last_name: z.string().trim().min(1, "Last name is required").max(50, "Last name must be at most 50 characters"),
  email: z.string().trim().email("Invalid email address"),
  phone_number: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),
  business_type: z.enum(["SPA", "SALON", "CLINIC", "BARBERSHOP", "OTHER", "BAKERY"]),
});

// Type contract: CreateBusinessInput. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type CreateBusinessInput = z.infer<typeof CreateBusiness>;
