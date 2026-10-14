import { getTask } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; taskId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, taskId } = await ctx.params;
    const task = await getTask(taskId, businessId, userId);
    if (!task) return notFoundResponse();
    return Response.json({ task });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
