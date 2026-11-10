/*
 * Code guide: packages/domain/src/schemas/customer.ts
 * Validates the snake_case business API customer payload. The browser customer workflow has its camelCase
 * input contract in customers.ts; both eventually write business-owned Customer rows.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

// Validates the snake_case business API customer payload. The browser customer workflow has its camelCase
// input contract in customers.ts; both eventually write business-owned Customer rows.
export const CreateCustomer = z.object({
  first_name: z.string().min(1, "First name is required").max(50, "First name must be at most 50 characters"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name must be at most 50 characters"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  preferred_contact_method: z.enum(["PHONE", "EMAIL", "TEXT"]),
});

// Type contract: CreateCustomerInput. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type CreateCustomerInput = z.infer<typeof CreateCustomer>;