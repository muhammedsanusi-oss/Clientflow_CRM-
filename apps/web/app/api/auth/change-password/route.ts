/*
 * Code guide: apps/web/app/api/auth/change-password/route.ts
 * POST /api/auth/change-password: replace a single-use temporary password using a restricted activation
 * session, then set a regular session cookie.
 */
/*
 * Import connection: ../../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * replaceTemporaryPassword: Validates an unexpired restricted ticket, stores the new salted password hash,
 * consumes activation state, revokes prior sessions, and issues a regular session atomically. Defined in
 * packages/auth/src/credentials.ts.
 * sessionToken: Reads the raw opaque token from the HTTP-only session cookie for server-side session lookup
 * or revocation. Defined in packages/auth/src/current-user.ts.
 * startSession: Sets the session cookie with expiry, HTTP-only and SameSite protections; production cookies
 * also require HTTPS. Defined in packages/auth/src/current-user.ts.
 */
import { replaceTemporaryPassword, sessionToken, startSession } from "../../../../../../packages/auth/src/index";
/*
 * Import connection: ../../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * ChangePassword: Shared new-password and confirmation validator for the activation API. Defined in
 * packages/domain/src/provisioning.ts.
 */
import { ChangePassword } from "../../../../../../packages/domain/src/index";
/*
 * Import connection: ../helpers -> apps/web/app/api/auth/helpers.ts.
 * authError: Maps authentication/validation/rate-limit errors to safe JSON responses; rate limiting includes
 * Retry-After.
 * rejectCrossOrigin: Compares Origin with this application URL before accepting a credential/session write.
 */
import { authError, rejectCrossOrigin } from "../helpers";
// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";
/*
 * POST handler. POST /api/auth/change-password: replace a single-use temporary password using a restricted
 * activation session, then set a regular session cookie.
 */
export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  const token = await sessionToken();
  if (!token) return Response.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  let body: unknown; try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_JSON", message: "Body must be valid JSON" } }, { status: 400 }); }
  const parsed = ChangePassword.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 400 });
  try {
    const session = await replaceTemporaryPassword(token, parsed.data.password);
    await startSession(session);
    return Response.json({ redirectTo: "/owner" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authError(error); }
}
