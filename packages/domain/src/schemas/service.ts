import { z } from "zod";

export const CreateService = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(""),
  duration_minutes: z.number().int().positive().max(1440),
  base_price: z.number().nonnegative(),
  is_active: z.boolean().default(true),
});

export type CreateServiceInput = z.infer<typeof CreateService>;
