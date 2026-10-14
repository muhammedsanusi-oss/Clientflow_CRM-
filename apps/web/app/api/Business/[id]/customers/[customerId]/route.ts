import { getCustomer } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; customerId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, customerId } = await ctx.params;
    const customer = await getCustomer(customerId, businessId, userId);
    if (!customer) return notFoundResponse();
    return Response.json({ customer });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
