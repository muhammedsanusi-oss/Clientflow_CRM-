import { authenticatedUserId, parseRequestBody, unauthenticatedResponse } from "../_lib/route-helpers";
import { errorResponse } from "../error-response";
import { CreateBusiness, createBusiness, listBusinesses } from "@project/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();

  try {
    const businesses = await listBusinesses(userId);
    return Response.json({ businesses });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  const parsed = await parseRequestBody(req, CreateBusiness);
  if ("response" in parsed) return parsed.response;

  try {
    const business = await createBusiness(userId, parsed.data);
    return Response.json({ business }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
