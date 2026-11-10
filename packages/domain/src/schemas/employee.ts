/*
 * Code guide: packages/domain/src/schemas/employee.ts
 * Validates staff contact details and role for the employee API. Contact email is normalized, but this schema
 * does not create credentials or grant privileges by itself.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

// Validates staff contact details and role for the employee API. Contact email is normalized, but this schema
// does not create credentials or grant privileges by itself.
export const CreateEmployee = z.object({
    firstName: z.string().min(1, "First name is required").max(50, "First name must be at most 50 characters"),
    lastName: z.string().min(1, "Last name is required").max(50, "Last name must be at most 50 characters"),
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    phone_number: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),
    role: z.enum(["OWNER", "MANAGER", "STAFF"])
});

// Type contract: CreateEmployeeInput. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type CreateEmployeeInput = z.infer<typeof CreateEmployee>;
