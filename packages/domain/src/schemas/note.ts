/*
 * Code guide: packages/domain/src/schemas/note.ts
 * Validates customer-note content and optional note date for the nested API. Customer ID and author
 * membership are supplied/verified by its route and query.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

// Validates customer-note content and optional note date for the nested API. Customer ID and author
// membership are supplied/verified by its route and query.
export const CreateNote = z.object({
  content: z.string().trim().min(1).max(10000),
  note_date: z.coerce.date().optional(),
});

// Type contract: CreateNoteInput. Describes values accepted/returned by the code below; TypeScript removes
// this declaration from the runtime bundle.
export type CreateNoteInput = z.infer<typeof CreateNote>;
