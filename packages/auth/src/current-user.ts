import { cookies } from "next/headers";
import { prisma } from "@project/db";
import { tokenHash } from "./password";
import { isLocalTestAccount } from "./test-accounts";

export const SESSION_COOKIE = "clientflow_session";
export async function sessionToken() { return (await cookies()).get(SESSION_COOKIE)?.value ?? null; }
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
export async function currentUserId(): Promise<string | null> {
  const session = await currentSession();
  return session && !session.restricted && !session.user.mustChangePassword ? session.userId : null;
}
export async function startSession(session: { token: string; expires: Date }) {
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true, sameSite: "lax", path: "/", expires: session.expires,
    secure: process.env.NODE_ENV === "production",
  });
}
export async function endSession() {
  const token = await sessionToken();
  if (token) await prisma.session.deleteMany({ where: { sessionToken: tokenHash(token) } });
  (await cookies()).delete(SESSION_COOKIE);
}
