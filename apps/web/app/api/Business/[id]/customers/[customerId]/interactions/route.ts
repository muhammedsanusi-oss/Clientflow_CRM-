import { CreateInteraction, createInteraction, getCustomer, listInteractions } from "@project/domain";
import {
  authenticatedUserId,
  hasBusinessAccess,
  notFoundResponse,
  parseRequestBody,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; customerId: string }> };

export async function GET(_: Request, ctx: RouteContext) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, customerId } = await ctx.params;
    if (!(await hasBusinessAccess(businessId, userId))) return notFoundResponse();
    if (!(await getCustomer(customerId, businessId, userId))) return notFoundResponse();
    return Response.json({ interactions: await listInteractions(customerId, businessId, userId) });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  const parsed = await parseRequestBody(request, CreateInteraction);
  if ("response" in parsed) return parsed.response;
  try {
    const { id: businessId, customerId } = await ctx.params;
    if (!(await hasBusinessAccess(businessId, userId))) return notFoundResponse();
    const interaction = await createInteraction(customerId, businessId, userId, parsed.data);
    if (!interaction) return notFoundResponse();
    return Response.json({ interaction }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
