import { CreateEmployee, createEmployee, listEmployees } from "@project/domain";
import {
  authenticatedUserId,
  parseRequestBody,
  unauthenticatedResponse,
} from "../../../_lib/route-helpers";
import { errorResponse } from "../../../error-response";

export const dynamic = "force-dynamic";

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
