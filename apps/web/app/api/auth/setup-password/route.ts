import { completeOwnerSetup, startSession } from "../../../../../../packages/auth/src/index";
import { ChangePassword } from "../../../../../../packages/domain/src/index";
import { authError, rejectCrossOrigin } from "../helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request); if (rejected) return rejected;
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: { code: "BAD_JSON", message: "Body must be valid JSON." } }, { status: 400 }); }
  const value = body as Record<string, unknown> | null;
  const password = ChangePassword.safeParse(value);
  if (!password.success || typeof value?.token !== "string") {
    return Response.json({ error: { code: "VALIDATION", message: password.success ? "A setup link is required." : password.error.issues[0].message } }, { status: 400 });
  }
  try {
    const session = await completeOwnerSetup(value.token, password.data.password);
    await startSession(session);
    return Response.json({ redirectTo: "/owner" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authError(error); }
}
