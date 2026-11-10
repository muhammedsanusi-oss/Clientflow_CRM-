/*
 * Code guide: packages/auth/src/credentials.ts
 * Credential and activation workflow behind the auth API. Combines salted password hashes, persisted attempt
 * limits, single-use activation, and transactional session creation; never treats a submitted account type as
 * a new privilege.
 */
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 * Type Prisma: Generated TypeScript query/transaction types; a type import does not open another connection.
 * Defined in packages/db/src/generated/prisma.
 */
import { prisma, type Prisma } from "@project/db";
/*
 * Import connection: ./password -> packages/auth/src/password.ts.
 * hashPassword: Creates a random salt and derives a scrypt key. Returns a stored hash format, never the
 * plaintext password.
 * verifyPassword: Derives the submitted password key and compares it with timing-safe equality. Unknown
 * accounts perform comparable hashing work without gaining a usable credential.
 * randomToken: Generates a cryptographically random base64url ticket or temporary credential.
 * tokenHash: Hashes opaque tickets before database lookup/storage; raw cookie tokens are not stored as
 * session keys.
 */
import { hashPassword, verifyPassword, randomToken, tokenHash } from "./password";
/*
 * Import connection: ./test-accounts -> packages/auth/src/test-accounts.ts.
 * isLocalTestAccount: Identifies the fixed synthetic account IDs so authentication and session lookup can
 * disable them outside development.
 */
import { isLocalTestAccount } from "./test-accounts";

const REGULAR_TTL = 30 * 24 * 60 * 60 * 1000;
const ACTIVATION_TTL = 15 * 60 * 1000;
export class AuthenticationError extends Error {
  constructor(public code: "INVALID_CREDENTIALS" | "RATE_LIMITED" | "VALIDATION" | "UNAUTHENTICATED", message: string) { super(message); }
}

// Persisted and atomic across processes, including attempts for unknown emails.
/*
 * Atomically increments a persisted, hashed-key counter. Login and activation are limited to ten attempts in
 * a fifteen-minute window.
 */
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

/*
 * Generates a random session token, stores only its digest with expiry and restriction state, and returns the
 * raw token for the cookie.
 */
async function createSession(tx: Prisma.TransactionClient, userId: string, restricted: boolean) {
  const token = randomToken();
  const expires = new Date(Date.now() + (restricted ? ACTIVATION_TTL : REGULAR_TTL));
  await tx.session.create({ data: { userId, restricted, sessionToken: tokenHash(token), expires } });
  return { token, expires, restricted };
}

/*
 * Checks persisted login throttling, verifies the password and selected account role, claims valid activation
 * credentials when needed, and creates an opaque database session.
 */
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
    return { ...session, redirectTo: user.mustChangePassword ? "/change-password" : user.isDeveloper ? "/" : "/owner" };
  });
}

/*
 * Validates an unexpired restricted ticket, stores the new salted password hash, consumes activation state,
 * revokes prior sessions, and issues a regular session atomically.
 */
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

// The fragment token is not a session: only a successful POST can activate it.
export async function completeOwnerSetup(token: string, password: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new AuthenticationError("UNAUTHENTICATED", "This setup link is invalid or expired. Ask your developer for a new link.");
  }
  if (password.length < 15 || password.length > 128) throw new AuthenticationError("VALIDATION", "Use 15 to 128 characters.");
  await checkAttempt(`setup:${tokenHash(token)}`);
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async tx => {
    const owner = await tx.user.findUnique({ where: { setupTokenHash: tokenHash(token) }, select: { id: true } });
    if (!owner) throw new AuthenticationError("UNAUTHENTICATED", "This setup link is invalid or expired. Ask your developer for a new link.");
    const claimed = await tx.user.updateMany({
      where: { id: owner.id, setupTokenHash: tokenHash(token), mustChangePassword: true,
        isDeveloper: false, temporaryExpiresAt: { gt: new Date() } },
      data: { passwordHash, mustChangePassword: false, setupTokenHash: null,
        temporaryExpiresAt: null, temporaryConsumedAt: null },
    });
    if (!claimed.count) throw new AuthenticationError("UNAUTHENTICATED", "This setup link is invalid or expired. Ask your developer for a new link.");
    await tx.session.deleteMany({ where: { userId: owner.id } });
    return createSession(tx, owner.id, false);
  });
}
