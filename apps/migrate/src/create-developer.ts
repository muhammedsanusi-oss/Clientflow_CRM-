// Explicit local account bootstrap. Password input is hidden and never logged.
import { createInterface } from "node:readline/promises";
import { prisma } from "@project/db";
import { hashPassword } from "@project/auth/password";

async function hiddenPassword(label: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error("Run this command in an interactive terminal.");
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => { process.stdin.off("data", onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); };
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\u0003") { finish(); reject(new Error("Cancelled.")); return; }
        if (char === "\r" || char === "\n") { finish(); resolve(value); return; }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " " && value.length < 129) value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const email = (await prompt.question("Developer email: ")).trim().toLowerCase();
  prompt.close();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid email.");
  const password = await hiddenPassword("Password (15-128 characters, hidden): ");
  const confirmation = await hiddenPassword("Confirm password (hidden): ");
  if (password.length < 15 || password.length > 128 || password !== confirmation) throw new Error("Passwords must match and contain 15-128 characters.");
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async tx => {
    const existing = await tx.user.findFirst({ where: { OR: [{ email: { equals: email, mode: "insensitive" } }, { username: { equals: email, mode: "insensitive" } }] } });
    if (existing) throw new Error("An account already uses this email. It has not been modified.");
    const developer = await tx.user.create({ data: { email, name: email, passwordHash, isDeveloper: true } });
    // A teammate provisioned later receives the existing project business grants.
    const businesses = await tx.business.findMany({ where: { developerAccess: { some: {} } }, select: { id: true } });
    if (businesses.length) await tx.developerBusinessAccess.createMany({ data: businesses.map(business => ({ businessId: business.id, developerId: developer.id })) });
  });
  console.log("Developer account created. Sign in at /login.");
}

main().catch(error => {
  // Database exceptions may contain row values; only local validation is displayed.
  const safe = error instanceof Error && !error.name.startsWith("Prisma") ? error.message : "Could not create developer. Check the database and use a new email.";
  console.error(safe); process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
