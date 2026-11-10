/*
 * Code guide: packages/auth/src/current-user.ts
 * Server-side bridge from the browser cookie to a persisted session. Page/API/action callers use
 * currentUserId for regular private access; currentSession also supports restricted password activation.
 */
/*
 * Import connection: next/headers.
 * Next.js request-context access to cookies; used only on the server to read/set session tickets.
 * cookies: Reads/writes request cookies on the server; used to carry the opaque session ticket.
 */
import { cookies } from "next/headers";
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
/*
 * Import connection: ./password -> packages/auth/src/password.ts.
 * tokenHash: Hashes opaque tickets before database lookup/storage; raw cookie tokens are not stored as
 * session keys.
 */
import { tokenHash } from "./password";
/*
 * Import connection: ./test-accounts -> packages/auth/src/test-accounts.ts.
 * isLocalTestAccount: Identifies the fixed synthetic account IDs so authentication and session lookup can
 * disable them outside development.
 */
import { isLocalTestAccount } from "./test-accounts";

// Name of the browser cookie carrying the opaque session ticket; its value is not a user ID or password.
export const SESSION_COOKIE = "clientflow_session";
/*
 * Reads the raw opaque token from the HTTP-only session cookie for server-side session lookup or revocation.
 */
export async function sessionToken() { return (await cookies()).get(SESSION_COOKIE)?.value ?? null; }
/*
 * Reads the opaque cookie, hashes its token, and loads its persisted session plus limited user role data.
 * Rejects expired tickets and fixed test identities outside development.
 */
export async function currentSession() {
  const token = await sessionToken();
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await prisma.session.findUnique({ where: { sessionToken: tokenHash(token) }, include: {
    user: { select: { id: true, isDeveloper: true, mustChangePassword: true } },
  } });
  if (session && isLocalTestAccount(session.userId) && process.env.NODE_ENV !== "development") return null;
  return session && session.expires > new Date() ? session : null;
}
// Restricted activation tickets never authorize CRM entry points.
/*
 * Resolves the current database session and returns its user ID only for a regular, unexpired session.
 * Activation-only tickets cannot authorize private CRM operations.
 */
export async function currentUserId(): Promise<string | null> {
  // Read the current session, including restricted activation state where this screen needs it.
  const session = await currentSession();
  return session && !session.restricted && !session.user.mustChangePassword ? session.userId : null;
}
/*
 * Sets the session cookie with expiry, HTTP-only and SameSite protections; production cookies also require
 * HTTPS.
 */
export async function startSession(session: { token: string; expires: Date }) {
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true, sameSite: "lax", path: "/", expires: session.expires,
    secure: process.env.NODE_ENV === "production",
  });
}
/*
 * Revokes the matching persisted session and clears the browser cookie. This is the implementation used by
 * logout, not a user-data deletion operation.
 */
export async function endSession() {
  const token = await sessionToken();
  if (token) await prisma.session.deleteMany({ where: { sessionToken: tokenHash(token) } });
  (await cookies()).delete(SESSION_COOKIE);
}
