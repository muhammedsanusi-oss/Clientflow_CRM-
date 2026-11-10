/*
 * Code guide: apps/web/app/api/auth/logout/route.ts
 * POST /api/auth/logout: same-origin session revocation and cookie clearing. This endpoint signs out the
 * current session; it does not remove a user or business.
 */
/*
 * Import connection: ../../../../../../packages/auth/src/index -> packages/auth/src/index.ts.
 * endSession: Revokes the matching persisted session and clears the browser cookie. This is the
 * implementation used by logout, not a user-data deletion operation. Defined in
 * packages/auth/src/current-user.ts.
 */
import { endSession } from "../../../../../../packages/auth/src/index";
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
 * POST handler. POST /api/auth/logout: same-origin session revocation and cookie clearing. This endpoint
 * signs out the current session; it does not remove a user or business.
 */
export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  try { await endSession(); return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return authError(error); }
}
