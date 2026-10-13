import { z } from "zod";

export const CreateNote = z.object({
  content: z.string().trim().min(1).max(10000),
  note_date: z.coerce.date().optional(),
});

export type CreateNoteInput = z.infer<typeof CreateNote>;
