/*
 * Code guide: packages/domain/src/schemas/user.ts
 * Retained legacy username validation. The current /login screen uses PasswordLogin in provisioning.ts and
 * authenticate in packages/auth/src/credentials.ts; the older sign-in comments below describe a previous
 * flow.
 */
// Validation for the sign-in input. Usernames are normalized (trimmed,
// lowercased) before they hit the unique index, so "Ada" and "ada" are the
// same account — normalization is a validation concern, not a UI concern.
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

export const Username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9_-]{2,29}$/,
    "3–30 characters: a–z, 0–9, - or _, starting with a letter or number"
  );

export const SignIn = z.object({
  // Preserve existing short usernames while allowing employee email accounts.
  username: z.union([Username, z.string().trim().toLowerCase().email()]),
});

// Type contract: SignInInput. Describes values accepted/returned by the code below; TypeScript removes this
// declaration from the runtime bundle.
export type SignInInput = z.infer<typeof SignIn>;
