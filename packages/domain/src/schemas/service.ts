/*
 * Code guide: packages/domain/src/schemas/service.ts
 * Validates a business service catalogue entry, including duration, nonnegative base price, and active flag.
 * Appointment creation copies its price into a booking snapshot.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

// Validates a business service catalogue entry, including duration, nonnegative base price, and active flag.
// Appointment creation copies its price into a booking snapshot.
export const CreateService = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(""),
  duration_minutes: z.number().int().positive().max(1440),
  base_price: z.number().nonnegative(),
  is_active: z.boolean().default(true),
});

// Type contract: CreateServiceInput. Describes values accepted/returned by the code below; TypeScript removes
// this declaration from the runtime bundle.
export type CreateServiceInput = z.infer<typeof CreateService>;
