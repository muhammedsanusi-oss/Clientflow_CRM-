import { CreateBusiness, createBusiness, listBusinesses } from "@project/domain";
import {
  authenticatedUserId,
  parseRequestBody,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    return Response.json({ businesses: await listBusinesses(userId) });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  const parsed = await parseRequestBody(request, CreateBusiness);
  if ("response" in parsed) return parsed.response;
  try {
    const result = await createBusiness(userId, parsed.data);
    return Response.json({ business: result }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
