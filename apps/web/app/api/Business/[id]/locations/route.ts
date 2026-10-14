import { authenticatedUserId, parseRequestBody, unauthenticatedResponse } from "../../../_lib/route-helpers";
import { errorResponse } from "../../../error-response";
import { CreateLocation, createLocation, listLocations } from "@project/domain";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();

  const { id: businessId } = await ctx.params;
  try {
    const locations = await listLocations(businessId, userId);
    return Response.json({ locations });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();

  const { id: businessId } = await ctx.params;
  const parsed = await parseRequestBody(req, CreateLocation);
  if ("response" in parsed) return parsed.response;

  try {
    const location = await createLocation(businessId, userId, parsed.data);
    return Response.json({ location }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}