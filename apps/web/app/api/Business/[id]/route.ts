import { getBusinessById } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

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
