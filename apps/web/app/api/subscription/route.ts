import { currentUserId } from "../../../../../packages/auth/src/index";
import { DemoSubscriptionAction, simulateSubscription } from "../../../../../packages/domain/src/demo-subscriptions";
import { apiError } from "../../../../../packages/domain/src/errors";
import { rejectCrossOrigin } from "../auth/helpers";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 4096) return Response.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request is too large" } }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); }
  catch { return Response.json({ error: { code: "BAD_JSON", message: "Body must be valid JSON" } }, { status: 400 }); }
  const parsed = DemoSubscriptionAction.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", message: "Select a valid demo action and plan" } }, { status: 400 });
  try {
    const subscription = await simulateSubscription(userId, parsed.data);
    return Response.json({ subscription }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const mapped = apiError(error);
    return Response.json({ error: { code: mapped.code, message: mapped.message } }, { status: mapped.status, headers: { "Cache-Control": "no-store" } });
  }
}
