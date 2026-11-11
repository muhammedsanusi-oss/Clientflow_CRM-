import { currentUserId } from "@project/auth";
import {
  apiError,
  DeveloperNotificationRead,
  markAllDeveloperNotificationsRead,
  markDeveloperNotificationRead,
} from "@project/domain";

export const dynamic = "force-dynamic";
const failure = (code: string, message: string, status: number) => Response.json(
  { error: { code, message } },
  { status, headers: { "Cache-Control": "no-store" } },
);

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return failure("UNAUTHENTICATED", "Sign in first.", 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return failure("FORBIDDEN", "Submit this request from the Clientflow dashboard.", 403);
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return failure("BAD_JSON", "Body must be valid JSON.", 400); }
  const parsed = DeveloperNotificationRead.safeParse(body);
  if (!parsed.success) return failure("VALIDATION", "Choose a notification to mark as read.", 400);
  try {
    if ("all" in parsed.data) await markAllDeveloperNotificationsRead(userId);
    else await markDeveloperNotificationRead(userId, parsed.data.notificationId);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const mapped = apiError(error);
    return failure(mapped.code, mapped.message, mapped.status);
  }
}
