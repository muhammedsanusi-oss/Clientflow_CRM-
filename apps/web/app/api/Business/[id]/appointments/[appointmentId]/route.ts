import { getAppointment } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; appointmentId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, appointmentId } = await ctx.params;
    const appointment = await getAppointment(appointmentId, businessId, userId);
    if (!appointment) return notFoundResponse();
    return Response.json({ appointment });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
