/*
 * Code guide: apps/web/app/api/auth/login/route.ts
 * POST /api/auth/login: validate email/password/account choice, prepare only the fixed development fixture
 * when applicable, authenticate, and set a database-session cookie.
 */
/*
 * Import connection: ../../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * authenticate: Checks persisted login throttling, verifies the password and selected account role, claims
 * valid activation credentials when needed, and creates an opaque database session. Defined in
 * packages/auth/src/credentials.ts.
 * startSession: Sets the session cookie with expiry, HTTP-only and SameSite protections; production cookies
 * also require HTTPS. Defined in packages/auth/src/current-user.ts.
 */
import { authenticate, startSession } from "../../../../../../packages/auth/src/index";
/*
 * Import connection: ../../../../../../packages/domain/src/index -> packages/domain/src/index.ts.
 * PasswordLogin: Shared email/password/account-choice validator used by the login API. Defined in
 * packages/domain/src/provisioning.ts.
 * ensureLocalTestAccounts: Development-only, idempotent creation of the fixed developer/owner fixtures and
 * Sample business. Existing passwords and existing business details are not reset. Defined in
 * packages/domain/src/local-test-accounts.ts.
 */
import { PasswordLogin, ensureLocalTestAccounts } from "../../../../../../packages/domain/src/index";
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
 * POST handler. POST /api/auth/login: validate email/password/account choice, prepare only the fixed
 * development fixture when applicable, authenticate, and set a database-session cookie.
 */
export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  let body: unknown; try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_JSON", message: "Body must be valid JSON" } }, { status: 400 }); }
  const parsed = PasswordLogin.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", message: "Enter a valid email and password." } }, { status: 400 });
  try {
    await ensureLocalTestAccounts(parsed.data.email);
    const result = await authenticate(parsed.data.email, parsed.data.password, parsed.data.accountType);
    await startSession(result);
    return Response.json({ redirectTo: result.redirectTo }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authError(error); }
}
