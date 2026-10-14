import { z } from "zod";

export const CreateInteraction = z.object({
  type: z.enum(["CALL", "TEXT", "EMAIL", "DM"]),
  subject: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10000),
  interaction_date: z.coerce.date().optional(),
});

export type CreateInteractionInput = z.infer<typeof CreateInteraction>;
