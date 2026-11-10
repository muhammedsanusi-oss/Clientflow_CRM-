/*
 * Code guide: packages/auth/src/password.ts
 * Node cryptography helpers only: random tokens, token digests, salted scrypt hashes, and timing-safe
 * verification. This module does not read the database or set cookies.
 */
/*
 * Import connection: node:crypto.
 * Built-in Node cryptography: secure random bytes, password derivation, digests, and timing-safe comparison;
 * no network service is called.
 */
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key));
});
export const randomToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

/*
 * Creates a random salt and derives a scrypt key. Returns a stored hash format, never the plaintext password.
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

/*
 * Derives the submitted password key and compares it with timing-safe equality. Unknown accounts perform
 * comparable hashing work without gaining a usable credential.
 */
export async function verifyPassword(password: string, stored: string | null) {
  const [algorithm, salt, hex] = stored?.split("$") ?? [];
  const valid = algorithm === "scrypt" && /^[a-f0-9]{32}$/.test(salt ?? "") && /^[a-f0-9]{128}$/.test(hex ?? "");
  // Unknown identities do equivalent work without a usable stored credential.
  const key = await derive(password, valid ? salt : "0".repeat(32));
  return timingSafeEqual(key, valid ? Buffer.from(hex, "hex") : Buffer.alloc(64)) && valid;
}
