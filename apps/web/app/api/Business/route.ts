import { authenticatedUserId, parseRequestBody, unauthenticatedResponse } from "../_lib/route-helpers";
import { errorResponse } from "../error-response";
import { ProvisionBusiness, provisionBusiness, listBusinesses, requireDeveloper } from "@project/domain";

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
  try { await requireDeveloper(userId); } catch (error) { return errorResponse(error); }
  const origin = req.headers.get("origin");
  if (origin !== new URL(req.url).origin) return Response.json({ error: { code: "FORBIDDEN", message: "Submit this request from the application." } }, { status: 403 });
  const parsed = await parseRequestBody(req, ProvisionBusiness);
  if ("response" in parsed) return parsed.response;

  try {
    const business = await provisionBusiness(userId, parsed.data);
    return Response.json({ business }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
