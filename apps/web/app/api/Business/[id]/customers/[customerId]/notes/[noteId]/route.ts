import { getNote } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; customerId: string; noteId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, customerId, noteId } = await ctx.params;
    const note = await getNote(noteId, customerId, businessId, userId);
    if (!note) return notFoundResponse();
    return Response.json({ note });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
