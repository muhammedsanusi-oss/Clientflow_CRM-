import { getLocationById } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; locationId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, locationId } = await ctx.params;
    const location = await getLocationById(locationId, businessId, userId);
    if (!location) return notFoundResponse();
    return Response.json({ location });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
