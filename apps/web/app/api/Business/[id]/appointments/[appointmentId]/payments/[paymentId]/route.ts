import { getPayment } from "@project/domain";
import {
  authenticatedUserId,
  notFoundResponse,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; appointmentId: string; paymentId: string }> }) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, appointmentId, paymentId } = await ctx.params;
    const payment = await getPayment(paymentId, appointmentId, businessId, userId);
    if (!payment) return notFoundResponse();
    return Response.json({ payment });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
