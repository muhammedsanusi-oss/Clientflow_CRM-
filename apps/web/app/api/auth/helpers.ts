/*
 * Code guide: apps/web/app/api/auth/helpers.ts
 * Same-origin credential-write protection and safe auth-error responses shared by login, logout, and
 * activation endpoints.
 */
/*
 * Import connection: ../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * AuthenticationError: Recognizable login/activation failure that the auth API maps to a safe HTTP response.
 * Defined in packages/auth/src/credentials.ts.
 */
import { AuthenticationError } from "../../../../../packages/auth/src/index";

/*
 * Compares Origin with this application URL before accepting a credential/session write.
 */
export function rejectCrossOrigin(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return Response.json({ error: { code: "FORBIDDEN", message: "Submit this request from the application." } }, { status: 403 });
  }
  return null;
}
/*
 * Maps authentication/validation/rate-limit errors to safe JSON responses; rate limiting includes
 * Retry-After.
 */
export function authError(error: unknown) {
  if (error instanceof AuthenticationError) {
    const status = error.code === "RATE_LIMITED" ? 429 : error.code === "VALIDATION" ? 400 : 401;
    return Response.json({ error: { code: error.code, message: error.message } }, {
      status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "900" } : {}) },
    });
  }
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not complete sign-in. Please try again." } }, { status: 500 });
}
