import { CreatePayment, createPayment, getAppointment, listPayments } from "@project/domain";
import {
  authenticatedUserId,
  hasBusinessAccess,
  notFoundResponse,
  parseRequestBody,
  routeErrorResponse,
  unauthenticatedResponse,
} from "@/app/api/_lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; appointmentId: string }> };

export async function GET(_: Request, ctx: RouteContext) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  try {
    const { id: businessId, appointmentId } = await ctx.params;
    if (!(await hasBusinessAccess(businessId, userId))) return notFoundResponse();
    if (!(await getAppointment(appointmentId, businessId, userId))) return notFoundResponse();
    return Response.json({ payments: await listPayments(appointmentId, businessId, userId) });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  const userId = await authenticatedUserId();
  if (!userId) return unauthenticatedResponse();
  const parsed = await parseRequestBody(request, CreatePayment);
  if ("response" in parsed) return parsed.response;
  try {
    const { id: businessId, appointmentId } = await ctx.params;
    if (!(await hasBusinessAccess(businessId, userId))) return notFoundResponse();
    const payment = await createPayment(appointmentId, businessId, userId, parsed.data);
    if (!payment) return notFoundResponse();
    return Response.json({ payment }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
