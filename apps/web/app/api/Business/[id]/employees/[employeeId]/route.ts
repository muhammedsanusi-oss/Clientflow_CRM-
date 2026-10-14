import { getEmployee } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; employeeId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, employeeId } = await ctx.params;
    const employee = await getEmployee(employeeId, businessId, userId);
    if (!employee) return notFoundResponse();
    return Response.json({ employee });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
