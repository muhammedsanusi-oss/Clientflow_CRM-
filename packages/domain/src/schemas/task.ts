import { z } from "zod";

export const CreateTask = z.object({
  customer_id: z.string().min(1),
  employee_id: z.string().min(1),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).default(""),
  due_date: z.coerce.date(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"]).default("PENDING"),
});

export type CreateTaskInput = z.infer<typeof CreateTask>;
