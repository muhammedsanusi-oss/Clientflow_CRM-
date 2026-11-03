// Normalization for legacy usernames; this schema does not authenticate users.
import { z } from "zod";

export const Username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9_-]{2,29}$/,
    "3–30 characters: a–z, 0–9, - or _, starting with a letter or number"
  );
