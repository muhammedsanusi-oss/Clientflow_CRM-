import { prisma, type Prisma } from "@project/db";
import { hashPassword, verifyPassword, randomToken, tokenHash } from "./password";
import { isLocalTestAccount } from "./test-accounts";

const REGULAR_TTL = 30 * 24 * 60 * 60 * 1000;
const ACTIVATION_TTL = 15 * 60 * 1000;
export class AuthenticationError extends Error {
  constructor(public code: "INVALID_CREDENTIALS" | "RATE_LIMITED" | "VALIDATION" | "UNAUTHENTICATED", message: string) { super(message); }
}

// Persisted and atomic across processes, including attempts for unknown emails.
export async function checkAttempt(key: string) {
  const digest = tokenHash(key);
  const cutoff = new Date(Date.now() - ACTIVATION_TTL);
  const now = new Date();
  const result = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthThrottle" ("key", "attempts", "windowStart") VALUES (${digest}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN 1 ELSE "AuthThrottle"."attempts" + 1 END,
      "windowStart" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN ${now} ELSE "AuthThrottle"."windowStart" END
    RETURNING "attempts"`;
  if (result[0].attempts > 10) throw new AuthenticationError("RATE_LIMITED", "Too many attempts. Try again in 15 minutes.");
}

async function createSession(tx: Prisma.TransactionClient, userId: string, restricted: boolean) {
  const token = randomToken();
  const expires = new Date(Date.now() + (restricted ? ACTIVATION_TTL : REGULAR_TTL));
  await tx.session.create({ data: { userId, restricted, sessionToken: tokenHash(token), expires } });
  return { token, expires, restricted };
}

export async function authenticate(email: string, password: string, accountType?: "developer" | "owner") {
  await checkAttempt(`login:${email}`);
  const user = await prisma.user.findUnique({ where: { email } });
  const correctPassword = await verifyPassword(password, user?.passwordHash ?? null);
  if (!correctPassword || (user && isLocalTestAccount(user.id) && process.env.NODE_ENV !== "development")
    || (user && accountType && user.isDeveloper !== (accountType === "developer"))) {
    throw new AuthenticationError("INVALID_CREDENTIALS", "Email or password is incorrect, or the temporary password has expired.");
  }
  return prisma.$transaction(async tx => {
    if (!user) throw new AuthenticationError("INVALID_CREDENTIALS", "Email or password is incorrect.");
    const claimed = await tx.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash, ...(user.mustChangePassword ? {
        mustChangePassword: true, temporaryConsumedAt: null, temporaryExpiresAt: { gt: new Date() },
      } : { mustChangePassword: false }) },
      data: user.mustChangePassword ? { temporaryConsumedAt: new Date() } : { passwordHash: user.passwordHash },
    });
    if (!claimed.count) throw new AuthenticationError("INVALID_CREDENTIALS", "Email or password is incorrect, or the temporary password has expired.");
    const session = await createSession(tx, user.id, user.mustChangePassword);
    return { ...session, redirectTo: user.mustChangePassword ? "/change-password" : user.isDeveloper ? "/" : "/customers" };
  });
}

export async function replaceTemporaryPassword(token: string, password: string) {
  await checkAttempt(`activate:${tokenHash(token)}`);
  const session = await prisma.session.findUnique({ where: { sessionToken: tokenHash(token) }, include: { user: true } });
  if (!session?.restricted || session.expires <= new Date() || !session.user.mustChangePassword) {
    throw new AuthenticationError("UNAUTHENTICATED", "Sign in again or ask your developer for a new temporary password.");
  }
  if (await verifyPassword(password, session.user.passwordHash)) throw new AuthenticationError("VALIDATION", "Choose a different password from your temporary password.");
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async tx => {
    const claimed = await tx.session.deleteMany({ where: { sessionToken: tokenHash(token), restricted: true, expires: { gt: new Date() } } });
    if (!claimed.count) throw new AuthenticationError("UNAUTHENTICATED", "Sign in again.");
    const changed = await tx.user.updateMany({ where: { id: session.userId, mustChangePassword: true, passwordHash: session.user.passwordHash }, data: {
      passwordHash, mustChangePassword: false, temporaryExpiresAt: null, temporaryConsumedAt: null,
    } });
    if (!changed.count) throw new AuthenticationError("UNAUTHENTICATED", "Sign in again.");
    await tx.session.deleteMany({ where: { userId: session.userId } });
    return createSession(tx, session.userId, false);
  });
}
