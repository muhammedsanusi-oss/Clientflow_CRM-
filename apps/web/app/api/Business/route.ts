/*
 * Code guide: apps/web/app/api/Business/route.ts
 * Business collection JSON API. GET lists the current user active memberships. POST is developer-only
 * provisioning with same-origin validation and a no-store one-time credential handoff.
 */
/*
 * Import connection: ../_lib/route-helpers -> apps/web/app/api/_lib/route-helpers.ts.
 * authenticatedUserId: API helper that delegates identity resolution to the persisted-session auth package.
 * parseRequestBody: Parses JSON and applies the supplied shared schema. Returns either validated data or the
 * standard client-error response.
 * unauthenticatedResponse: Builds the shared 401 JSON error envelope when a private API has no authenticated
 * user.
 */
import { authenticatedUserId, parseRequestBody, unauthenticatedResponse } from "../_lib/route-helpers";
/*
 * Import connection: ../error-response -> apps/web/app/api/error-response.ts.
 * errorResponse: Wraps the mapped public code/message in the shared JSON error shape with its HTTP status.
 */
import { errorResponse } from "../error-response";
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * ProvisionBusiness: Shared business/owner/website validator used before transactional provisioning. Defined
 * in packages/domain/src/provisioning.ts.
 * provisionBusiness: Creates business, owner login, owner membership, website selection, and developer grants
 * in one transaction. Returns a generated temporary credential for the one-time handoff. Defined in
 * packages/domain/src/provisioning.ts.
 * listBusinesses: Reads the resource through the connected query module; the business/user predicates are
 * implemented there. Defined in packages/domain/src/queries/business.ts.
 * requireDeveloper: Checks the persisted developer role and completed password setup. Being a developer is
 * separate from holding a grant for a particular business. Defined in packages/domain/src/provisioning.ts.
 */
import { ProvisionBusiness, provisionBusiness, listBusinesses, requireDeveloper } from "@project/domain";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * GET handler. Business collection JSON API. GET lists the current user active memberships. POST is
 * developer-only provisioning with same-origin validation and a no-store one-time credential handoff.
 */
export async function GET() {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();

  try {
    const businesses = await listBusinesses(userId);
    return Response.json({ businesses });
  } catch (error) {
    return errorResponse(error);
  }
}

/*
 * POST handler. Business collection JSON API. GET lists the current user active memberships. POST is
 * developer-only provisioning with same-origin validation and a no-store one-time credential handoff.
 */
export async function POST(req: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try { await requireDeveloper(userId); } catch (error) { return errorResponse(error); }
  const origin = req.headers.get("origin");
  if (origin !== new URL(req.url).origin) return Response.json({ error: { code: "FORBIDDEN", message: "Submit this request from the application." } }, { status: 403 });
  const parsed = await parseRequestBody(req, ProvisionBusiness);
  if ("response" in parsed) return parsed.response;

  try {
    const business = await provisionBusiness(userId, parsed.data);
    return Response.json({ business }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
