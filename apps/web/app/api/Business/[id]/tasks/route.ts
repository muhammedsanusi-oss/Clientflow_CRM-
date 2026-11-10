/*
 * Code guide: apps/web/app/api/Business/[id]/tasks/route.ts
 * GET/POST /api/Business/[id]/tasks: business-scoped CRM JSON endpoint. The route derives session identity,
 * validates IDs/data through domain helpers, and returns safe JSON/not-found errors. GET reads records; POST
 * creates the validated resource.
 */
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * CreateTask: Zod contract for validating the resource request before its domain write. Defined in
 * packages/domain/src/schemas/task.ts.
 * createTask: Checks customer and employee business links before creating the follow-up task. Defined in
 * packages/domain/src/queries/tasks.ts.
 * listTasks: Reads the resource through the connected query module; the business/user predicates are
 * implemented there. Defined in packages/domain/src/queries/tasks.ts.
 */
import { CreateTask, createTask, listTasks } from "@project/domain";
/*
 * Import connection: @/app/api/_lib/route-helpers -> apps/web/app/api/_lib/route-helpers.ts.
 * authenticatedUserId: API helper that delegates identity resolution to the persisted-session auth package.
 * hasBusinessAccess: Verifies active membership through getBusinessById before business-scoped collection
 * operations.
 * notFoundResponse: Builds the shared 404 JSON envelope without revealing whether an unknown or foreign
 * record exists.
 * parseRequestBody: Parses JSON and applies the supplied shared schema. Returns either validated data or the
 * standard client-error response.
 * routeErrorResponse: Maps known Prisma conflicts/not-found failures and logs unexpected errors before
 * returning a safe generic API response.
 * unauthenticatedResponse: Builds the shared 401 JSON error envelope when a private API has no authenticated
 * user.
 */
import {
  authenticatedUserId,
  hasBusinessAccess,
  notFoundResponse,
  parseRequestBody,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * GET handler. GET/POST /api/Business/[id]/tasks: business-scoped CRM JSON endpoint. The route derives
 * session identity, validates IDs/data through domain helpers, and returns safe JSON/not-found errors. GET
 * reads records; POST creates the validated resource.
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId } = await ctx.params;
    if (!(await hasBusinessAccess(businessId, userId))) return notFoundResponse();
    return Response.json({ tasks: await listTasks(businessId, userId) });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

/*
 * POST handler. GET/POST /api/Business/[id]/tasks: business-scoped CRM JSON endpoint. The route derives
 * session identity, validates IDs/data through domain helpers, and returns safe JSON/not-found errors. GET
 * reads records; POST creates the validated resource.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  const parsed = await parseRequestBody(request, CreateTask);
  if ("response" in parsed) return parsed.response;
  try {
    const { id: businessId } = await ctx.params;
    if (!(await hasBusinessAccess(businessId, userId))) return notFoundResponse();
    const task = await createTask(businessId, userId, parsed.data);
    if (!task) return notFoundResponse();
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
