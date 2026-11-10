/*
 * Code guide: apps/web/app/api/Business/[id]/services/[serviceId]/route.ts
 * GET /api/Business/[id]/services/[serviceId]: business-scoped CRM JSON endpoint. The route derives session
 * identity, validates IDs/data through domain helpers, and returns safe JSON/not-found errors. GET reads
 * records; this item endpoint has no update/delete handler.
 */
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * getService: Reads the resource through the connected query module; the business/user predicates are
 * implemented there. Defined in packages/domain/src/queries/services.ts.
 */
import { getService } from "@project/domain";
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
 * GET handler. GET /api/Business/[id]/services/[serviceId]: business-scoped CRM JSON endpoint. The route
 * derives session identity, validates IDs/data through domain helpers, and returns safe JSON/not-found
 * errors. GET reads records; this item endpoint has no update/delete handler.
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string; serviceId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, serviceId } = await ctx.params;
    const service = await getService(serviceId, businessId, userId);
    if (!service) return notFoundResponse();
    return Response.json({ service });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
