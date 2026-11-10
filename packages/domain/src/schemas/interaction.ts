/*
 * Code guide: packages/domain/src/schemas/interaction.ts
 * Validates a customer communication record: channel, subject, content, and optional occurrence date. The
 * author membership is resolved by the query layer.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

// Validates a customer communication record: channel, subject, content, and optional occurrence date. The
// author membership is resolved by the query layer.
export const CreateInteraction = z.object({
  type: z.enum(["CALL", "TEXT", "EMAIL", "DM"]),
  subject: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10000),
  interaction_date: z.coerce.date().optional(),
});

// Type contract: CreateInteractionInput. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type CreateInteractionInput = z.infer<typeof CreateInteraction>;
