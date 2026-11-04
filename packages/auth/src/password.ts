import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key));
});
export const randomToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  const [algorithm, salt, hex] = stored?.split("$") ?? [];
  const valid = algorithm === "scrypt" && /^[a-f0-9]{32}$/.test(salt ?? "") && /^[a-f0-9]{128}$/.test(hex ?? "");
  // Unknown identities do equivalent work without a usable stored credential.
  const key = await derive(password, valid ? salt : "0".repeat(32));
  return timingSafeEqual(key, valid ? Buffer.from(hex, "hex") : Buffer.alloc(64)) && valid;
}
