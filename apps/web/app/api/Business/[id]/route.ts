/*
 * Code guide: apps/web/app/api/Business/[id]/route.ts
 * GET /api/Business/[id]: business-scoped CRM JSON endpoint. The route derives session identity, validates
 * IDs/data through domain helpers, and returns safe JSON/not-found errors. GET reads records; this item
 * endpoint has no update/delete handler.
 */
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * getBusinessById: Reads one business through the supplied user active membership; it is also the API access
 * precheck. Defined in packages/domain/src/queries/business.ts.
 */
import { getBusinessById } from "@project/domain";
/*
 * Import connection: @/app/api/_lib/route-helpers -> apps/web/app/api/_lib/route-helpers.ts.
 * authenticatedUserId: API helper that delegates identity resolution to the persisted-session auth package.
 * notFoundResponse: Builds the shared 404 JSON envelope without revealing whether an unknown or foreign
 * record exists.
 * routeErrorResponse: Maps known Prisma conflicts/not-found failures and logs unexpected errors before
 * returning a safe generic API response.
 * unauthenticatedResponse: Builds the shared 401 JSON error envelope when a private API has no authenticated
 * user.
 */
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * GET handler. GET /api/Business/[id]: business-scoped CRM JSON endpoint. The route derives session identity,
 * validates IDs/data through domain helpers, and returns safe JSON/not-found errors. GET reads records; this
 * item endpoint has no update/delete handler.
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id } = await ctx.params;
    const business = await getBusinessById(id, userId);
    if (!business) return notFoundResponse();
    return Response.json({ business });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
