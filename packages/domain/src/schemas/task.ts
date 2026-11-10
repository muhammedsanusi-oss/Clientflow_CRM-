/*
 * Code guide: packages/domain/src/schemas/task.ts
 * Validates a customer follow-up task and assignee/due date/status. The query layer checks the customer and
 * employee belong to the requested business.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

// Validates a customer follow-up task and assignee/due date/status. The query layer checks the customer and
// employee belong to the requested business.
export const CreateTask = z.object({
  customer_id: z.string().min(1),
  employee_id: z.string().min(1),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000).default(""),
  due_date: z.coerce.date(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"]).default("PENDING"),
});

// Type contract: CreateTaskInput. Describes values accepted/returned by the code below; TypeScript removes
// this declaration from the runtime bundle.
export type CreateTaskInput = z.infer<typeof CreateTask>;
