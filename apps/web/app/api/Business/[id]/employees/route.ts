import { CreateEmployee, createEmployee, listEmployees } from "@project/domain";
import {
  authenticatedUserId,
  hasBusinessAccess,
  notFoundResponse,
  parseRequestBody,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId } = await ctx.params;
    if (!(await hasBusinessAccess(businessId, userId))) return notFoundResponse();
    return Response.json({ employees: await listEmployees(businessId, userId) });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  const parsed = await parseRequestBody(request, CreateEmployee);
  if ("response" in parsed) return parsed.response;
  try {
    const { id: businessId } = await ctx.params;
    if (!(await hasBusinessAccess(businessId, userId))) return notFoundResponse();
    const employee = await createEmployee(businessId, userId, parsed.data);
    if (!employee) return notFoundResponse();
    return Response.json({ employee }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
