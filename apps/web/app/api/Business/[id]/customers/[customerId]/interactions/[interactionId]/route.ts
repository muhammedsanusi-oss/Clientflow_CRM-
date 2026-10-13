import { getInteraction } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; customerId: string; interactionId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, customerId, interactionId } = await ctx.params;
    const interaction = await getInteraction(interactionId, customerId, businessId, userId);
    if (!interaction) return notFoundResponse();
    return Response.json({ interaction });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
