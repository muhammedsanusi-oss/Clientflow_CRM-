/*
 * Code guide: apps/web/app/api/Business/[id]/employees/route.ts
 * GET/POST /api/Business/[id]/employees: business-scoped CRM JSON endpoint. The route derives session
 * identity, validates IDs/data through domain helpers, and returns safe JSON/not-found errors. GET reads
 * records; POST creates the validated resource.
 */
/*
 * Import connection: @project/domain -> packages/domain/src/index.ts.
 * CreateEmployee: Zod contract for validating the resource request before its domain write. Defined in
 * packages/domain/src/schemas/employee.ts.
 * createEmployee: Checks owner/manager authority, creates or reuses a legacy username account for the staff
 * email, and inserts its business membership. It does not issue a login password. Defined in
 * packages/domain/src/queries/employee.ts.
 * listEmployees: Reads the resource through the connected query module; the business/user predicates are
 * implemented there. Defined in packages/domain/src/queries/employee.ts.
 */
import { CreateEmployee, createEmployee, listEmployees } from "@project/domain";
/*
 * Import connection: ../../../_lib/route-helpers -> apps/web/app/api/_lib/route-helpers.ts.
 * authenticatedUserId: API helper that delegates identity resolution to the persisted-session auth package.
 * parseRequestBody: Parses JSON and applies the supplied shared schema. Returns either validated data or the
 * standard client-error response.
 * unauthenticatedResponse: Builds the shared 401 JSON error envelope when a private API has no authenticated
 * user.
 */
import {
  authenticatedUserId,
  parseRequestBody,
  unauthenticatedResponse,
} from "../../../_lib/route-helpers";
/*
 * Import connection: ../../../error-response -> apps/web/app/api/error-response.ts.
 * errorResponse: Wraps the mapped public code/message in the shared JSON error shape with its HTTP status.
 */
import { errorResponse } from "../../../error-response";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * GET handler. GET/POST /api/Business/[id]/employees: business-scoped CRM JSON endpoint. The route derives
 * session identity, validates IDs/data through domain helpers, and returns safe JSON/not-found errors. GET
 * reads records; POST creates the validated resource.
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId } = await ctx.params;
    return Response.json({ employees: await listEmployees(businessId, userId) });
  } catch (error) {
    return errorResponse(error);
  }
}

/*
 * POST handler. GET/POST /api/Business/[id]/employees: business-scoped CRM JSON endpoint. The route derives
 * session identity, validates IDs/data through domain helpers, and returns safe JSON/not-found errors. GET
 * reads records; POST creates the validated resource.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  const parsed = await parseRequestBody(request, CreateEmployee);
  if ("response" in parsed) return parsed.response;
  try {
    const { id: businessId } = await ctx.params;
    const employee = await createEmployee(businessId, userId, parsed.data);
    return Response.json({ employee }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
