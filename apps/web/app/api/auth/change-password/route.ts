import { replaceTemporaryPassword, sessionToken, startSession } from "../../../../../../packages/auth/src/index";
import { ChangePassword } from "../../../../../../packages/domain/src/index";
import { authError, rejectCrossOrigin } from "../helpers";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  const token = await sessionToken();
  if (!token) return Response.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  let body: unknown; try { body = await req.json(); } catch { return Response.json({ error: { code: "BAD_JSON", message: "Body must be valid JSON" } }, { status: 400 }); }
  const parsed = ChangePassword.safeParse(body);
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 400 });
  try {
    const session = await replaceTemporaryPassword(token, parsed.data.password);
    await startSession(session);
    return Response.json({ redirectTo: "/customers" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authError(error); }
}
