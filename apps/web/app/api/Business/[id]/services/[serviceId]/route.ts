import { getService } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

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
